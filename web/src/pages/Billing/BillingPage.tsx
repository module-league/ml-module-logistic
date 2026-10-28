import { useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { Button, cn, Skeleton } from "@moduleleague/ui";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { QueryWrapper } from "@/components/custom/QueryWrapper";
import { DashboardSegmented } from "@/module/dashboard/settings/DashboardControls";
import { buildDispatchBoard } from "../Dispatch/dispatchBoard.utils";
import { BillingList } from "./BillingList";
import { BillingQuote } from "./BillingQuote";
import { BillingInvoice } from "./BillingInvoice";
import { BillingSettingsDialog } from "./BillingSettingsDialog";
import {
  BILLING_TABS,
  countOf,
  money,
  tabOf,
  type BillingTab,
} from "./billing.utils";
import type { BillingApi, BillingData } from "./useBillingData";

export function BillingPage({
  data,
  getFields,
}: {
  data: BillingData;
  getFields: BillingApi["getFields"];
}) {
  const { sources, lookups, dispatches, members, settings, overview } = data;
  const [tab, setTab] = useState<BillingTab>("ready");
  const [selectedId, setSelectedId] = useState<string>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const picks =
    settings?.versionNo != null && settings.versionNo !== 0
      ? settings
      : undefined;
  const symbol = overview?.currencySymbol;

  const board = useMemo(
    () => buildDispatchBoard(sources, lookups, dispatches, members, picks),
    [sources, lookups, dispatches, members, picks],
  );
  const shipments = useMemo(
    () => new Map(board.shipments.map((shipment) => [shipment.id, shipment])),
    [board],
  );
  const invoices = useMemo(
    () =>
      (overview?.invoices ?? []).filter(
        (invoice) => tabOf(invoice.status) === tab,
      ),
    [overview?.invoices, tab],
  );
  const tabs = useMemo(
    () =>
      BILLING_TABS.map((entry) => ({
        value: entry.value,
        label: `${entry.label} · ${
          entry.value === "ready"
            ? (overview?.ready.length ?? 0)
            : (overview?.invoices ?? []).filter(
                (invoice) => tabOf(invoice.status) === entry.value,
              ).length
        }`,
      })),
    [overview],
  );
  const quote = useMemo(
    () =>
      tab === "ready"
        ? (overview?.ready.find((entry) => entry.shipmentId === selectedId) ??
          overview?.ready[0])
        : undefined,
    [tab, overview?.ready, selectedId],
  );
  const invoice = useMemo(
    () =>
      tab === "ready"
        ? undefined
        : (invoices.find((entry) => entry.objId === selectedId) ?? invoices[0]),
    [tab, invoices, selectedId],
  );
  const open = (next: BillingTab, id?: string) => {
    setTab(next);
    setSelectedId(id);
  };
  const totals = overview?.totals;
  const cards: {
    tab: BillingTab;
    label: string;
    amount?: number;
    note: string;
    alert?: boolean;
  }[] = [
    {
      tab: "ready",
      label: "Ready to bill",
      amount: totals?.readyAmount,
      note: countOf(totals?.readyCount, "shipment"),
    },
    {
      tab: "draft",
      label: "Draft invoices",
      note: `${money(totals?.draftAmount, symbol)} waiting to be sent`,
    },
    {
      tab: "sent",
      label: "Overdue",
      amount: totals?.overdueAmount,
      note: `${countOf(totals?.overdueCount, "invoice")} past due date`,
      alert: totals?.overdueCount != null && totals.overdueCount !== 0,
    },
    {
      tab: "paid",
      label: "Paid this month",
      amount: totals?.paidThisMonthAmount,
      note: countOf(totals?.paidThisMonthCount, "invoice"),
    },
  ];

  return (
    <div className="flex flex-col gap-4 px-4 pt-1 pb-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Delivered shipments with verified paperwork land here, priced from
            the rate card.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSettingsOpen(true)}
        >
          Rates & settings
        </Button>
      </header>
      <QueryWrapper
        isLoading={data.isLoading}
        error={data.error}
        onRetry={data.onRetry}
        renderLoader={<BillingPageSkeleton />}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={() => open(card.tab)}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-xl border bg-background p-4 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                card.alert === true &&
                  "border-red-200 bg-red-50 hover:bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/30",
              )}
            >
              <span
                className={cn(
                  "text-sm text-muted-foreground",
                  card.alert === true && "text-red-700 dark:text-red-300",
                )}
              >
                {card.label}
              </span>
              <span
                className={cn(
                  "text-2xl font-semibold tabular-nums",
                  card.alert === true && "text-red-700 dark:text-red-300",
                )}
              >
                {card.amount == null
                  ? (totals?.draftCount ?? 0)
                  : money(card.amount, symbol)}
              </span>
              <span
                className={cn(
                  "text-xs text-muted-foreground",
                  card.alert === true && "text-red-700/80 dark:text-red-300/80",
                )}
              >
                {card.note}
              </span>
            </button>
          ))}
        </div>
        <DashboardSegmented
          label="Show"
          value={tab}
          options={tabs}
          onChange={(next) => open(next)}
        />
        <div className="grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <BillingList
            tab={tab}
            overview={overview}
            invoices={invoices}
            shipments={shipments}
            selectedId={quote?.shipmentId ?? invoice?.objId}
            onSelect={setSelectedId}
          />
          {quote ? (
            <BillingQuote
              key={quote.shipmentId}
              quote={quote}
              shipment={shipments.get(quote.shipmentId)}
              data={data}
              onCreated={(created) => open("draft", created.objId)}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          ) : invoice ? (
            <BillingInvoice
              key={invoice.objId}
              invoice={invoice}
              shipment={shipments.get(invoice.shipmentId)}
              data={data}
              onChanged={(changed) =>
                open(tabOf(changed.status), changed.objId)
              }
            />
          ) : (
            <Empty className="rounded-xl border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Receipt />
                </EmptyMedia>
                <EmptyTitle>
                  {tab === "ready" ? "Nothing to bill yet" : "No invoices here"}
                </EmptyTitle>
                <EmptyDescription>
                  {tab === "ready"
                    ? "Shipments show up once they're delivered, the proof of delivery is verified and no weight mismatch is open."
                    : "Invoices move here as they're created, sent, paid or voided."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </QueryWrapper>
      <BillingSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        data={data}
        getFields={getFields}
      />
    </div>
  );
}

function BillingPageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Loading billing">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
