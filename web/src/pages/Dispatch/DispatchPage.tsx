import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, PanelRightOpen, Truck } from "lucide-react";
import { Button } from "@/ui-kit";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import QueryWrapper from "@/components/custom/QueryWrapper";
import { DashboardSegmented } from "@/module/dashboard/settings/DashboardControls";
import { DispatchBoard, DispatchBoardSkeleton } from "./DispatchBoard";
import { DispatchCardSettings } from "./DispatchCardSettings";
import { DispatchJobDialog } from "./DispatchJobDialog";
import {
  buildDispatchBoard,
  shipmentDraft,
  type DispatchCardPicks,
  type DispatchStage,
} from "./dispatchBoard.utils";
import type { DispatchData } from "./useDispatchData";

type DispatchPageProps = {
  data: DispatchData;
};

type DispatchView = "board" | "schedule" | "fleet";

const DISPATCH_VIEWS: { value: DispatchView; label: string }[] = [
  { value: "board", label: "Board" },
  { value: "schedule", label: "Schedule" },
  { value: "fleet", label: "Fleet" },
];

const COMING_SOON_ICONS = { schedule: CalendarDays, fleet: Truck };

export default function DispatchPage(props: DispatchPageProps) {
  const { data } = props;
  // The picked view lives in the URL (?view=…), so it survives a reload and can be linked to
  const [searchParams, setSearchParams] = useSearchParams();
  const view =
    DISPATCH_VIEWS.find((item) => item.value === searchParams.get("view"))
      ?.value ?? "board";
  const changeView = useCallback(
    (next: DispatchView) =>
      setSearchParams(
        (params) => {
          params.set("view", next);
          return params;
        },
        { replace: true },
      ),
    [setSearchParams],
  );
  const [stage, setStage] = useState<DispatchStage>("unassigned");
  const [selectedId, setSelectedId] = useState<string>();
  const [now] = useState(() => new Date());
  const [customizing, setCustomizing] = useState(false);
  const picks = data?.settings?.versionNo ? data.settings : undefined;

  const board = useMemo(
    () =>
      buildDispatchBoard(
        data?.sources,
        data?.lookups,
        data?.dispatches,
        data?.members,
        picks,
      ),
    [data?.sources, data?.lookups, data?.dispatches, data?.members, picks],
  );
  const counts = useMemo(
    () =>
      board.shipments.reduce<Partial<Record<DispatchStage, number>>>(
        (total, shipment) => ({
          ...total,
          [shipment.stage]: (total?.[shipment.stage] ?? 0) + 1,
        }),
        {},
      ),
    [board.shipments],
  );
  const shown = useMemo(
    () => board.shipments.filter((shipment) => shipment?.stage === stage),
    [board.shipments, stage],
  );
  const selected = useMemo(
    () => shown.find((shipment) => shipment?.id === selectedId) ?? shown[0],
    [shown, selectedId],
  );

  const previewOf = useCallback(
    (draft: DispatchCardPicks) => {
      const { shipments } = buildDispatchBoard(
        data?.sources,
        data?.lookups,
        data?.dispatches,
        data?.members,
        draft,
      );
      return (
        shipments.find((shipment) => shipment?.id === selected?.id) ??
        shipments[0]
      );
    },
    [data?.sources, data?.lookups, data?.dispatches, data?.members, selected],
  );

  const onOpenDialog = data?.onOpenDialog;
  const openFullPanel = useCallback(
    () => onOpenDialog(selected?.dispatch ? {} : shipmentDraft(selected)),
    [onOpenDialog, selected],
  );

  const ComingSoonIcon = view === "board" ? undefined : COMING_SOON_ICONS[view];
  const viewLabel = DISPATCH_VIEWS.find((item) => item.value === view)?.label;

  return (
    <div className="flex flex-col gap-4 px-4 pt-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DashboardSegmented
          label="View"
          value={view}
          options={DISPATCH_VIEWS}
          onChange={changeView}
        />
        <Button
          variant="outline"
          size="sm"
          startIcon={<PanelRightOpen size={14} />}
          disabled={!data?.sources}
          onClick={openFullPanel}
        >
          Open full assign panel
        </Button>
      </div>
      {ComingSoonIcon ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ComingSoonIcon />
            </EmptyMedia>
            <EmptyTitle>{viewLabel} is coming soon</EmptyTitle>
            <EmptyDescription>
              Use the Board to assign and track dispatches for now.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <QueryWrapper
          isLoading={data?.isLoading}
          error={data?.error}
          onRetry={data?.onRetry}
          renderLoader={<DispatchBoardSkeleton />}
        >
          <DispatchBoard
            shown={shown}
            counts={counts}
            drivers={board.drivers}
            vehicles={board.vehicles}
            stage={stage}
            onStageChange={setStage}
            onCustomize={() => setCustomizing(true)}
            configured={!!picks}
            routeReady={!!board.card.origin && !!board.card.destination}
            selected={selected}
            onSelect={setSelectedId}
            now={now}
            isCreating={data?.isCreating}
            onCreateDispatch={data?.onCreateDispatch}
          />
        </QueryWrapper>
      )}
      <DispatchJobDialog data={data} shipments={board.shipments} />
      <DispatchCardSettings
        open={customizing}
        onOpenChange={setCustomizing}
        fields={board.shipmentFields}
        locationSidebarId={data?.sources?.locationSidebarId}
        saved={picks}
        versionNo={data?.settings?.versionNo ?? 0}
        previewOf={previewOf}
        onSave={data?.onSaveSettings}
      />
    </div>
  );
}
