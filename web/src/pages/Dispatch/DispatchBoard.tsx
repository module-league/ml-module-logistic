import { useMemo } from "react";
import { PackageCheck, Settings2 } from "lucide-react";
import {
  Button,
  cn,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@moduleleague/ui";
import { DispatchAssignPanel } from "./DispatchAssignPanel";
import {
  DISPATCH_STAGES,
  type DispatchResource,
  type DispatchShipment,
  type DispatchStage,
} from "./dispatchBoard.utils";

type DispatchBoardProps = {
  /** The stage's shipments. */
  shown: DispatchShipment[];
  counts: Partial<Record<DispatchStage, number>>;
  drivers: DispatchResource[];
  vehicles: DispatchResource[];
  stage: DispatchStage;
  onStageChange: (stage: DispatchStage) => void;
  /** Opens the shipment card settings. */
  onCustomize: () => void;
  /** The card settings have been saved once. */
  configured: boolean;
  /** Origin and destination fields are picked, so shipments can be dispatched. */
  routeReady: boolean;
  selected?: DispatchShipment;
  onSelect: (shipmentId: string) => void;
  now: Date;
  isCreating: boolean;
  onCreateDispatch: (body: IDispatchCreate) => Promise<IDispatch>;
};

const CARD_CLASS = "rounded-xl border bg-background p-3";
const BOARD_GRID_CLASS =
  "grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)_minmax(19rem,22rem)]";

const LEGEND = [
  { label: "Pickup", className: "bg-blue-600" },
  { label: "Drop-off", className: "bg-orange-600" },
  { label: "Available", className: "bg-emerald-700" },
  { label: "On trip", className: "bg-muted-foreground" },
];

/** The shipments of one stage on the left, the route of the picked one in the middle and its assign panel on the right. */
export function DispatchBoard({
  shown,
  counts,
  drivers,
  vehicles,
  stage,
  onStageChange,
  onCustomize,
  configured,
  routeReady,
  selected,
  onSelect,
  now,
  isCreating,
  onCreateDispatch,
}: DispatchBoardProps) {
  const stageLabel = useMemo(
    () => DISPATCH_STAGES.find((entry) => entry.value === stage)?.label ?? "",
    [stage],
  );

  return (
    <div className={BOARD_GRID_CLASS}>
      <section
        aria-label={`${stageLabel} shipments`}
        className={cn(CARD_CLASS, "flex max-h-[75dvh] flex-col gap-2")}
      >
        <div className="flex items-center gap-1.5">
          <h2 className="mr-auto text-sm font-medium">Shipments</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Customize shipment card"
            title="Customize shipment card"
            className="text-muted-foreground hover:text-foreground"
            startIcon={<Settings2 size={15} />}
            onClick={onCustomize}
          />
          <Select
            value={stage}
            onValueChange={(next) => onStageChange(next as DispatchStage)}
          >
            <SelectTrigger aria-label="Stage" className="h-8 w-auto gap-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {DISPATCH_STAGES.map((entry) => (
                <SelectItem key={entry.value} value={entry.value}>
                  {entry.label}
                  <span className="text-muted-foreground">
                    {counts?.[entry.value] ?? 0}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="-mx-1 flex min-h-0 flex-col gap-2 overflow-y-auto px-1 py-0.5">
          {!configured && (
            <div className="flex flex-col gap-1 rounded-lg border border-dashed bg-muted/40 p-3 text-xs">
              <span className="font-medium">Set up the shipment card</span>
              <span className="text-muted-foreground">
                Choose the origin, destination and details each card shows.
              </span>
              <Button
                size="xs"
                className="mt-1 w-fit"
                startIcon={<Settings2 size={13} />}
                onClick={onCustomize}
              >
                Customize card
              </Button>
            </div>
          )}
          {shown.length ? (
            shown.map((shipment) => (
              <DispatchShipmentCard
                key={shipment.id}
                shipment={shipment}
                showRoute={routeReady}
                selected={shipment.id === selected?.id}
                onSelect={() => onSelect(shipment.id)}
              />
            ))
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No {stageLabel.toLowerCase()} shipments.
            </p>
          )}
        </div>
      </section>

      <DispatchRoutePanel shipment={selected} />

      <section className={cn(CARD_CLASS, "p-4")}>
        {selected ? (
          <DispatchAssignPanel
            key={selected.id}
            shipment={selected}
            drivers={drivers}
            vehicles={vehicles}
            routeReady={routeReady}
            onCustomize={onCustomize}
            now={now}
            isCreating={isCreating}
            onCreateDispatch={onCreateDispatch}
          />
        ) : (
          <Empty className="border-0 p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageCheck />
              </EmptyMedia>
              <EmptyTitle>Nothing to assign</EmptyTitle>
              <EmptyDescription>
                Pick a shipment to see its stops and drivers.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </div>
  );
}

export function DispatchShipmentCard({
  shipment,
  showRoute,
  selected,
  onSelect,
}: {
  shipment: DispatchShipment;
  /** Shows origin → destination; off until their fields are picked. */
  showRoute: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const stage = DISPATCH_STAGES.find(
    (entry) => entry.value === shipment?.stage,
  );

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full cursor-pointer flex-col gap-1 rounded-lg border bg-background p-2.5 text-left transition-colors hover:border-primary/40",
        selected && "border-primary bg-primary/5 ring-1 ring-primary/30",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-semibold">
          {shipment?.title}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
            stage?.className,
          )}
        >
          {stage?.label}
        </span>
      </span>
      {showRoute && (
        <>
          <span className="truncate text-xs text-muted-foreground">
            {shipment?.origin?.title ?? "No origin"}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            → {shipment?.destination?.title ?? "No destination"}
          </span>
        </>
      )}
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        {shipment?.badge && (
          <span className="shrink-0 rounded-md bg-primary px-1.5 font-medium text-primary-foreground">
            {shipment.badge}
          </span>
        )}
        <span className="truncate">{shipment?.details?.join(" · ")}</span>
      </span>
    </button>
  );
}

function DispatchRoutePanel({ shipment }: { shipment?: DispatchShipment }) {
  const stats = [
    { label: "Distance", value: "—" },
    { label: "Drive time", value: "—" },
    { label: "Pickup opens", value: shipment?.origin?.opensText ?? "—" },
  ];
  return (
    <section className="flex flex-col overflow-hidden rounded-xl border bg-background">
      <div
        aria-label="Route map"
        className="min-h-72 flex-1 bg-muted/50 lg:min-h-96"
      />
      <dl className="grid grid-cols-3 gap-3 border-t p-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex min-w-0 flex-col">
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            <dd className="truncate text-sm font-semibold">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 px-3 pb-3 text-xs text-muted-foreground">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn("size-2 rounded-full", item.className)}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DispatchBoardSkeleton() {
  return (
    <div
      className={BOARD_GRID_CLASS}
      aria-busy
      aria-label="Loading dispatch board"
    >
      <div className={cn(CARD_CLASS, "flex flex-col gap-2")}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
      <div className={cn(CARD_CLASS, "flex flex-col gap-3 p-4")}>
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-20 w-full" />
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-14 rounded-lg" />
        ))}
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}
