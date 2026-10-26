import { useMemo, useState } from "react";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { Button, Skeleton } from "@/ui-kit";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import QueryWrapper from "@/components/custom/QueryWrapper";
import { DashboardSegmented } from "@/module/dashboard/settings/DashboardControls";
import { useCurrentUser } from "@/services/user/current.user";
import { buildDispatchBoard } from "../Dispatch/dispatchBoard.utils";
import { ExceptionList } from "./ExceptionList";
import { ExceptionDetail } from "./ExceptionDetail";
import { ExceptionRulesDialog } from "./ExceptionRulesDialog";
import { ExceptionReportDialog } from "./ExceptionReportDialog";
import {
  buildRows,
  EXCEPTION_FILTERS,
  EXCEPTION_TABS,
  tabRows,
  type ExceptionFilter,
} from "./exception.utils";
import {
  useExceptionActivity,
  type ExceptionApi,
  type ExceptionData,
} from "./useExceptionData";

export default function ExceptionPage({
  data,
  getActivity,
}: {
  data: ExceptionData;
  getActivity: ExceptionApi["getExceptionActivity"];
}) {
  const {
    sources,
    lookups,
    dispatches,
    members,
    settings,
    exceptions,
    rules,
    selectedId,
    onSelect,
  } = data;
  const me = useCurrentUser();
  // When the list was last loaded (every minute), so the SLA countdowns move on with it
  const now = useMemo(() => new Date(data.updatedAt), [data.updatedAt]);
  const [tab, setTab] = useState<IExceptionStatus>("open");
  const [filter, setFilter] = useState<ExceptionFilter>("all");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const picks = settings?.versionNo ? settings : undefined;

  const board = useMemo(
    () => buildDispatchBoard(sources, lookups, dispatches, members, picks),
    [sources, lookups, dispatches, members, picks],
  );
  const rows = useMemo(
    () =>
      buildRows(
        exceptions,
        rules,
        board.shipments,
        dispatches,
        board.drivers,
        members,
      ),
    [exceptions, rules, board, dispatches, members],
  );
  const tabs = useMemo(
    () =>
      EXCEPTION_TABS.map((entry) => ({
        value: entry.value,
        label: `${entry.label} · ${rows.filter((row) => row.exception.status === entry.value).length}`,
      })),
    [rows],
  );
  const visible = useMemo(
    () => tabRows(rows, tab, filter, me.id),
    [rows, tab, filter, me.id],
  );
  const selected = useMemo(
    () =>
      visible.find((row) => row.exception.objId === selectedId) ?? visible[0],
    [visible, selectedId],
  );
  const activity = useExceptionActivity(getActivity, selected?.exception.objId);

  return (
    <div className="flex flex-col gap-4 px-4 pt-1 pb-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold">Exceptions</h1>
          <p className="text-sm text-muted-foreground">
            Opened by rules when a shipment breaks the plan. Own it, fix it,
            close it with a reason.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            startIcon={<TriangleAlert size={14} />}
            disabled={!board.shipments.length}
            onClick={() => setReporting(true)}
          >
            Report exception
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRulesOpen(true)}
          >
            Rules
          </Button>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DashboardSegmented
          label="Status"
          value={tab}
          options={tabs}
          onChange={setTab}
        />
        <DashboardSegmented
          label="Filter"
          value={filter}
          options={EXCEPTION_FILTERS}
          onChange={setFilter}
        />
      </div>
      <QueryWrapper
        isLoading={data?.isLoading}
        error={data?.error}
        onRetry={data?.onRetry}
        renderLoader={<ExceptionPageSkeleton />}
      >
        {visible.length ? (
          <div className="grid items-start gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
            <ExceptionList
              rows={visible}
              selectedId={selected?.exception.objId}
              now={now}
              onSelect={onSelect}
            />
            {selected && (
              <ExceptionDetail
                key={selected.exception.objId}
                row={selected}
                data={data}
                activity={activity}
                now={now}
                me={me}
                onOpenRules={() => setRulesOpen(true)}
              />
            )}
          </div>
        ) : (
          <Empty className="rounded-xl border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldCheck />
              </EmptyMedia>
              <EmptyTitle>
                {tab === "open" ? "Nothing needs attention" : "Nothing here"}
              </EmptyTitle>
              <EmptyDescription>
                {tab === "open"
                  ? "Rules check every shipment each minute and open an exception when one breaks the plan."
                  : "Exceptions show here once they are snoozed or resolved."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </QueryWrapper>
      <ExceptionRulesDialog
        open={rulesOpen}
        onOpenChange={setRulesOpen}
        data={data}
      />
      <ExceptionReportDialog
        open={reporting}
        onOpenChange={setReporting}
        shipments={board.shipments}
        rules={rules}
        members={members}
        isSaving={data?.isSaving}
        onCreate={data?.onCreate}
      />
    </div>
  );
}

function ExceptionPageSkeleton() {
  return (
    <div
      className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]"
      aria-busy
      aria-label="Loading exceptions"
    >
      <div className="flex flex-col gap-2 rounded-xl border p-2">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[32rem] rounded-xl" />
    </div>
  );
}
