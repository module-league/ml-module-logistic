import { useCallback, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "@moduleleague/ui";
import { errorParser } from "@/hooks/useErrorParser";
import { SettingsField } from "@/module/dashboard/settings/DashboardControls";
import { tableFields } from "@/module/dashboard/moduleDashboard.utils";
import { RoleSelect } from "../Exception/ExceptionRulesDialog";
import { gateName, stepLabel, typeTitle } from "./document.utils";
import type { DocumentData } from "./useDocumentData";

/** The fields the checklist reads, and the requirements from the API's workflow config. */
export function DocumentRulesDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DocumentData;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-10 pb-3">
          <DialogTitle>Document rules</DialogTitle>
          <DialogDescription>
            Requirements live in the API&apos;s workflow config (Documents in
            appsettings); the fields they read are set here.
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
  data: DocumentData;
  onOpenChange: (open: boolean) => void;
}) {
  const { lookups, sources, rules, documentSettings, onSaveSettings } = data;
  const [draft, setDraft] = useState<Partial<IDocumentSettingsInput>>(() => ({
    incotermFieldId: documentSettings?.incotermFieldId,
    attachmentFieldId: documentSettings?.attachmentFieldId,
  }));
  const [saving, setSaving] = useState(false);
  const fields = useMemo(
    () =>
      tableFields(lookups?.[sources?.shipmentSidebarId ?? ""]).filter(
        (field) => !field?.isSystemField,
      ),
    [lookups, sources?.shipmentSidebarId],
  );
  const mode = useMemo(
    () => fields.find((field) => field.objId === documentSettings?.modeFieldId),
    [fields, documentSettings?.modeFieldId],
  );

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await onSaveSettings({
        ...draft,
        versionNo: documentSettings?.versionNo ?? 0,
      });
      toast.success("Document fields saved");
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't save the document fields", {
        description: errorParser(error)?.message,
      });
    } finally {
      setSaving(false);
    }
  }, [draft, documentSettings, onSaveSettings, onOpenChange]);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Fields the checklist reads</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <SettingsField label="Mode" hint="Picks the transport papers">
              <span className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                {mode?.name ?? "Pick it in Exceptions › Rules"}
              </span>
            </SettingsField>
            <RoleSelect
              label="Incoterm"
              hint="e.g. certificate of origin"
              fields={fields}
              accepts={(field) => field.type === "single_select"}
              value={draft.incotermFieldId}
              onChange={(incotermFieldId) =>
                setDraft((current) => ({ ...current, incotermFieldId }))
              }
            />
            <RoleSelect
              label="Attachments"
              hint="Files waiting to be classified"
              fields={fields}
              accepts={(field) => field.type === "attachment"}
              value={draft.attachmentFieldId}
              onChange={(attachmentFieldId) =>
                setDraft((current) => ({ ...current, attachmentFieldId }))
              }
            />
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Requirements</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[40rem] text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {[
                    "Document",
                    "When",
                    "On the checklist from",
                    "Gates",
                    "Generate",
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-2 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules?.requirements?.map((requirement) => (
                  <tr key={requirement.key} className="border-t align-top">
                    <td className="px-3 py-2 font-medium">
                      {typeTitle(rules, requirement.docType)}
                    </td>
                    <td className="px-3 py-2">{requirement.when}</td>
                    <td className="px-3 py-2">
                      {stepLabel(requirement.requiredAtStep)}
                    </td>
                    <td className="px-3 py-2">
                      {requirement.blocks
                        ? `Can't reach ${gateName(requirement.blocks)} until verified`
                        : "Nothing"}
                    </td>
                    <td className="px-3 py-2">
                      {requirement.canGenerate ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Only verified papers count. A missing pickup paper opens a Missing
            document exception; an unverified proof of delivery opens POD not
            verified.
          </p>
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
