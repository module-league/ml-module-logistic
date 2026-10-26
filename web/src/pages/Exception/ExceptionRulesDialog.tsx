import { useCallback, useId, useMemo, useState } from "react";
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "@moduleleague/ui";
import { errorParser } from "@/hooks/useErrorParser";
import {
  DashboardFieldSelect,
  SettingsField,
} from "@/module/dashboard/settings/DashboardControls";
import { tableFields } from "@/module/dashboard/moduleDashboard.utils";
import { CHIP_CLASS } from "./ExceptionList";
import { labelOf, SEVERITIES, SEVERITY_CLASS } from "./exception.utils";
import type { ExceptionData } from "./useExceptionData";

type FieldRole = keyof Omit<IExceptionSettingsInput, "versionNo">;

const FALSE_ALARM = "False alarm";
const AUTO_CLOSED = "Condition cleared";

/** Which fields each rule reads, and the rules themselves with how often each fired, closed itself or was a false alarm. */
export function ExceptionRulesDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ExceptionData;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-10 pb-3">
          <DialogTitle>Exception rules</DialogTitle>
          <DialogDescription>
            Rules run every minute. They live in the API's workflow config
            (ExceptionRules in appsettings); the fields they read are set here.
          </DialogDescription>
        </DialogHeader>
        <RulesForm data={data} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

function RulesForm({
  data,
  onOpenChange,
}: {
  data: ExceptionData;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    sources,
    lookups,
    rules,
    exceptions,
    exceptionSettings,
    onSaveSettings,
  } = data;
  const [draft, setDraft] = useState<Partial<IExceptionSettingsInput>>(
    () => exceptionSettings ?? {},
  );
  const [saving, setSaving] = useState(false);
  const fieldsOf = useCallback(
    (sidebarId?: string) =>
      tableFields(lookups?.[sidebarId ?? ""]).filter(
        (field) => !field?.isSystemField,
      ),
    [lookups],
  );
  const destination = useMemo(
    () =>
      fieldsOf(sources?.shipmentSidebarId).find(
        (field) => field.objId === data.settings?.destinationFieldId,
      ),
    [fieldsOf, sources?.shipmentSidebarId, data.settings?.destinationFieldId],
  );
  const stats = useMemo(
    () =>
      new Map(
        rules.map((rule) => {
          const mine = exceptions.filter(
            (entry) => entry.ruleKey === rule.ruleKey,
          );
          const resolved = mine.filter((entry) => entry.status === "resolved");
          const falseAlarms = resolved.filter(
            (entry) => entry.resolutionReason === FALSE_ALARM,
          ).length;
          return [
            rule.ruleKey,
            {
              raised: mine.length,
              open: mine.length - resolved.length,
              autoClosed: resolved.filter(
                (entry) => entry.resolutionReason === AUTO_CLOSED,
              ).length,
              falseAlarms,
              noisy:
                resolved.length >= 3 && falseAlarms / resolved.length >= 0.3,
            },
          ];
        }),
      ),
    [rules, exceptions],
  );

  const pick = useCallback(
    (role: FieldRole) => (fieldId?: string) =>
      setDraft((current) => ({ ...current, [role]: fieldId })),
    [],
  );
  const save = useCallback(async () => {
    setSaving(true);
    try {
      await onSaveSettings({
        ...draft,
        versionNo: exceptionSettings?.versionNo ?? 0,
      });
      toast.success("Rule fields saved");
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't save the rule fields", {
        description: errorParser(error)?.message,
      });
    } finally {
      setSaving(false);
    }
  }, [draft, exceptionSettings, onSaveSettings, onOpenChange]);

  const roles: {
    role: FieldRole;
    label: string;
    hint: string;
    sidebarId?: string;
    type: (field: ISidebarField) => boolean;
  }[] = [
    {
      role: "etaFieldId",
      label: "ETA",
      hint: "Delayed, when not dispatched",
      sidebarId: sources?.shipmentSidebarId,
      type: (field) => field.type === "date",
    },
    {
      role: "chargeableWeightFieldId",
      label: "Chargeable weight",
      hint: "Weight mismatch, in kg",
      sidebarId: sources?.shipmentSidebarId,
      type: (field) => field.type === "number" || field.type === "currency",
    },
    {
      role: "modeFieldId",
      label: "Mode",
      hint: "Shown in the facts",
      sidebarId: sources?.shipmentSidebarId,
      type: (field) => field.type === "single_select",
    },
    {
      role: "openingHourFieldId",
      label: "Operating hour start",
      hint: "Arrived before opening",
      sidebarId: sources?.locationSidebarId,
      type: (field) => field.type === "time",
    },
    {
      role: "locationPhoneFieldId",
      label: "Location phone",
      hint: "Notify consignee, call receiver",
      sidebarId: sources?.locationSidebarId,
      type: (field) => field.type === "text",
    },
    {
      role: "driverPhoneFieldId",
      label: "Driver phone",
      hint: "Call driver",
      sidebarId: sources?.driverSidebarId,
      type: (field) => field.type === "text",
    },
  ];

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Fields the rules read</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((entry) => (
              <RoleSelect
                key={entry.role}
                label={entry.label}
                hint={entry.hint}
                fields={fieldsOf(entry.sidebarId)}
                accepts={entry.type}
                value={draft[entry.role]}
                onChange={pick(entry.role)}
              />
            ))}
            <SettingsField label="Destination" hint="Missing destination">
              <span className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                {destination?.name ?? "Pick it in Dispatch › Customize card"}
              </span>
            </SettingsField>
          </div>
          <p className="text-xs text-muted-foreground">
            Times are read in {exceptionSettings?.timeZone ?? "UTC"}.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Rules</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[56rem] text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {[
                    "Rule",
                    "When",
                    "Severity",
                    "SLA",
                    "Grace",
                    "Closes itself",
                    "Raised",
                    "Open",
                    "Auto-closed",
                    "False alarms",
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-2 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => {
                  const count = stats.get(rule.ruleKey);
                  return (
                    <tr
                      key={rule.ruleKey}
                      className={cn(
                        "border-t align-top",
                        !rule.isActive && "text-muted-foreground",
                      )}
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground">
                          {rule.title}
                        </div>
                        <div className="text-muted-foreground">
                          {rule.ruleKey}
                          {!rule.isActive && " · off"}
                          {rule.manual && " · raised by hand"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <code className="font-mono text-[11px]">
                          {rule.when}
                        </code>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            CHIP_CLASS,
                            SEVERITY_CLASS[rule.severity],
                          )}
                        >
                          {labelOf(SEVERITIES, rule.severity)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {rule.slaMinutes} min
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {rule.manual ? "—" : `${rule.gracePeriodMinutes} min`}
                      </td>
                      <td className="px-3 py-2">
                        {rule.autoClose ? "Yes" : "No"}
                      </td>
                      <td className="px-3 py-2">{count?.raised ?? 0}</td>
                      <td className="px-3 py-2">{count?.open ?? 0}</td>
                      <td className="px-3 py-2">{count?.autoClosed ?? 0}</td>
                      <td className="px-3 py-2">
                        {count?.falseAlarms ?? 0}
                        {count?.noisy && (
                          <div className="font-medium text-amber-700 dark:text-amber-400">
                            Needs a longer grace period?
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <DialogFooter className="m-0 shrink-0 border-t p-4">
        <Button
          variant="outline"
          size="sm"
          disabled={saving}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button size="sm" isLoading={saving} onClick={save}>
          Save fields
        </Button>
      </DialogFooter>
    </>
  );
}

/** One field role: a field of the table, of a type the role accepts, or none. */
export function RoleSelect({
  label,
  hint,
  fields,
  accepts,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  fields: ISidebarField[];
  accepts: (field: ISidebarField) => boolean;
  value?: string;
  onChange: (fieldId?: string) => void;
}) {
  const id = useId();
  return (
    <SettingsField label={label} hint={hint} htmlFor={id}>
      <DashboardFieldSelect
        id={id}
        fields={fields}
        accepts={accepts}
        value={value}
        onChange={onChange}
        noneLabel="Not used"
      />
    </SettingsField>
  );
}
