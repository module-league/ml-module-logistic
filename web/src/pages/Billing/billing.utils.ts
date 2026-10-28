import { format } from "date-fns";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";

export type BillingTab = "ready" | "draft" | "sent" | "paid" | "void";

export const BILLING_TABS: { value: BillingTab; label: string }[] = [
  { value: "ready", label: "Ready to bill" },
  { value: "draft", label: "Drafts" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

export const INVOICE_STATUSES: { value: IInvoiceStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

export const INVOICE_STATUS_CLASS: Record<IInvoiceStatus, string> = {
  draft: TONE_CLASS.amber,
  sent: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  overdue: TONE_CLASS.red,
  paid: TONE_CLASS.green,
  void: "border-border bg-muted text-muted-foreground",
};

/** The tab an invoice is listed under; overdue ones stay with the sent ones. */
export const tabOf = (status: IInvoiceStatus): BillingTab =>
  status === "overdue" ? "sent" : status;

/** "RM 1,255.63". */
export const money = (amount = 0, symbol = "RM") =>
  `${symbol} ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/** Subtotal, tax and total of the picked lines, as the API works them out: tax is rounded once, on the sum. */
export function totalsOf(lines: IBillingLine[]) {
  const subtotal = round(lines.reduce((sum, line) => sum + line.amount, 0));
  const tax = round(
    lines.reduce((sum, line) => sum + (line.amount * line.taxRate) / 100, 0),
  );
  return { subtotal, tax, total: round(subtotal + tax) };
}

/** "14 Oct"; empty without a date. */
export const day = (value?: string) =>
  value != null && value !== "" ? format(new Date(value), "d MMM") : "";

/** "Air · MY-KLANG-01 → MY-SHAH-02". */
export const rateCardText = (card?: IBillingRateCard) =>
  card ? `${card.mode} · ${card.fromZone} → ${card.toZone}` : "";

/** "1 invoice", "3 invoices". */
export const countOf = (count = 0, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;
