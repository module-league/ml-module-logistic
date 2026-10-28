import { Settings2 } from "lucide-react";
import { Button, cn } from "@moduleleague/ui";
import {
  KanbanBoard,
  KanbanBoardSkeleton,
} from "@/components/custom/KanbanBoard";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import {
  cardTime,
  DISPATCH_STAGES,
  DISPATCH_STEPS,
  jobNumber,
  lateText,
  stepsDone,
  type boardColumns,
  type DispatchShipment,
} from "./dispatchBoard.utils";

type DispatchBoardProps = {
  columns: ReturnType<typeof boardColumns>;
  /** The card settings have been saved once. */
  configured: boolean;
  /** Origin and destination fields are picked, so unassigned cards show their route. */
  routeReady: boolean;
  now: Date;
  onCustomize: () => void;
  /** A card opens its dispatch, or the assign dialog while it has none. */
  onOpen: (shipment: DispatchShipment) => void;
};

/** Every shipment in a column by stage: unassigned, assigned, en route and delivered today. */
export function DispatchBoard({
  columns,
  configured,
  routeReady,
  now,
  onCustomize,
  onOpen,
}: DispatchBoardProps) {
  return (
    <div className="flex flex-col gap-3">
      {!configured && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-xs">
          <span className="font-medium">Set up the shipment card</span>
          <span className="text-muted-foreground">
            Choose the origin, destination and details each card shows.
          </span>
          <Button
            size="xs"
            className="ml-auto"
            startIcon={<Settings2 size={13} />}
            onClick={onCustomize}
          >
            Customize card
          </Button>
        </div>
      )}
      <KanbanBoard
        columns={columns}
        getKey={(shipment) => shipment.id}
        renderItem={(shipment) => (
          <DispatchShipmentCard
            shipment={shipment}
            showRoute={routeReady}
            now={now}
            onSelect={() => onOpen(shipment)}
          />
        )}
      />
    </div>
  );
}

/** One shipment: its job number and time, details, route, progress, driver and lateness. */
export function DispatchShipmentCard({
  shipment,
  showRoute,
  now,
  onSelect,
}: {
  shipment: DispatchShipment;
  /** Unassigned shipments show their route once its fields are picked; dispatched ones always do. */
  showRoute: boolean;
  now: Date;
  onSelect?: () => void;
}) {
  const dispatch = shipment.dispatch;
  const done = stepsDone(dispatch);
  const time = cardTime(dispatch, now);
  const late = lateText(dispatch, now);
  const summary = [dispatch && shipment.title, ...shipment.details]
    .filter(Boolean)
    .join(" · ");
  const Root = onSelect ? "button" : "div";

  return (
    <Root
      {...(onSelect && { type: "button" as const, onClick: onSelect })}
      className={cn(
        "flex w-full flex-col gap-1.5 rounded-lg border bg-background p-2.5 text-left shadow-xs transition-colors",
        onSelect &&
          "cursor-pointer hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-semibold">
          {dispatch ? jobNumber(dispatch) : shipment.title}
        </span>
        {time !== "" && (
          <span className="shrink-0 text-xs text-muted-foreground">{time}</span>
        )}
      </span>
      {((shipment.badge != null && shipment.badge !== "") ||
        summary !== "") && (
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {shipment.badge != null && shipment.badge !== "" && (
            <span className="shrink-0 rounded-md bg-primary px-1.5 font-medium text-primary-foreground">
              {shipment.badge}
            </span>
          )}
          <span className="truncate">{summary}</span>
        </span>
      )}
      {(showRoute || dispatch) && (
        <span className="truncate text-xs text-muted-foreground">
          {shipment.origin?.title ?? "No origin"} →{" "}
          {shipment.destination?.title ?? "No destination"}
        </span>
      )}
      <span className="flex flex-col gap-1">
        <span className="flex gap-1" aria-hidden>
          {DISPATCH_STEPS.map((step, index) => (
            <span
              key={step}
              className={cn(
                "h-1 flex-1 rounded-full",
                index < done ? "bg-emerald-600" : "bg-muted",
              )}
            />
          ))}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {done} of {DISPATCH_STEPS.length} · next:{" "}
          {DISPATCH_STEPS[done] ?? "Done"}
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-2 text-xs">
        <span
          aria-hidden
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white",
            shipment.driver ? "bg-emerald-700" : "bg-muted-foreground/40",
          )}
        >
          {shipment.driver?.initials ?? "?"}
        </span>
        <span
          className={cn(
            "truncate",
            !shipment.driver && "text-muted-foreground",
          )}
        >
          {shipment.driver?.title ??
            (dispatch ? "Unknown driver" : "No driver yet")}
        </span>
      </span>
      {late !== "" && (
        <span
          className={cn(
            "w-fit rounded-md border px-2 py-0.5 text-[11px] font-medium",
            TONE_CLASS.amber,
          )}
        >
          {late}
        </span>
      )}
    </Root>
  );
}

export const DispatchBoardSkeleton = () => (
  <KanbanBoardSkeleton
    columns={DISPATCH_STAGES.length}
    label="Loading dispatch board"
  />
);
