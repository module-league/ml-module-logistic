import {
  useCallback,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Textarea,
  toast,
  toField,
} from "@moduleleague/ui";
import { QueryWrapper } from "@/components/custom/QueryWrapper";
import { RecordLinkInput } from "@/components/custom/RecordLinkInput";
import { RecordLookupContext } from "@/components/custom/RecordLookup.context";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { errorParser } from "@/hooks/useErrorParser";
import { parseFieldDate } from "@/lib/dateHelper";
import { parseRecordIds, toRecordIdsValue } from "@/lib/lookupHelper";
import type { DispatchShipment } from "./dispatchBoard.utils";
import type { DispatchData } from "./useDispatchData";
import { nonEmpty } from "@/lib/stringHelper";

export type DispatchDraft = Partial<IDispatchCreate>;
export type DispatchErrors = Partial<Record<keyof IDispatchCreate, string>>;

const REQUIRED: [keyof IDispatchCreate, string][] = [
  ["shipmentId", "Pick a shipment."],
  ["driverId", "Pick a driver."],
  ["vehicleId", "Pick a vehicle."],
  ["plannedPickupAt", "Plan the pickup."],
  ["originId", "Pick the origin."],
  ["destinationId", "Pick the destination."],
];

function draftErrors(draft: DispatchDraft): DispatchErrors {
  const errors: DispatchErrors = Object.fromEntries(
    REQUIRED.filter(([key]) => draft[key] == null || draft[key] === ""),
  );
  if (
    draft.originId != null &&
    draft.originId !== "" &&
    draft.originId === draft.destinationId
  ) {
    errors.destinationId = "Pick a destination other than the origin.";
  }
  if (
    draft.plannedPickupAt != null &&
    draft.plannedPickupAt !== "" &&
    draft.plannedDeliveryAt != null &&
    draft.plannedDeliveryAt !== "" &&
    draft.plannedDeliveryAt < draft.plannedPickupAt
  ) {
    errors.plannedDeliveryAt = "Plan the delivery on or after the pickup.";
  }
  return errors;
}

type DispatchJobDialogProps = {
  data: DispatchData;
  /** Picking one fills in its origin and destination. */
  shipments: DispatchShipment[];
};

/**
 * Plans a dispatch: the shipment, its driver and vehicle, the planned pickup and delivery, and where it goes from and to.
 * Opens with data.dialog.draft filled in.
 * @example
 * <DispatchJobDialog data={useDispatchData(dispatchApi)} shipments={shipments} />
 */
export function DispatchJobDialog({ data, shipments }: DispatchJobDialogProps) {
  return (
    <Dialog open={data.dialog.open} onOpenChange={data.onDialogOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-10 pb-3">
          <DialogTitle>Dispatch job</DialogTitle>
          <DialogDescription>
            Assign a driver and vehicle to a shipment and plan its pickup.
          </DialogDescription>
        </DialogHeader>
        <QueryWrapper
          isLoading={data.isLoading}
          error={data.error}
          onRetry={data.onRetry}
          loadingText="Loading shipments, drivers and vehicles…"
        >
          <DispatchJobForm data={data} shipments={shipments} />
        </QueryWrapper>
      </DialogContent>
    </Dialog>
  );
}

function DispatchJobForm({ data, shipments }: DispatchJobDialogProps) {
  const { sources, lookupSources, lookups, members, onCreateDispatch } = data;
  const onOpenChange = data.onDialogOpenChange;
  const [draft, setDraft] = useState<DispatchDraft>(() => data.dialog.draft);
  const [submitted, setSubmitted] = useState(false);
  const errors = useMemo(
    () => (submitted ? draftErrors(draft) : {}),
    [submitted, draft],
  );
  const lookupContext = useMemo(
    () => ({ sources: lookupSources, linkFields: [], lookups }),
    [lookupSources, lookups],
  );

  const change = useCallback(
    (key: keyof IDispatchCreate, value?: string) => {
      const shipment =
        key === "shipmentId"
          ? shipments.find((entry) => entry.id === value)
          : undefined;
      setDraft((current) => ({
        ...current,
        [key]: nonEmpty(value),
        ...(shipment?.origin && { originId: shipment.origin.id }),
        ...(shipment?.destination && {
          destinationId: shipment.destination.id,
        }),
      }));
    },
    [shipments],
  );
  const submit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setSubmitted(true);
      if (Object.keys(draftErrors(draft)).length > 0) return;
      try {
        const created = await onCreateDispatch({
          ...(draft as IDispatchCreate),
          notes: nonEmpty(draft.notes?.trim()),
        });
        toast.success(`Dispatch #${created.docId} planned`);
        onOpenChange(false);
      } catch (error: unknown) {
        toast.error("Couldn't dispatch the job", {
          description: errorParser(error)?.message,
        });
      }
    },
    [draft, onCreateDispatch, onOpenChange],
  );

  if (!sources) return null;

  const linkProps = { draft, errors, members, onChange: change };
  return (
    <RecordLookupContext.Provider value={lookupContext}>
      <form
        onSubmit={(event) => void submit(event)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-4 overflow-y-auto p-4 sm:grid-cols-2">
          <DispatchLinkField
            {...linkProps}
            name="shipmentId"
            label="Shipment"
            sidebarId={sources.shipmentSidebarId}
            className="sm:col-span-2"
          />
          <DispatchLinkField
            {...linkProps}
            name="driverId"
            label="Driver"
            sidebarId={sources.driverSidebarId}
          />
          <DispatchLinkField
            {...linkProps}
            name="vehicleId"
            label="Vehicle"
            sidebarId={sources.vehicleSidebarId}
          />
          <DispatchDateField
            {...linkProps}
            name="plannedPickupAt"
            label="Planned pickup"
          />
          <DispatchDateField
            {...linkProps}
            name="plannedDeliveryAt"
            label="Planned delivery (optional)"
          />
          <DispatchLinkField
            {...linkProps}
            name="originId"
            label="Origin"
            sidebarId={sources.locationSidebarId}
          />
          <DispatchLinkField
            {...linkProps}
            name="destinationId"
            label="Destination"
            sidebarId={sources.locationSidebarId}
          />
          <DispatchField label="Notes (optional)" className="sm:col-span-2">
            {(id) => (
              <Textarea
                id={id}
                rows={3}
                maxLength={1000}
                placeholder="Instructions for the driver"
                value={draft.notes ?? ""}
                onChange={(event) => change("notes", event.target.value)}
              />
            )}
          </DispatchField>
        </div>
        <DialogFooter className="m-0 shrink-0 border-t p-4">
          <Button
            variant="outline"
            size="sm"
            disabled={data.isCreating}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={data.isCreating}>
            {data.isCreating ? "Dispatching…" : "Dispatch"}
          </Button>
        </DialogFooter>
      </form>
    </RecordLookupContext.Provider>
  );
}

export type DispatchInputProps = {
  name: keyof IDispatchCreate;
  label: string;
  draft: DispatchDraft;
  errors: DispatchErrors;
  members: IUserInfo[];
  onChange: (key: keyof IDispatchCreate, value?: string) => void;
  className?: string;
};

/** A labelled form field with its error below; children get the id to put on the input. */
export function DispatchField({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <Field
      className={cn("gap-1.5", className)}
      data-invalid={error != null && error !== ""}
    >
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children(id)}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

/** Picks one record of sidebarId, with the same searchable cards a link field shows. */
export function DispatchLinkField({
  name,
  label,
  sidebarId,
  draft,
  errors,
  members,
  onChange,
  className,
}: DispatchInputProps & { sidebarId: string }) {
  const field = useMemo(
    () =>
      toField({
        type: "link_table",
        name: label,
        dropDownValues: [],
        lookupSettings: { categoryId: sidebarId, multiple: false },
      }),
    [label, sidebarId],
  );
  const recordId = draft[name];
  return (
    <DispatchField label={label} error={errors[name]} className={className}>
      {(id) => (
        <RecordLinkInput
          id={id}
          field={field}
          members={members}
          value={toRecordIdsValue(
            recordId != null && recordId !== "" ? [recordId] : [],
          )}
          onChange={(value) => onChange(name, parseRecordIds(value)[0])}
        />
      )}
    </DispatchField>
  );
}

export function DispatchDateField({
  name,
  label,
  draft,
  errors,
  onChange,
  className,
}: DispatchInputProps) {
  return (
    <DispatchField label={label} error={errors[name]} className={className}>
      {() => (
        <DateTimePicker
          granularity="minute"
          value={parseFieldDate(draft[name])}
          onChange={(date) => onChange(name, date?.toISOString())}
        />
      )}
    </DispatchField>
  );
}
