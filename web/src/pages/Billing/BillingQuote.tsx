import { useCallback, useMemo, useState, type ReactNode } from "react";
import { FileText, Sparkles, TriangleAlert } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@moduleleague/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import type { DispatchShipment } from "../Dispatch/dispatchBoard.utils";
import { attempt } from "@/lib/toastHelper";
import { hasContent } from "@/lib/nodeHelper";
import { BillingAuditPanel } from "./BillingAuditPanel";
import { money, rateCardText, totalsOf } from "./billing.utils";
import type { BillingData } from "./useBillingData";

/** A line the AI audit suggested and the clerk added, with what the API prices it from. */
type ExtraLine = { line: IBillingLine; request: IInvoiceExtraLine };

/**
 * A ready shipment as an invoice draft: who's billed, what freight was priced from, and each charge with its basis.
 * Freight always stays; the other lines can be left off, and the AI check can add lines the quote didn't suggest.
 * Nothing is saved until Create invoice.
 */
export function BillingQuote({
  quote,
  shipment,
  data,
  onCreated,
  onOpenSettings,
}: {
  quote: IBillingQuote;
  shipment?: DispatchShipment;
  data: BillingData;
  onCreated: (invoice: IInvoice) => void;
  onOpenSettings: () => void;
}) {
  const { overview, isSaving, isPreviewing, onCreate, onPreview, onAudit } =
    data;
  const symbol = overview?.currencySymbol;
  const [picked, setPicked] = useState(
    () => new Set(quote.lines?.map((line) => line.key) ?? []),
  );
  const [extras, setExtras] = useState<ExtraLine[]>([]);
  const [partyId, setPartyId] = useState(quote.billToId);
  const lines = useMemo(
    () => [
      ...(quote.lines?.filter(
        (line) => line.required || picked.has(line.key),
      ) ?? []),
      ...extras
        .filter((extra) => picked.has(extra.line.key))
        .map((extra) => extra.line),
    ],
    [quote.lines, extras, picked],
  );
  const shown = useMemo(
    () => [...(quote.lines ?? []), ...extras.map((extra) => extra.line)],
    [quote.lines, extras],
  );
  const totals = useMemo(() => totalsOf(lines), [lines]);
  const body = useMemo<IInvoiceCreate>(
    () => ({
      shipmentId: quote.shipmentId,
      partyId,
      lineKeys: lines
        .filter((line) => !line.required && !line.key.startsWith("extra:"))
        .map((line) => line.key),
      extraLines: extras
        .filter((extra) => picked.has(extra.line.key))
        .map((extra) => extra.request),
    }),
    [quote.shipmentId, partyId, lines, extras, picked],
  );
  const toggle = useCallback(
    (key: string) =>
      setPicked((current) => {
        const next = new Set(current);
        if (!next.delete(key)) next.add(key);
        return next;
      }),
    [],
  );
  // Each check is a paid call, so the result stays until "Check again"
  const {
    mutateAsync: audit,
    data: auditResult,
    isPending: isAuditing,
  } = useMutation({
    mutationFn: () => onAudit({ shipmentId: quote.shipmentId }),
  });
  const runAudit = useCallback(
    () => attempt("Couldn't check the charges", () => audit()),
    [audit],
  );
  const addFinding = useCallback((finding: IBillingAuditFinding) => {
    const { line, extraLine } = finding;
    if (!line || !extraLine) return;
    setExtras((current) =>
      current.some((extra) => extra.line.key === line.key)
        ? current
        : [...current, { line, request: extraLine }],
    );
    setPicked((current) => new Set(current).add(line.key));
  }, []);
  const dropLine = useCallback(
    (key: string) =>
      setPicked((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      }),
    [],
  );
  const addedKeys = useMemo(
    () => new Set(extras.map((extra) => extra.line.key)),
    [extras],
  );
  const badges = useMemo(
    () =>
      Object.fromEntries(
        extras.map((extra) => [extra.line.key, "From AI check"]),
      ),
    [extras],
  );
  const create = useCallback(
    () =>
      attempt("Couldn't create the invoice", async () => {
        const invoice = await onCreate(body);
        toast.success(`${invoice.invoiceNo} saved as a draft`, {
          description: "Check it, then send it.",
        });
        onCreated(invoice);
      }),
    [onCreate, body, onCreated],
  );
  const blocked = quote.problems?.length > 0;

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-background p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Invoice draft</span>
          <h2 className="text-lg font-semibold">
            {shipment?.title ?? "Unknown shipment"}
          </h2>
          {!blocked && (
            <Button
              size="xs"
              variant="outline"
              className="w-fit"
              startIcon={
                isAuditing ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <Sparkles size={13} />
                )
              }
              disabled={isAuditing}
              title="The AI reads the proof of delivery and checks the charges against the exceptions and checkpoints"
              onClick={() => void runAudit()}
            >
              {isAuditing
                ? "Checking…"
                : auditResult
                  ? "Check again"
                  : "Check with AI"}
            </Button>
          )}
        </div>
        <div className="flex min-w-56 flex-col items-end gap-1 text-right">
          <span className="text-xs text-muted-foreground">Bill to</span>
          <Select value={partyId ?? ""} onValueChange={setPartyId}>
            <SelectTrigger className="h-8 w-64" aria-label="Bill to">
              <SelectValue placeholder="Pick who pays" />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {overview?.parties?.map((party) => (
                <SelectItem key={party.id} value={party.id}>
                  {party.name}
                  {party.id === quote.billToId && " · Bill To"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {quote.payerHint != null && quote.payerHint !== ""
              ? `Suggested: ${quote.payerHint}`
              : "Pick the Incoterm field for a suggestion"}
            {(quote.billToId == null || quote.billToId === "") &&
              " · the shipment has no Bill To"}
          </span>
        </div>
      </header>

      {blocked ? (
        <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          <span className="flex items-center gap-2 font-medium">
            <TriangleAlert className="size-4" />
            It can't be priced yet
          </span>
          <ul className="list-disc pl-6">
            {quote.problems?.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={onOpenSettings}
          >
            Open rates & settings
          </Button>
        </div>
      ) : (
        <>
          <RateBar
            card={quote.rateCard}
            weight={quote.weight}
            symbol={symbol}
          />
          {auditResult && (
            <BillingAuditPanel
              audit={auditResult}
              symbol={symbol}
              added={addedKeys}
              onAdd={addFinding}
              onDrop={dropLine}
            />
          )}
          <BillingLines
            lines={shown}
            symbol={symbol}
            picked={picked}
            onToggle={toggle}
            badges={badges}
          />
          <BillingTotals
            subtotal={totals.subtotal}
            tax={totals.tax}
            total={totals.total}
            taxPercent={overview?.taxPercent}
            symbol={symbol}
          >
            <Button
              variant="outline"
              startIcon={<FileText size={14} />}
              isLoading={isPreviewing}
              disabled={partyId == null || partyId === ""}
              onClick={() =>
                void attempt("Couldn't preview the invoice", () =>
                  onPreview(body),
                )
              }
            >
              Preview PDF
            </Button>
            <Button
              isLoading={isSaving}
              disabled={partyId == null || partyId === ""}
              onClick={() => void create()}
            >
              Create invoice
            </Button>
          </BillingTotals>
        </>
      )}
    </section>
  );
}

/** What freight was priced from: the rate card's mode and zones, its rate and minimum, and the chargeable weight. */
export function RateBar({
  card,
  weight,
  symbol,
}: {
  card?: IBillingRateCard;
  weight?: number;
  symbol?: string;
}) {
  if (!card) return null;
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <span>
        Rate card:{" "}
        <span className="font-medium text-foreground">
          {rateCardText(card)}
        </span>
      </span>
      <span>
        Rate:{" "}
        <span className="font-medium text-foreground">
          {money(card.ratePerKg, symbol)} per kg
          {card.minCharge > 0 && `, min ${money(card.minCharge, symbol)}`}
        </span>
      </span>
      {weight != null && (
        <span>
          Chargeable weight:{" "}
          <span className="font-medium text-foreground">{weight} kg</span>
        </span>
      )}
    </div>
  );
}

/**
 * The charges with their basis; with picked, each optional line can be ticked off and freight stays ticked. badges labels lines
 * by key, e.g. the ones the AI check added.
 */
export function BillingLines({
  lines,
  symbol,
  picked,
  onToggle,
  badges,
}: {
  lines: IBillingLine[];
  symbol?: string;
  picked?: Set<string>;
  onToggle?: (key: string) => void;
  badges?: Record<string, string>;
}) {
  const pickable = !!picked;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead className="border-b text-xs text-muted-foreground">
          <tr>
            {pickable && (
              <th className="w-10 py-2 pl-2">
                <span className="sr-only">On the invoice</span>
              </th>
            )}
            <th className="py-2 font-medium">Charge</th>
            <th className="py-2 font-medium">Basis</th>
            <th className="py-2 pr-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const on = !pickable || line.required || !!picked.has(line.key);
            return (
              <tr
                key={line.key}
                className={cn(
                  "border-b last:border-b-0",
                  !on && "text-muted-foreground",
                )}
              >
                {pickable && (
                  <td className="py-2.5 pl-2">
                    <Checkbox
                      checked={on}
                      disabled={line.required}
                      aria-label={`Bill ${line.description}`}
                      onCheckedChange={() => onToggle?.(line.key)}
                    />
                  </td>
                )}
                <td className="py-2.5 font-medium">
                  {line.description}
                  {(badges?.[line.key] != null ||
                    (line.sourceExceptionNo != null &&
                      line.sourceExceptionNo !== "")) && (
                    <span className="ml-2 rounded border border-blue-200 bg-blue-50 px-1 text-[11px] font-normal text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                      {badges?.[line.key] ?? "Suggested"}
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-xs text-muted-foreground">
                  {line.basis}
                </td>
                <td
                  className={cn(
                    "py-2.5 pr-2 text-right tabular-nums",
                    !on && "line-through",
                  )}
                >
                  {money(line.amount, symbol)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Subtotal, tax and total, right-aligned, with the actions under them. */
export function BillingTotals({
  subtotal,
  tax,
  total,
  taxPercent,
  symbol,
  children,
}: {
  subtotal: number;
  tax: number;
  total: number;
  taxPercent?: number;
  symbol?: string;
  children?: ReactNode;
}) {
  return (
    <div className="ml-auto flex w-full max-w-sm flex-col gap-1.5 text-sm">
      <span className="flex justify-between text-muted-foreground">
        Subtotal <span className="tabular-nums">{money(subtotal, symbol)}</span>
      </span>
      <span className="flex justify-between text-muted-foreground">
        Tax ({taxPercent ?? 0}%, from settings)
        <span className="tabular-nums">{money(tax, symbol)}</span>
      </span>
      <span className="flex justify-between border-t pt-2 text-lg font-semibold">
        Total <span className="tabular-nums">{money(total, symbol)}</span>
      </span>
      {hasContent(children) && (
        <span className="mt-2 flex flex-wrap justify-end gap-2">
          {children}
        </span>
      )}
    </div>
  );
}
