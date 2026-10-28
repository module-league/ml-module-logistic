import { useCallback, useState } from "react";
import { Ban, Download, FileText, Send, Wallet } from "lucide-react";
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  toast,
} from "@moduleleague/ui";
import { invoicePdfUrl } from "@/services/billing/billing.api";
import { attempt } from "@/lib/toastHelper";
import type { DispatchShipment } from "../Dispatch/dispatchBoard.utils";
import { CHIP_CLASS } from "../Exception/ExceptionList";
import { labelOf, stamp } from "../Exception/exception.utils";
import { BillingLines, BillingTotals, RateBar } from "./BillingQuote";
import { day, INVOICE_STATUS_CLASS, INVOICE_STATUSES } from "./billing.utils";
import type { BillingData } from "./useBillingData";
import { nonEmpty } from "@/lib/stringHelper";

type Action = "pay" | "void";

/** A saved invoice, read-only: who's billed, its lines and dates, and what can happen next for its status. */
export function BillingInvoice({
  invoice,
  shipment,
  data,
  onChanged,
}: {
  invoice: IInvoice;
  shipment?: DispatchShipment;
  data: BillingData;
  onChanged: (invoice: IInvoice) => void;
}) {
  const { overview, isSaving, onSend } = data;
  const symbol = overview?.currencySymbol;
  const [action, setAction] = useState<Action>();
  const open = invoice.status === "sent" || invoice.status === "overdue";
  const send = useCallback(
    () =>
      attempt("Couldn't send the invoice", async () => {
        const sent = await onSend(invoice);
        toast.success(`${sent.invoiceNo} sent`, {
          description: `Due ${day(sent.dueDate)}. The dispatch is marked billed.`,
        });
        onChanged(sent);
      }),
    [onSend, invoice, onChanged],
  );
  const dates = [
    `Created ${stamp(invoice.createdAt)}`,
    invoice.sentAt != null &&
      invoice.sentAt !== "" &&
      `sent ${stamp(invoice.sentAt)}`,
    invoice.dueDate != null &&
      invoice.dueDate !== "" &&
      `due ${day(invoice.dueDate)}`,
    invoice.paidAt != null &&
      invoice.paidAt !== "" &&
      `paid ${stamp(invoice.paidAt)}`,
    invoice.voidedAt != null &&
      invoice.voidedAt !== "" &&
      `voided ${stamp(invoice.voidedAt)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-background p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {invoice.invoiceNo}
            <span
              className={cn(CHIP_CLASS, INVOICE_STATUS_CLASS[invoice.status])}
            >
              {labelOf(INVOICE_STATUSES, invoice.status)}
            </span>
          </span>
          <h2 className="text-lg font-semibold">
            {shipment?.title ?? "Unknown shipment"}
          </h2>
          <span className="text-xs text-muted-foreground">{dates}</span>
        </div>
        <div className="flex flex-col items-end text-right text-xs text-muted-foreground">
          <span>Bill to</span>
          <span className="text-sm font-semibold text-foreground">
            {invoice.partyName}
          </span>
          {invoice.partyAddress != null && invoice.partyAddress !== "" && (
            <span>{invoice.partyAddress}</span>
          )}
          <span>
            {[invoice.partyEmail, `${invoice.creditTermsDays} days credit`]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      </header>
      {invoice.voidReason != null && invoice.voidReason !== "" && (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          Voided: {invoice.voidReason}
        </p>
      )}
      <RateBar
        card={invoice.pricing.rateCard}
        weight={invoice.pricing.weight}
        symbol={symbol}
      />
      <BillingLines lines={invoice.lines} symbol={symbol} />
      <BillingTotals
        subtotal={invoice.subtotal}
        tax={invoice.taxAmount}
        total={invoice.total}
        taxPercent={overview?.taxPercent}
        symbol={symbol}
      >
        <Button
          variant="outline"
          startIcon={<FileText size={14} />}
          onClick={() =>
            window.open(invoicePdfUrl(invoice.objId), "_blank", "noopener")
          }
        >
          Open PDF
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Download ${invoice.invoiceNo}`}
          onClick={() =>
            window.location.assign(invoicePdfUrl(invoice.objId, true))
          }
        >
          <Download className="size-4" />
        </Button>
        {(invoice.status === "draft" || open) && (
          <Button
            variant="outline"
            startIcon={<Ban size={14} />}
            disabled={isSaving}
            onClick={() => setAction("void")}
          >
            Void
          </Button>
        )}
        {invoice.status === "draft" && (
          <Button
            startIcon={<Send size={14} />}
            isLoading={isSaving}
            onClick={() => void send()}
          >
            Send invoice
          </Button>
        )}
        {open && (
          <Button
            startIcon={<Wallet size={14} />}
            disabled={isSaving}
            onClick={() => setAction("pay")}
          >
            Mark paid
          </Button>
        )}
      </BillingTotals>
      {action !== undefined && (
        <InvoiceActionDialog
          key={action}
          action={action}
          invoice={invoice}
          data={data}
          onClose={() => setAction(undefined)}
          onChanged={onChanged}
        />
      )}
    </section>
  );
}

/** Asks for the payment method and reference, or the reason it's voided. */
function InvoiceActionDialog({
  action,
  invoice,
  data,
  onClose,
  onChanged,
}: {
  action: Action;
  invoice: IInvoice;
  data: BillingData;
  onClose: () => void;
  onChanged: (invoice: IInvoice) => void;
}) {
  const { onPay, onVoid, isSaving, overview } = data;
  const [text, setText] = useState(action === "pay" ? "Bank transfer" : "");
  const [reference, setReference] = useState("");
  const paying = action === "pay";
  const confirm = useCallback(async () => {
    const done = await attempt(
      paying ? "Couldn't record the payment" : "Couldn't void the invoice",
      async () => {
        const changed = paying
          ? await onPay(invoice, text.trim(), nonEmpty(reference.trim()))
          : await onVoid(invoice, text.trim());
        toast.success(
          paying
            ? `${changed.invoiceNo} paid`
            : `${changed.invoiceNo} voided; the shipment is ready to bill again`,
        );
        onChanged(changed);
      },
    );
    if (done) onClose();
  }, [paying, onPay, onVoid, invoice, text, reference, onChanged, onClose]);

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {paying
              ? `Mark ${invoice.invoiceNo} paid`
              : `Void ${invoice.invoiceNo}`}
          </DialogTitle>
          <DialogDescription>
            {paying
              ? `Records a payment of ${overview?.currencySymbol ?? ""} ${invoice.total.toFixed(2)} in full.`
              : "Its number stays used. The shipment goes back to Ready to bill."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Input
            autoFocus
            aria-label={paying ? "Payment method" : "Reason"}
            placeholder={
              paying ? "Payment method" : "Why, e.g. wrong bill-to company"
            }
            value={text}
            maxLength={paying ? 50 : 500}
            onChange={(event) => setText(event.target.value)}
          />
          {paying && (
            <Input
              aria-label="Reference"
              placeholder="Reference, e.g. bank transaction ID"
              value={reference}
              maxLength={100}
              onChange={(event) => setReference(event.target.value)}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={paying ? "default" : "destructive"}
            disabled={text.trim() === ""}
            isLoading={isSaving}
            onClick={() => void confirm()}
          >
            {paying ? "Mark paid" : "Void invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
