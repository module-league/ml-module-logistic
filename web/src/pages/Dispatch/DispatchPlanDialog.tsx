import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
  toast,
} from "@moduleleague/ui";
import { RecordLookupContext } from "@/components/custom/RecordLookup.context";
import { errorParser } from "@/hooks/useErrorParser";
import type { LookupSource, RecordLookups } from "@/lib/lookupHelper";
import {
  DispatchDateField,
  DispatchField,
  DispatchLinkField,
  type DispatchDraft,
  type DispatchErrors,
} from "./DispatchJobDialog";
import { jobNumber } from "./dispatchBoard.utils";

export type DispatchPlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispatch: IDispatch;
  sources?: IDispatchSources;
  lookupSources: LookupSource[];
  lookups: RecordLookups;
  members: IUserInfo[];
  title: string;
  isSaving: boolean;
  onSave: (plan: Omit<IDispatchPlan, "versionNo">) => Promise<unknown>;
};

function planErrors(draft: DispatchDraft): DispatchErrors {
  const errors: DispatchErrors = {};
  if (!draft.driverId) errors.driverId = "Pick a driver.";
  if (!draft.vehicleId) errors.vehicleId = "Pick a vehicle.";
  if (!draft.plannedPickupAt) errors.plannedPickupAt = "Plan the pickup.";
  if (
    draft.plannedPickupAt &&
    draft.plannedDeliveryAt &&
    draft.plannedDeliveryAt < draft.plannedPickupAt
  ) {
    errors.plannedDeliveryAt = "Plan the delivery on or after the pickup.";
  }
  return errors;
}

/**
 * Reassigns an open dispatch or moves its plan: driver, vehicle, planned pickup and delivery, with a note for its log.
 * @example
 * <DispatchPlanDialog open={open} onOpenChange={setOpen} dispatch={dispatch} title="Reassign" … onSave={plan} />
 */
export function DispatchPlanDialog(props: DispatchPlanDialogProps) {
  const { open, onOpenChange, dispatch, title } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-10 pb-3">
          <DialogTitle>
            {title} {jobNumber(dispatch)}
          </DialogTitle>
          <DialogDescription>
            Change the driver, vehicle or planned times; the change is logged on
            the dispatch.
          </DialogDescription>
        </DialogHeader>
        <PlanForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

function PlanForm({
  onOpenChange,
  dispatch,
  sources,
  lookupSources,
  lookups,
  members,
  isSaving,
  onSave,
}: DispatchPlanDialogProps) {
  const [draft, setDraft] = useState<DispatchDraft>(() => ({
    driverId: dispatch.driverId,
    vehicleId: dispatch.vehicleId,
    plannedPickupAt: dispatch.plannedPickupAt,
    plannedDeliveryAt: dispatch.plannedDeliveryAt,
  }));
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const errors = useMemo(
    () => (submitted ? planErrors(draft) : {}),
    [submitted, draft],
  );
  const lookupContext = useMemo(
    () => ({ sources: lookupSources, linkFields: [], lookups }),
    [lookupSources, lookups],
  );
  const change = useCallback(
    (key: keyof IDispatchCreate, value?: string) =>
      setDraft((current) => ({ ...current, [key]: value || undefined })),
    [],
  );
  const submit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setSubmitted(true);
      if (Object.keys(planErrors(draft)).length) return;
      try {
        await onSave({
          driverId: draft.driverId ?? "",
          vehicleId: draft.vehicleId ?? "",
          plannedPickupAt: draft.plannedPickupAt ?? "",
          plannedDeliveryAt: draft.plannedDeliveryAt,
          note: note.trim() || undefined,
        });
        toast.success(`${jobNumber(dispatch)} updated`);
        onOpenChange(false);
      } catch (error) {
        toast.error("Couldn't change the dispatch", {
          description: errorParser(error)?.message,
        });
      }
    },
    [draft, note, onSave, dispatch, onOpenChange],
  );

  const fieldProps = { draft, errors, members, onChange: change };
  return (
    <RecordLookupContext.Provider value={lookupContext}>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-4 overflow-y-auto p-4 sm:grid-cols-2">
          <DispatchLinkField
            {...fieldProps}
            name="driverId"
            label="Driver"
            sidebarId={sources?.driverSidebarId ?? ""}
          />
          <DispatchLinkField
            {...fieldProps}
            name="vehicleId"
            label="Vehicle"
            sidebarId={sources?.vehicleSidebarId ?? ""}
          />
          <DispatchDateField
            {...fieldProps}
            name="plannedPickupAt"
            label="Planned pickup"
          />
          <DispatchDateField
            {...fieldProps}
            name="plannedDeliveryAt"
            label="Planned delivery (optional)"
          />
          <DispatchField label="Note (optional)" className="sm:col-span-2">
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                maxLength={2000}
                placeholder="Why it changed, for the dispatch log"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            )}
          </DispatchField>
        </div>
        <DialogFooter className="m-0 shrink-0 border-t p-4">
          <Button
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSaving}>
            Save
          </Button>
        </DialogFooter>
      </form>
    </RecordLookupContext.Provider>
  );
}
