import { useCallback, useMemo, useState } from "react";
import { PanelRightOpen, Settings2 } from "lucide-react";
import { Button } from "@/ui-kit";
import { QueryWrapper } from "@/components/custom/QueryWrapper";
import { DispatchBoard, DispatchBoardSkeleton } from "./DispatchBoard";
import { DispatchCardSettings } from "./DispatchCardSettings";
import { DispatchDetailDialog } from "./DispatchDetailDialog";
import { DispatchJobDialog } from "./DispatchJobDialog";
import {
  boardColumns,
  buildDispatchBoard,
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
    <div className="flex flex-col gap-4 p-4 pb-0 h-full bg-white">
      <div className="flex flex-wrap items-center justify-end gap-2">
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
            startIcon={<PanelRightOpen size={14} />}
            disabled={!data.sources}
            onClick={() => assign()}
          >
            Open full assign panel
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
    </div>
  );
}
