import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Phone } from "lucide-react";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  toast,
  toField,
} from "@moduleleague/ui";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { RecordLinkInput } from "@/components/custom/RecordLinkInput";
import { RecordLookupContext } from "@/components/custom/RecordLookup.context";
import { errorParser } from "@/hooks/useErrorParser";
import { parseFieldDate, toFieldDateValue } from "@/lib/dateHelper";
import { parseRecordIds, toRecordIdsValue } from "@/lib/lookupHelper";
import { tableFields } from "@/module/dashboard/moduleDashboard.utils";
import { DispatchPlanDialog } from "../Dispatch/DispatchPlanDialog";
import {
  FIX_ACTIONS,
  MANUAL_FIX_ACTIONS,
  recordUpdate,
  stamp,
  type ExceptionRow,
  type FixAction,
} from "./exception.utils";
import type { ExceptionData } from "./useExceptionData";

const FIX_LABEL: Record<FixAction, string> = {
  update_due: "Update due time",
  notify_consignee: "Notify consignee",
  reassign: "Reassign",
  open_timeline: "Open timeline",
  call_driver: "Call driver",
  link_destination: "Link destination",
  create_location: "Create location",
  use_pickup_weight: "Use pickup weight",
  keep_record_weight: "Keep record weight",
  wait_until_opening: "Wait until opening",
  call_receiver: "Call receiver",
  reschedule: "Reschedule",
  open_documents: "Open Documents",
};

type FixProps = { row: ExceptionRow; data: ExceptionData; action: FixAction };

/** The rule's ways to fix it; each is logged on the timeline, and fixes that clear the condition close it. */
export function ExceptionFixActions({
  row,
  data,
}: {
  row: ExceptionRow;
  data: ExceptionData;
}) {
  const actions = FIX_ACTIONS[row.exception.ruleKey] ?? MANUAL_FIX_ACTIONS;
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Fix key={action} row={row} data={data} action={action} />
      ))}
    </div>
  );
}

/** Logs the step, runs it, and says when it fails. */
function useFixRunner(row: ExceptionRow, data: ExceptionData) {
  const { onLog } = data;
  return useCallback(
    async (step: string, run?: () => Promise<unknown>) => {
      try {
        await onLog(row.exception, "action", step);
        await run?.();
        return true;
      } catch (error: unknown) {
        toast.error("Couldn't apply the fix", {
          description: errorParser(error)?.message,
        });
        return false;
      }
    },
    [onLog, row.exception],
  );
}

function Fix(props: FixProps) {
  const { row, data, action } = props;
  const { exception, dispatch } = row;
  const run = useFixRunner(row, data);
  const navigate = useNavigate();
  const label = FIX_LABEL[action];
  const openDispatch =
    !!dispatch && !["delivered", "cancelled"].includes(dispatch.status);

  switch (action) {
    case "update_due":
      return <UpdateDueFix {...props} />;
    case "notify_consignee":
    case "call_receiver":
    case "call_driver":
      return <ContactFix {...props} />;
    case "link_destination":
      return <LinkDestinationFix {...props} />;
    case "reassign":
    case "reschedule":
      return openDispatch ? (
        <PlanFix {...props} />
      ) : (
        <FixButton disabled title="Needs an open dispatch">
          {label}
        </FixButton>
      );
    case "open_timeline":
      return (
        <FixButton
          disabled={!dispatch}
          title={dispatch ? undefined : "Not dispatched yet"}
          onClick={() => void navigate(`/dispatch?dispatch=${dispatch?.objId}`)}
        >
          {label}
        </FixButton>
      );
    case "create_location":
      return (
        <FixButton onClick={() => void navigate("/shipment-location")}>
          {label}
        </FixButton>
      );
    case "use_pickup_weight": {
      const fieldId = data.exceptionSettings?.chargeableWeightFieldId;
      const weight = exception.facts.pickupWeight;
      const sidebarId = data.sources?.shipmentSidebarId ?? "";
      const handleUsePickupWeight = async () => {
        const body = recordUpdate(
          data.lookups,
          sidebarId,
          exception.shipmentId,
          fieldId ?? "",
          String(weight),
        );
        if (!body) return;
        await run(
          `Set the chargeable weight to the pickup weight, ${weight} kg.`,
          async () => {
            await data.onResolve(exception, "Used the pickup weight");
            await data.onUpdateRecord(sidebarId, exception.shipmentId, body);
          },
        );
      };
      return (
        <FixButton
          disabled={
            fieldId == null || fieldId === "" || weight == null || data.isSaving
          }
          title={
            fieldId != null && fieldId !== ""
              ? undefined
              : "Pick the chargeable weight field in Rules"
          }
          onClick={() => void handleUsePickupWeight()}
        >
          {label}
        </FixButton>
      );
    }
    case "keep_record_weight":
      return (
        <FixButton
          disabled={data.isSaving}
          onClick={() =>
            void run("Kept the chargeable weight on record.", () =>
              data.onResolve(exception, "Kept the record weight"),
            )
          }
        >
          {label}
        </FixButton>
      );
    case "wait_until_opening": {
      const opensAt = exception.facts.opensAt;
      const usable =
        opensAt != null && opensAt !== "" && new Date(opensAt) > new Date();
      return (
        <FixButton
          disabled={!usable || data.isSaving}
          title={usable ? undefined : "It's open already"}
          onClick={() => {
            if (opensAt == null || opensAt === "") return;
            void run(
              `Waiting until the destination opens at ${stamp(opensAt)}.`,
              () => data.onSnooze(exception, new Date(opensAt)),
            );
          }}
        >
          {opensAt != null && opensAt !== ""
            ? `Wait until ${format(new Date(opensAt), "HH:mm")}`
            : label}
        </FixButton>
      );
    }
    default:
      return (
        <FixButton
          onClick={() =>
            void navigate(`/documents?shipment=${exception.shipmentId}`)
          }
        >
          {label}
        </FixButton>
      );
  }
}

function FixButton({
  children,
  ...props
}: React.ComponentProps<typeof Button> & { children: ReactNode }) {
  return (
    <Button variant="secondary" size="sm" {...props}>
      {children}
    </Button>
  );
}

/** A small panel under the button with its fields and a confirm button. */
function FixPopover({
  label,
  disabled,
  title,
  children,
}: {
  label: string;
  disabled?: boolean;
  title?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FixButton disabled={disabled} title={title}>
          {label}
        </FixButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-80 flex-col gap-3 p-3">
        {children(close)}
      </PopoverContent>
    </Popover>
  );
}

/** Moves the planned delivery when the dispatch set it, else the shipment's ETA field. */
function UpdateDueFix({ row, data, action }: FixProps) {
  const { exception, dispatch } = row;
  const run = useFixRunner(row, data);
  const sidebarId = data.sources?.shipmentSidebarId ?? "";
  const etaField = useMemo(
    () =>
      tableFields(data.lookups[sidebarId]).find(
        (field) => field.objId === data.exceptionSettings?.etaFieldId,
      ),
    [data.lookups, sidebarId, data.exceptionSettings?.etaFieldId],
  );
  const viaDispatch =
    exception.facts.dueSource === "planned_delivery" && !!dispatch;
  const [due, setDue] = useState<Date | undefined>(() =>
    parseFieldDate(exception.facts.due),
  );
  const save = useCallback(
    async (close: () => void) => {
      if (!due) return;
      const done = await run(
        `Moved the due time to ${stamp(due.toISOString())}.`,
        () => {
          if (viaDispatch)
            return data.onPlan(dispatch, {
              driverId: dispatch.driverId,
              vehicleId: dispatch.vehicleId,
              plannedPickupAt: dispatch.plannedPickupAt,
              plannedDeliveryAt: due.toISOString(),
              note: `Delivery moved to ${stamp(due.toISOString())} (${exception.exceptionNo}).`,
            });
          const body = recordUpdate(
            data.lookups,
            sidebarId,
            exception.shipmentId,
            etaField?.objId ?? "",
            toFieldDateValue(etaField, due),
          );
          return body
            ? data.onUpdateRecord(sidebarId, exception.shipmentId, body)
            : Promise.reject(new Error("The shipment isn't loaded."));
        },
      );
      if (done) close();
    },
    [due, run, viaDispatch, dispatch, data, exception, sidebarId, etaField],
  );
  return (
    <FixPopover
      label={FIX_LABEL[action]}
      disabled={!viaDispatch && !etaField}
      title={
        viaDispatch || etaField ? undefined : "Pick the ETA field in Rules"
      }
    >
      {(close) => (
        <>
          <span className="text-sm font-medium">
            {viaDispatch ? "New planned delivery" : "New ETA"}
          </span>
          <DateTimePicker granularity="minute" value={due} onChange={setDue} />
          <Button
            size="sm"
            className="self-end"
            disabled={!due}
            isLoading={data.isSaving}
            onClick={() => void save(close)}
          >
            Save
          </Button>
        </>
      )}
    </FixPopover>
  );
}

/** Shows who to call and their phone, then logs that it was done. */
function ContactFix({ row, data, action }: FixProps) {
  const { dispatch, shipment, driver } = row;
  const run = useFixRunner(row, data);
  const toDriver = action === "call_driver";
  const sidebarId = toDriver
    ? data.sources?.driverSidebarId
    : data.sources?.locationSidebarId;
  const recordId = toDriver
    ? dispatch?.driverId
    : (dispatch?.destinationId ?? shipment?.destination?.id);
  const phoneFieldId = toDriver
    ? data.exceptionSettings?.driverPhoneFieldId
    : data.exceptionSettings?.locationPhoneFieldId;
  const phone = data.lookups[sidebarId ?? ""]?.records.find(
    (record) => record.objId === recordId,
  )?.values[phoneFieldId ?? ""];
  const name = toDriver ? driver?.title : shipment?.destination?.title;
  const step = {
    notify_consignee: "Notified the consignee",
    call_receiver: "Called the receiver",
    call_driver: "Called the driver",
  }[action as "notify_consignee" | "call_receiver" | "call_driver"];
  const handleLogContact = async (close: () => void) => {
    if (
      await run(
        phone != null && phone !== "" ? `${step} at ${phone}.` : `${step}.`,
      )
    )
      close();
  };
  return (
    <FixPopover
      label={FIX_LABEL[action]}
      disabled={recordId == null || recordId === ""}
      title={
        recordId != null && recordId !== ""
          ? undefined
          : toDriver
            ? "No driver yet"
            : "No destination yet"
      }
    >
      {(close) => (
        <>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{name ?? "Unknown"}</span>
            {phone != null && phone !== "" ? (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Phone className="size-3.5" />
                {phone}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">
                {phoneFieldId != null && phoneFieldId !== ""
                  ? "No phone number on record."
                  : "Pick the phone field in Rules to show it here."}
              </span>
            )}
          </div>
          <Button
            size="sm"
            className="self-end"
            onClick={() => void handleLogContact(close)}
          >
            {action === "notify_consignee"
              ? "Mark as notified"
              : "Log the call"}
          </Button>
        </>
      )}
    </FixPopover>
  );
}

/** Links a location as the shipment's destination; the exception then closes itself. */
function LinkDestinationFix({ row, data, action }: FixProps) {
  const { exception } = row;
  const run = useFixRunner(row, data);
  const sidebarId = data.sources?.shipmentSidebarId ?? "";
  const fieldId = data.settings?.destinationFieldId;
  const [picked, setPicked] = useState<string>();
  const field = useMemo(
    () =>
      toField({
        type: "link_table",
        name: "Destination",
        dropDownValues: [],
        lookupSettings: {
          categoryId: data.sources?.locationSidebarId ?? "",
          multiple: false,
        },
      }),
    [data.sources?.locationSidebarId],
  );
  const lookupContext = useMemo(
    () => ({
      sources: data.lookupSources,
      linkFields: [],
      lookups: data.lookups,
    }),
    [data.lookupSources, data.lookups],
  );
  const handleLink = async (close: () => void) => {
    const body = recordUpdate(
      data.lookups,
      sidebarId,
      exception.shipmentId,
      fieldId ?? "",
      toRecordIdsValue(picked != null && picked !== "" ? [picked] : []),
    );
    if (!body) return;
    const done = await run("Linked a destination.", () =>
      data.onUpdateRecord(sidebarId, exception.shipmentId, body),
    );
    if (done) close();
  };
  return (
    <FixPopover
      label={FIX_LABEL[action]}
      disabled={fieldId == null || fieldId === ""}
      title={
        fieldId != null && fieldId !== ""
          ? undefined
          : "Pick the destination field in Customize card"
      }
    >
      {(close) => (
        <RecordLookupContext.Provider value={lookupContext}>
          <span className="text-sm font-medium">Destination</span>
          <RecordLinkInput
            field={field}
            members={data.members}
            value={toRecordIdsValue(
              picked != null && picked !== "" ? [picked] : [],
            )}
            onChange={(value) => setPicked(parseRecordIds(value)[0])}
          />
          <Button
            size="sm"
            className="self-end"
            disabled={picked == null || picked === ""}
            isLoading={data.isSaving}
            onClick={() => void handleLink(close)}
          >
            Link
          </Button>
        </RecordLookupContext.Provider>
      )}
    </FixPopover>
  );
}

/** Opens the dispatch's plan; the dialog says when saving fails. */
function PlanFix({ row, data, action }: FixProps) {
  const { exception, dispatch } = row;
  const [open, setOpen] = useState(false);
  if (!dispatch) return null;
  return (
    <>
      <FixButton onClick={() => setOpen(true)}>{FIX_LABEL[action]}</FixButton>
      <DispatchPlanDialog
        open={open}
        onOpenChange={setOpen}
        dispatch={dispatch}
        title={FIX_LABEL[action]}
        sources={data.sources}
        lookupSources={data.lookupSources}
        lookups={data.lookups}
        members={data.members}
        isSaving={data.isSaving}
        onSave={async (plan) => {
          await data.onLog(
            exception,
            "action",
            action === "reassign"
              ? "Reassigned the dispatch."
              : "Rescheduled the delivery.",
          );
          await data.onPlan(dispatch, {
            ...plan,
            note:
              plan.note ?? `${FIX_LABEL[action]} for ${exception.exceptionNo}.`,
          });
        }}
      />
    </>
  );
}
