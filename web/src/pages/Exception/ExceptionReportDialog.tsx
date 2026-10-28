import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
  toField,
} from "@moduleleague/ui";
import { RecordMemberInput } from "@/components/custom/RecordMemberInput";
import { errorParser } from "@/hooks/useErrorParser";
import { DashboardSegmented } from "@/module/dashboard/settings/DashboardControls";
import { DispatchField } from "../Dispatch/DispatchJobDialog";
import type { DispatchShipment } from "../Dispatch/dispatchBoard.utils";
import { ATTEMPT_REASONS, routeText, SEVERITIES } from "./exception.utils";
import { nonEmpty } from "@/lib/stringHelper";

const OWNER_FIELD = toField({
  type: "member",
  name: "Owner",
  dropDownValues: [],
  memberSettings: { multiple: false },
});

export type ExceptionReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipments: DispatchShipment[];
  rules: IExceptionRule[];
  members: IUserInfo[];
  /** Raised from a dispatch: its shipment and dispatch are fixed. */
  fixed?: { shipmentId: string; dispatchId?: string };
  /** The problem it opens on. */
  ruleKey?: string;
  isSaving: boolean;
  onCreate: (body: IExceptionCreate) => Promise<unknown>;
};

/**
 * Raises an exception by hand under a manual rule: a failed delivery attempt with its reason, or any other problem with a
 * title; with a severity, an owner and a first note.
 * @example
 * <ExceptionReportDialog open={open} onOpenChange={setOpen} shipments={shipments} rules={rules} members={members} isSaving={false} onCreate={create} />
 */
export function ExceptionReportDialog(props: ExceptionReportDialogProps) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-10 pb-3">
          <DialogTitle>Report exception</DialogTitle>
          <DialogDescription>
            Raise a problem the rules can't see, so someone owns it until it's
            fixed.
          </DialogDescription>
        </DialogHeader>
        <ReportForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

function ReportForm({
  onOpenChange,
  shipments,
  rules,
  members,
  fixed,
  ruleKey,
  isSaving,
  onCreate,
}: ExceptionReportDialogProps) {
  const manual = useMemo(
    () => rules.filter((rule) => rule.manual && rule.isActive),
    [rules],
  );
  const [draft, setDraft] = useState<Partial<IExceptionCreate>>(() => {
    const rule = manual.find((entry) => entry.ruleKey === ruleKey) ?? manual[0];
    return {
      shipmentId: fixed?.shipmentId,
      ruleKey: rule?.ruleKey,
      severity: rule?.severity,
    };
  });
  const [submitted, setSubmitted] = useState(false);
  const failed = draft.ruleKey === "delivery_attempt_failed";
  const errors = useMemo(
    () =>
      submitted
        ? {
            shipmentId:
              draft.shipmentId != null && draft.shipmentId !== ""
                ? ""
                : "Pick the shipment.",
            reason:
              failed && draft.reason === undefined ? "Say why it failed." : "",
            title:
              !failed && (draft.title?.trim() ?? "") === ""
                ? "Give it a short title."
                : "",
          }
        : { shipmentId: "", reason: "", title: "" },
    [submitted, draft, failed],
  );
  const change = useCallback(
    <K extends keyof IExceptionCreate>(key: K, value: IExceptionCreate[K]) =>
      setDraft((current) => ({ ...current, [key]: value })),
    [],
  );
  const pickRule = useCallback(
    (value: string) =>
      setDraft((current) => ({
        ...current,
        ruleKey: value,
        severity: manual.find((rule) => rule.ruleKey === value)?.severity,
      })),
    [manual],
  );

  const submit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setSubmitted(true);
      if (
        draft.shipmentId == null ||
        draft.shipmentId === "" ||
        draft.ruleKey == null ||
        draft.ruleKey === ""
      )
        return;
      if (
        failed ? draft.reason === undefined : (draft.title?.trim() ?? "") === ""
      )
        return;
      const shipment = shipments.find((entry) => entry.id === draft.shipmentId);
      try {
        await onCreate({
          shipmentId: draft.shipmentId,
          dispatchId: fixed?.dispatchId ?? shipment?.dispatch?.objId,
          ruleKey: draft.ruleKey,
          severity: draft.severity,
          reason: failed ? draft.reason : undefined,
          title: failed ? undefined : draft.title?.trim(),
          note: nonEmpty(draft.note?.trim()),
          ownerId: nonEmpty(draft.ownerId),
        });
        toast.success("Exception raised");
        onOpenChange(false);
      } catch (error: unknown) {
        toast.error("Couldn't raise it", {
          description: errorParser(error)?.message,
        });
      }
    },
    [draft, failed, shipments, fixed, onCreate, onOpenChange],
  );

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <DispatchField label="Shipment" error={errors.shipmentId}>
          {(id) => (
            <Select
              value={draft.shipmentId ?? ""}
              onValueChange={(value) => change("shipmentId", value)}
              disabled={!!fixed}
            >
              <SelectTrigger id={id} className="w-full min-w-0">
                <SelectValue placeholder="Choose a shipment" />
              </SelectTrigger>
              <SelectContent>
                {shipments.map((shipment) => (
                  <SelectItem key={shipment.id} value={shipment.id}>
                    {shipment.title} · {routeText(shipment)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </DispatchField>
        <DispatchField label="Problem">
          {() => (
            <DashboardSegmented
              label="Problem"
              value={draft.ruleKey ?? ""}
              options={manual.map((rule) => ({
                value: rule.ruleKey,
                label: rule.title,
              }))}
              onChange={pickRule}
            />
          )}
        </DispatchField>
        {failed ? (
          <DispatchField label="Why it failed" error={errors.reason}>
            {() => (
              <DashboardSegmented
                label="Why it failed"
                value={draft.reason ?? ("" as IExceptionAttemptReason)}
                options={ATTEMPT_REASONS}
                onChange={(value) => change("reason", value)}
              />
            )}
          </DispatchField>
        ) : (
          <DispatchField label="Title" error={errors.title}>
            {(id) => (
              <Input
                id={id}
                maxLength={200}
                placeholder="e.g. Pallet damaged at drop-off"
                value={draft.title ?? ""}
                onChange={(event) => change("title", event.target.value)}
              />
            )}
          </DispatchField>
        )}
        <DispatchField label="Severity">
          {() => (
            <DashboardSegmented
              label="Severity"
              value={draft.severity ?? "medium"}
              options={SEVERITIES}
              onChange={(value) => change("severity", value)}
            />
          )}
        </DispatchField>
        <DispatchField label="Owner (optional)">
          {(id) => (
            <RecordMemberInput
              id={id}
              field={OWNER_FIELD}
              members={members}
              value={draft.ownerId ?? ""}
              onChange={(value) => change("ownerId", nonEmpty(value))}
            />
          )}
        </DispatchField>
        <DispatchField label="Note (optional)">
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              maxLength={2000}
              placeholder="What happened"
              value={draft.note ?? ""}
              onChange={(event) => change("note", event.target.value)}
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
          Raise exception
        </Button>
      </DialogFooter>
    </form>
  );
}
