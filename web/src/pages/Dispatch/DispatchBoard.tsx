import { ArrowRight, Settings2 } from "lucide-react";
import { Button, cn } from "@moduleleague/ui";
import {
  KanbanBoard,
  KanbanBoardSkeleton,
} from "@/components/custom/KanbanBoard";
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
    <div className="flex flex-col gap-3 h-full">
      {!configured && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-background px-3 py-2 text-xs">
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

/** One shipment: its title and time, route, details, then its driver and the step it has reached. */
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
  const time = cardTime(dispatch, now);
  const late = lateText(dispatch, now);
  const meta = [
    shipment.badge,
    ...shipment.details,
    dispatch && jobNumber(dispatch),
  ].filter((part) => part != null && part !== "");
  const step = dispatch ? DISPATCH_STEPS[stepsDone(dispatch) - 1] : undefined;
  const Root = onSelect ? "button" : "div";

  return (
    <Root
      {...(onSelect && { type: "button" as const, onClick: onSelect })}
      className={cn(
        "flex w-full flex-col gap-1 rounded-lg border bg-background p-3 text-left shadow-xs transition-colors duration-150",
        onSelect &&
          "cursor-pointer hover:border-primary-40 focus-visible:ring-2 focus-visible:ring-primary-30 focus-visible:outline-none",
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-medium">
          {shipment.title}
        </span>
        {late !== "" ? (
          <span
            className="shrink-0 text-xs font-medium text-amber-700 tabular-nums dark:text-amber-400"
            title={time}
          >
            {late}
          </span>
        ) : (
          time !== "" && (
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {time}
            </span>
          )
        )}
      </span>

      {(showRoute || !!dispatch) &&
        (shipment.origin || shipment.destination ? (
          // One wrapping line, so long place names use the card's width instead of each being cut at half
          <span className="line-clamp-2 text-xs">
            {shipment.origin?.title ?? "No origin"}
            <ArrowRight
              aria-label="to"
              className="mx-1 inline size-3 align-[-2px] text-muted-foreground"
            />
            {shipment.destination?.title ?? "No destination"}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No route yet</span>
        ))}

      {meta.length > 0 && (
        <span className="truncate text-xs text-muted-foreground tabular-nums">
          {meta.join(" · ")}
        </span>
      )}

      <span className="mt-1.5 flex min-w-0 items-center gap-2 border-t pt-2 text-xs">
        {shipment.driver ? (
          <span
            aria-hidden
            className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-10 text-[10px] font-semibold text-primary"
          >
            {shipment.driver.initials}
          </span>
        ) : (
          <span
            aria-hidden
            className="size-5 shrink-0 rounded-full border border-dashed border-muted-foreground/50"
          />
        )}
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !shipment.driver && "text-muted-foreground",
          )}
        >
          {shipment.driver?.title ??
            (dispatch ? "Unknown driver" : "No driver yet")}
        </span>
        {step !== undefined && (
          <span className="shrink-0 text-muted-foreground">{step}</span>
        )}
      </span>
    </Root>
  );
}

export const DispatchBoardSkeleton = () => (
  <KanbanBoardSkeleton
    columns={DISPATCH_STAGES.length}
    label="Loading dispatch board"
  />
);
