import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, PanelRightOpen, Settings2, Truck } from "lucide-react";
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

type DispatchView = "board" | "schedule" | "fleet";

const DISPATCH_VIEWS: { value: DispatchView; label: string }[] = [
  { value: "board", label: "Board" },
  { value: "schedule", label: "Schedule" },
  { value: "fleet", label: "Fleet" },
];

const COMING_SOON_ICONS = { schedule: CalendarDays, fleet: Truck };

export default function DispatchPage(props: DispatchPageProps) {
  const { data, detail } = props;
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
  const columns = useMemo(
    () => boardColumns(board.shipments, now),
    [board.shipments, now],
  );

  const previewOf = useCallback(
    (draft: DispatchCardPicks) =>
      buildDispatchBoard(
        data?.sources,
        data?.lookups,
        data?.dispatches,
        data?.members,
        draft,
      ).shipments?.[0],
    [data?.sources, data?.lookups, data?.dispatches, data?.members],
  );

  const onOpenDialog = data?.onOpenDialog;
  const assign = useCallback(
    (shipment?: DispatchShipment) => onOpenDialog(shipmentDraft(shipment)),
    [onOpenDialog],
  );
  const customize = useCallback(() => setCustomizing(true), []);
  const onOpenDetail = detail?.onOpen;
  const open = useCallback(
    (shipment: DispatchShipment) =>
      shipment?.dispatch
        ? onOpenDetail(shipment.dispatch.objId)
        : assign(shipment),
    [onOpenDetail, assign],
  );
  const labelOptions = useMemo(
    () =>
      board.shipmentFields.find(
        (field) => field?.objId === picks?.attachmentLabelFieldId,
      )?.dropDownValues,
    [board.shipmentFields, picks?.attachmentLabelFieldId],
  );
  const opened = useMemo(
    () =>
      board.shipments.find(
        (shipment) => shipment?.dispatch?.objId === detail?.dispatchId,
      ),
    [board.shipments, detail?.dispatchId],
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
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            startIcon={<Settings2 size={14} />}
            disabled={!data?.sources}
            onClick={customize}
          >
            Customize card
          </Button>
          <Button
            variant="outline"
            size="sm"
            startIcon={<PanelRightOpen size={14} />}
            disabled={!data?.sources}
            onClick={() => assign()}
          >
            Open full assign panel
          </Button>
        </div>
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
            columns={columns}
            configured={!!picks}
            routeReady={!!board.card.origin && !!board.card.destination}
            now={now}
            onCustomize={customize}
            onOpen={open}
          />
        </QueryWrapper>
      )}
      <DispatchJobDialog data={data} shipments={board.shipments} />
      <DispatchDetailDialog
        shipment={opened}
        detail={detail}
        members={data?.members}
        labelOptions={labelOptions}
        now={now}
      />
      <DispatchCardSettings
        open={customizing}
        onOpenChange={setCustomizing}
        fields={board.shipmentFields}
        locationSidebarId={data?.sources?.locationSidebarId}
        saved={picks}
        versionNo={data?.settings?.versionNo ?? 0}
        previewOf={previewOf}
        now={now}
        onSave={data?.onSaveSettings}
      />
    </div>
  );
}
