import { useNavigate } from "react-router-dom";
import { cn } from "@moduleleague/ui";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import type { DispatchShipment } from "../Dispatch/dispatchBoard.utils";
import { CHIP_CLASS } from "../Exception/ExceptionList";
import { labelOf, routeText } from "../Exception/exception.utils";
import {
  day,
  INVOICE_STATUS_CLASS,
  INVOICE_STATUSES,
  money,
  type BillingTab,
} from "./billing.utils";

const ITEM_CLASS =
  "flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** The shipments ready to bill and those held back, or the invoices of a tab; one is selected and shown beside it. */
export function BillingList({
  tab,
  overview,
  invoices,
  shipments,
  selectedId,
  onSelect,
}: {
  tab: BillingTab;
  overview?: IBillingOverview;
  invoices: IInvoice[];
  shipments: Map<string, DispatchShipment>;
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const navigate = useNavigate();
  const symbol = overview?.currencySymbol;
  const title = (shipmentId: string) =>
    shipments.get(shipmentId)?.title ?? "Unknown shipment";

  if (tab !== "ready") {
    return (
      <section className="flex flex-col gap-2 rounded-xl border bg-background p-2">
        {invoices.length ? (
          invoices.map((invoice) => (
            <button
              key={invoice.objId}
              type="button"
              aria-current={invoice.objId === selectedId || undefined}
              onClick={() => onSelect(invoice.objId)}
              className={cn(
                ITEM_CLASS,
                invoice.objId === selectedId &&
                  "border-primary bg-primary-10 hover:bg-primary-10",
              )}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">
                  {invoice.invoiceNo}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {money(invoice.total, symbol)}
                </span>
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {title(invoice.shipmentId)} · {invoice.partyName}
              </span>
              <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {invoice.status === "paid"
                    ? `Paid ${day(invoice.paidAt)}`
                    : invoice.dueDate
                      ? `Due ${day(invoice.dueDate)}`
                      : `Created ${day(invoice.createdAt)}`}
                </span>
                <span
                  className={cn(
                    CHIP_CLASS,
                    INVOICE_STATUS_CLASS[invoice.status],
                  )}
                >
                  {labelOf(INVOICE_STATUSES, invoice.status)}
                </span>
              </span>
            </button>
          ))
        ) : (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No invoices here.
          </p>
        )}
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2 rounded-xl border bg-background p-3">
        <h2 className="text-sm font-semibold">Ready to bill</h2>
        {overview?.ready?.length ? (
          overview.ready.map((quote) => {
            const blocked = quote.problems.length > 0;
            return (
              <button
                key={quote.shipmentId}
                type="button"
                aria-current={quote.shipmentId === selectedId || undefined}
                onClick={() => onSelect(quote.shipmentId)}
                className={cn(
                  ITEM_CLASS,
                  quote.shipmentId === selectedId &&
                    "border-primary bg-primary-10 hover:bg-primary-10",
                )}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">
                    {title(quote.shipmentId)}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {blocked ? "—" : money(quote.total, symbol)}
                  </span>
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {routeText(shipments.get(quote.shipmentId))}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {quote.mode && (
                    <span className="rounded bg-foreground px-1.5 text-[11px] font-medium text-background">
                      {quote.mode}
                    </span>
                  )}
                  <span className="truncate">
                    {[
                      quote.weight != null && `${quote.weight} kg`,
                      quote.deliveredAt &&
                        `Delivered ${day(quote.deliveredAt)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span
                    className={cn(
                      CHIP_CLASS,
                      "ml-auto",
                      blocked ? TONE_CLASS.red : TONE_CLASS.amber,
                    )}
                  >
                    {blocked ? "Can't price" : "Unbilled"}
                  </span>
                </span>
              </button>
            );
          })
        ) : (
          <p className="py-3 text-center text-sm text-muted-foreground">
            Nothing ready yet.
          </p>
        )}
      </section>
      {!!overview?.waiting?.length && (
        <section className="flex flex-col gap-2 rounded-xl border bg-background p-3">
          <h2 className="text-sm font-semibold">Held back</h2>
          {overview.waiting.map((entry) => (
            <div
              key={entry.shipmentId}
              className="flex flex-col gap-1 rounded-lg border border-dashed p-3"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {title(entry.shipmentId)}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  Delivered {day(entry.deliveredAt)}
                </span>
              </span>
              {entry.reasons.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() =>
                    navigate(
                      reason.startsWith("Weight")
                        ? "/exeptions"
                        : `/documents?shipment=${entry.shipmentId}`,
                    )
                  }
                  className="w-fit cursor-pointer text-left text-xs text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                >
                  {reason}
                </button>
              ))}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
