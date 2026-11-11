import { useMemo, useState, type ReactNode } from "react";
import {
  AlarmClock,
  CircleAlert,
  CircleCheck,
  ListFilter,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Skeleton,
} from "@/ui-kit";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { QueryWrapper } from "@/components/custom/QueryWrapper";
import { PageHeader } from "@/components/ml/pageHeader";
import { SegmentedTabs } from "@/components/custom/SegmentedTabs";
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
  type ExceptionRow,
} from "./exception.utils";
import {
  useExceptionActivity,
  type ExceptionApi,
  type ExceptionData,
} from "./useExceptionData";

const TAB_ICON: Record<IExceptionStatus, ReactNode> = {
  open: <CircleAlert className="size-3.5" />,
  snoozed: <AlarmClock className="size-3.5" />,
  resolved: <CircleCheck className="size-3.5" />,
};

export function ExceptionPage({
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
  const picks =
    settings?.versionNo != null && settings.versionNo !== 0
      ? settings
      : undefined;

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
        label: entry.label,
        icon: TAB_ICON[entry.value],
        count: rows.filter((row) => row.exception.status === entry.value)
          .length,
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
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Exceptions"
        description="Opened by rules when a shipment breaks the plan. Own it, fix it, close it with a reason."
        actions={
          <>
            <Button
              variant="outline"
              size="xs"
              startIcon={<TriangleAlert size={13} />}
              disabled={board.shipments.length === 0}
              onClick={() => setReporting(true)}
            >
              Report exception
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setRulesOpen(true)}
            >
              Rules
            </Button>
          </>
        }
      />
      <div className="flex min-h-page-toolbar flex-wrap items-center gap-2 border-b px-4 py-1">
        {/* Stretched over the bar's padding, so the tab underline sits on its bottom border */}
        <SegmentedTabs
          className="-my-1 -ml-2.5 self-stretch"
          label="Status"
          value={tab}
          options={tabs}
          onChange={setTab}
        />
        <ExceptionFilterMenu
          rows={rows}
          tab={tab}
          meId={me.id}
          value={filter}
          onChange={setFilter}
        />
      </div>
      {/* On a wide page the list and the detail scroll on their own; stacked on a narrow one, the whole content does */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
        <QueryWrapper
          isLoading={data.isLoading}
          error={data.error}
          onRetry={data.onRetry}
          renderLoader={<ExceptionPageSkeleton />}
        >
          {/* Keyed by tab, so each switch eases the new list in instead of swapping it at once */}
          <div
            key={tab}
            className="h-full min-h-0 animate-in duration-200 ease-in-out fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none"
          >
            {visible.length > 0 ? (
              <div className="grid h-full min-h-0 lg:grid-cols-[22rem_minmax(0,1fr)] lg:grid-rows-1">
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
                    className="lg:min-h-0 lg:overflow-y-auto"
                  />
                )}
              </div>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ShieldCheck />
                  </EmptyMedia>
                  <EmptyTitle>
                    {tab === "open"
                      ? "Nothing needs attention"
                      : "Nothing here"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {tab === "open"
                      ? "Rules check every shipment each minute and open an exception when one breaks the plan."
                      : "Exceptions show here once they are snoozed or resolved."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </QueryWrapper>
      </div>
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
        isSaving={data.isSaving}
        onCreate={data.onCreate}
      />
    </div>
  );
}

function ExceptionPageSkeleton() {
  return (
    <div
      className="grid h-full lg:grid-cols-[22rem_minmax(0,1fr)]"
      aria-busy
      aria-label="Loading exceptions"
    >
      <div className="flex flex-col gap-1 p-2 lg:border-r">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-16 rounded-md" />
        ))}
      </div>
      <div className="flex flex-col gap-6 px-6 py-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    </div>
  );
}

/** Narrows the tab by severity or to mine, counting each option; the button shows what's picked. */
function ExceptionFilterMenu({
  rows,
  tab,
  meId,
  value,
  onChange,
}: {
  rows: ExceptionRow[];
  tab: IExceptionStatus;
  meId: string;
  value: ExceptionFilter;
  onChange: (filter: ExceptionFilter) => void;
}) {
  const active = value !== "all";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={active ? "secondary" : "outline"}
          size="xs"
          startIcon={<ListFilter size={13} />}
          className="ml-auto"
        >
          {active
            ? EXCEPTION_FILTERS.find((option) => option.value === value)?.label
            : "Filter"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Show</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as ExceptionFilter)}
        >
          {EXCEPTION_FILTERS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <span className="flex-1">
                {option.value === "all"
                  ? "All"
                  : option.value === "mine"
                    ? "Owned by me"
                    : `${option.label} severity`}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {tabRows(rows, tab, option.value, meId).length}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
