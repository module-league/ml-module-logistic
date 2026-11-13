import { useCallback, useMemo, useState } from "react";
import { Plus, Settings2, Sparkles } from "lucide-react";
import { Button, cn } from "@/ui-kit";
import { BackgroundWrapper } from "@/components/custom/BackgroundWrapper";
import { QueryWrapper } from "@/components/custom/QueryWrapper";
import { DispatchBoard, DispatchBoardSkeleton } from "./DispatchBoard";
import { DispatchCardSettings } from "./DispatchCardSettings";
import { DispatchDetailDialog } from "./DispatchDetailDialog";
import { DispatchJobDialog } from "./DispatchJobDialog";
import { DispatchPlannerDialog } from "./DispatchPlannerDialog";
import {
  boardColumns,
  buildDispatchBoard,
  lateText,
  shipmentDraft,
  type DispatchCardPicks,
  type DispatchShipment,
} from "./dispatchBoard.utils";
import type { DispatchData } from "./useDispatchData";
import type { DispatchDetailData } from "./useDispatchDetail";

type DispatchPageProps = {
  data: DispatchData;
  detail: DispatchDetailData;
};

export function DispatchPage(props: DispatchPageProps) {
  const { data, detail } = props;
  const [now] = useState(() => new Date());
  const [customizing, setCustomizing] = useState(false);
  const [planning, setPlanning] = useState(false);
  const picks =
    data.settings?.versionNo != null && data.settings.versionNo !== 0
      ? data.settings
      : undefined;

  const board = useMemo(
    () =>
      buildDispatchBoard(
        data.sources,
        data.lookups,
        data.dispatches,
        data.members,
        picks,
      ),
    [data.sources, data.lookups, data.dispatches, data.members, picks],
  );
  const columns = useMemo(
    () => boardColumns(board.shipments, now),
    [board.shipments, now],
  );
  const unassignedCount =
    columns.find((column) => column.value === "unassigned")?.items.length ?? 0;
  const lateCount = columns
    .flatMap((column) => column.items)
    .filter((shipment) => lateText(shipment.dispatch, now) !== "").length;

  const previewOf = useCallback(
    (draft: DispatchCardPicks) =>
      buildDispatchBoard(
        data.sources,
        data.lookups,
        data.dispatches,
        data.members,
        draft,
      ).shipments[0],
    [data.sources, data.lookups, data.dispatches, data.members],
  );

  const onOpenDialog = data.onOpenDialog;
  const assign = useCallback(
    (shipment?: DispatchShipment) => onOpenDialog(shipmentDraft(shipment)),
    [onOpenDialog],
  );
  const customize = useCallback(() => setCustomizing(true), []);
  const onOpenDetail = detail.onOpen;
  const open = useCallback(
    (shipment: DispatchShipment) =>
      shipment.dispatch
        ? onOpenDetail(shipment.dispatch.objId)
        : assign(shipment),
    [onOpenDetail, assign],
  );
  const opened = useMemo(
    () =>
      board.shipments.find(
        (shipment) => shipment.dispatch?.objId === detail.dispatchId,
      ),
    [board.shipments, detail.dispatchId],
  );

  return (
    <BackgroundWrapper className="flex h-full flex-col gap-3 p-4 pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground tabular-nums">
          {!data.isLoading && (
            <>
              <span className="font-medium text-foreground">
                {unassignedCount}
              </span>{" "}
              {unassignedCount === 1 ? "needs" : "need"} a driver ·{" "}
              <span
                className={cn(
                  "font-medium",
                  lateCount > 0
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-foreground",
                )}
              >
                {lateCount}
              </span>{" "}
              running late
            </>
          )}
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="xs"
            startIcon={<Settings2 size={14} />}
            disabled={!data.sources}
            onClick={customize}
          >
            Customize card
          </Button>
          <Button
            variant="outline"
            size="xs"
            startIcon={<Sparkles size={14} />}
            disabled={!data.sources}
            onClick={() => setPlanning(true)}
          >
            Plan with AI
          </Button>
          <Button
            size="xs"
            startIcon={<Plus size={14} />}
            disabled={!data.sources}
            onClick={() => assign()}
          >
            Assign shipment
          </Button>
        </div>
      </div>
      <QueryWrapper
        isLoading={data.isLoading}
        error={data.error}
        onRetry={data.onRetry}
        renderLoader={<DispatchBoardSkeleton />}
      >
        <DispatchBoard
          columns={columns}
          configured={!!picks}
          routeReady={!!board.card.origin && !!board.card.destination}
          now={now}
          onCustomize={customize}
          onOpen={open}
        />
      </QueryWrapper>
      <DispatchJobDialog data={data} shipments={board.shipments} />
      <DispatchPlannerDialog
        open={planning}
        onOpenChange={setPlanning}
        data={data}
      />
      <DispatchDetailDialog
        shipment={opened}
        detail={detail}
        members={data.members}
        now={now}
      />
      <DispatchCardSettings
        open={customizing}
        onOpenChange={setCustomizing}
        fields={board.shipmentFields}
        locationSidebarId={data.sources?.locationSidebarId}
        saved={picks}
        versionNo={data.settings?.versionNo ?? 0}
        previewOf={previewOf}
        now={now}
        onSave={data.onSaveSettings}
      />
    </BackgroundWrapper>
  );
}
