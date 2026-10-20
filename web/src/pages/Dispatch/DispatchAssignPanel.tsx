import { useCallback, useMemo, useState } from "react";
import {
  Button,
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@moduleleague/ui";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { errorParser } from "@/hooks/useErrorParser";
import {
  availability,
  DISPATCH_STAGES,
  nextPickup,
  shortTime,
  TONE_TEXT_CLASS,
  type DispatchPlace,
  type DispatchResource,
  type DispatchShipment,
} from "./dispatchBoard.utils";

type DispatchAssignPanelProps = {
  shipment: DispatchShipment;
  drivers: DispatchResource[];
  vehicles: DispatchResource[];
  /** Origin and destination fields are picked in the card settings. */
  routeReady: boolean;
  onCustomize: () => void;
  now: Date;
  isCreating: boolean;
  onCreateDispatch: (body: IDispatchCreate) => Promise<IDispatch>;
};

/** The picked shipment: its details and stops, then a driver, vehicle and pickup time to dispatch it with, or who it's assigned to. Key it by shipment so a new pick starts fresh. */
export function DispatchAssignPanel({
  shipment,
  drivers,
  vehicles,
  routeReady,
  onCustomize,
  now,
  isCreating,
  onCreateDispatch,
}: DispatchAssignPanelProps) {
  const weight = shipment?.weight;
  const [driverId, setDriverId] = useState(
    () => drivers?.find((driver) => availability(driver, weight, now).free)?.id,
  );
  const driver = useMemo(
    () => drivers?.find((entry) => entry?.id === driverId),
    [drivers, driverId],
  );
  const [vehicleId, setVehicleId] = useState(
    () =>
      driver?.vehicleId ??
      vehicles?.find((vehicle) => availability(vehicle, weight, now).free)?.id,
  );
  const [pickupAt, setPickupAt] = useState<Date | undefined>(() =>
    nextPickup(shipment?.origin?.opens, now),
  );
  const stage = useMemo(
    () => DISPATCH_STAGES.find((entry) => entry.value === shipment?.stage),
    [shipment?.stage],
  );

  const pickDriver = useCallback((next: DispatchResource) => {
    setDriverId(next.id);
    if (next.vehicleId) setVehicleId(next.vehicleId);
  }, []);

  const missingRoute =
    !routeReady || !shipment?.origin || !shipment?.destination;
  const sameRoute =
    !missingRoute && shipment?.origin?.id === shipment?.destination?.id;
  const canDispatch =
    !!driver && !!vehicleId && !!pickupAt && !missingRoute && !sameRoute;

  const dispatch = useCallback(async () => {
    if (!canDispatch) return;
    try {
      await onCreateDispatch({
        shipmentId: shipment.id,
        driverId: driver.id,
        vehicleId,
        originId: shipment.origin?.id ?? "",
        destinationId: shipment.destination?.id ?? "",
        plannedPickupAt: pickupAt.toISOString(),
      });
      toast.success(`${shipment.title} dispatched to ${driver.title}`);
    } catch (error) {
      toast.error("Couldn't dispatch the shipment", {
        description: errorParser(error)?.message,
      });
    }
  }, [canDispatch, onCreateDispatch, shipment, driver, vehicleId, pickupAt]);

  const assigned = shipment?.dispatch;
  const assignedDriver = useMemo(
    () => drivers?.find((entry) => entry?.id === assigned?.driverId),
    [drivers, assigned?.driverId],
  );
  const assignedVehicle = useMemo(
    () => vehicles?.find((entry) => entry?.id === assigned?.vehicleId),
    [vehicles, assigned?.vehicleId],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 truncate text-base font-semibold">
            {shipment?.title}
          </h2>
          <span
            className={cn(
              "shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium",
              stage?.className,
            )}
          >
            {stage?.label}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {shipment?.badge && (
            <span className="rounded-md bg-primary px-2 py-0.5 font-medium text-primary-foreground">
              {shipment.badge}
            </span>
          )}
          {shipment?.details?.map((text) => (
            <span key={text} className="rounded-md bg-muted px-2 py-0.5">
              {text}
            </span>
          ))}
        </div>
      </div>

      <ol className="flex flex-col gap-4">
        <DispatchStop
          kind="Pickup"
          dotClassName="bg-blue-600"
          place={shipment?.origin}
        />
        <DispatchStop
          kind="Drop-off"
          dotClassName="bg-orange-600"
          place={shipment?.destination}
        />
      </ol>

      {assigned ? (
        <section className="flex flex-col gap-2 border-t pt-4">
          <h3 className="text-sm font-medium">Assigned driver</h3>
          <DispatchResourceCard
            resource={assignedDriver}
            status={{
              tone: "green",
              text: `Pickup ${shortTime(assigned.plannedPickupAt, now)}`,
            }}
            selected
          />
          {assignedVehicle && (
            <p className="text-xs text-muted-foreground">
              Vehicle · {assignedVehicle.detail}
            </p>
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-2 border-t pt-4">
          <h3 className="text-sm font-medium">Assign driver</h3>
          {drivers?.length ? (
            <div
              role="radiogroup"
              aria-label="Driver"
              className="-mx-1 flex max-h-80 flex-col gap-2 overflow-y-auto px-1 py-0.5"
            >
              {drivers.map((entry) => {
                const status = availability(entry, weight, now);
                return (
                  <DispatchResourceCard
                    key={entry.id}
                    resource={entry}
                    status={status}
                    selected={entry.id === driverId}
                    disabled={status.text === "Over capacity"}
                    onSelect={() => pickDriver(entry)}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No drivers yet. Add them on the Driver page.
            </p>
          )}

          <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1 text-xs font-medium">
              Vehicle
              <Select value={vehicleId ?? ""} onValueChange={setVehicleId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles?.map((vehicle) => {
                    const status = availability(vehicle, weight, now);
                    return (
                      <SelectItem
                        key={vehicle.id}
                        value={vehicle.id}
                        disabled={status.text === "Over capacity"}
                      >
                        <span className="truncate">{vehicle.detail}</span>
                        {!status.free && (
                          <span className={TONE_TEXT_CLASS[status.tone]}>
                            {status.text}
                          </span>
                        )}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </label>
            <div className="flex min-w-0 flex-col gap-1 text-xs font-medium">
              Planned pickup
              <DateTimePicker
                granularity="minute"
                value={pickupAt}
                onChange={setPickupAt}
              />
            </div>
          </div>

          {!routeReady ? (
            <p className="text-xs text-destructive">
              Pick the origin and destination fields first.{" "}
              <button
                type="button"
                className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline"
                onClick={onCustomize}
              >
                Customize card
              </button>
            </p>
          ) : (
            (missingRoute || sameRoute) && (
              <p className="text-xs text-destructive">
                {missingRoute
                  ? "Link an origin and destination to the shipment first."
                  : "The shipment's origin and destination are the same."}
              </p>
            )
          )}
          <Button
            className="mt-1 w-full"
            disabled={!canDispatch || isCreating}
            onClick={dispatch}
          >
            {isCreating
              ? "Dispatching…"
              : driver
                ? `Dispatch to ${driver.title}`
                : "Pick a driver"}
          </Button>
        </section>
      )}
    </div>
  );
}

function DispatchStop({
  kind,
  dotClassName,
  place,
}: {
  kind: string;
  dotClassName: string;
  place?: DispatchPlace;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className={cn("mt-1 size-2.5 shrink-0 rounded-full", dotClassName)}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {kind}
          {place?.opensText && ` · Opens ${place.opensText}`}
        </span>
        {place ? (
          <>
            <span className="text-sm font-semibold">{place.title}</span>
            {place.details?.map((detail) => (
              <span key={detail} className="text-xs text-muted-foreground">
                {detail}
              </span>
            ))}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Not set</span>
        )}
      </div>
    </li>
  );
}

function DispatchResourceCard({
  resource,
  status,
  selected = false,
  disabled = false,
  onSelect,
}: {
  resource?: DispatchResource;
  status: { tone: keyof typeof TONE_TEXT_CLASS; text: string; free?: boolean };
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  const muted = status.free === false;
  return (
    <button
      type="button"
      role={onSelect ? "radio" : undefined}
      aria-checked={onSelect ? selected : undefined}
      disabled={disabled || !onSelect}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border bg-background p-2.5 text-left transition-colors",
        onSelect && !disabled && "cursor-pointer hover:border-primary/40",
        selected && "border-primary bg-primary/5 ring-1 ring-primary/30",
        disabled && "opacity-70",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
          muted ? "bg-muted-foreground/50" : "bg-emerald-700",
        )}
      >
        {resource?.initials ?? "?"}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">
          {resource?.title ?? "Unknown driver"}
        </span>
        {resource?.detail && (
          <span className="truncate text-xs text-muted-foreground">
            {resource.detail}
          </span>
        )}
      </span>
      <span
        className={cn(
          "shrink-0 text-right text-xs font-medium",
          TONE_TEXT_CLASS[status.tone],
        )}
      >
        {status.text}
      </span>
    </button>
  );
}
