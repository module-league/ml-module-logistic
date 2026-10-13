import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormField2,
  toast,
} from "@moduleleague/ui";
import { errorParser } from "@/hooks/useErrorParser";
import { RecordInputControl } from "@/components/custom/RecordInputControl";
import type {
  ModuleOpenRecordFormProps,
  ModuleOpenRecordProps,
  ModuleRecordFormValues,
  ModuleRecordValues,
} from "../../services/modules/moduleOpenRecord.types";

/**
 * Dialog for one record: a blank form to add a new record, or an existing row opened from the table.
 * One control per field, by the field's type.
 */
export function ModuleNewRecordForm({
  target,
  onClose,
  fields,
  values,
  onSave,
}: ModuleOpenRecordProps) {
  const [saving, setSaving] = useState(false);
  const changeOpen = useCallback(
    (open: boolean) => {
      if (!open && !saving) onClose();
    },
    [saving, onClose],
  );
  const save = useCallback(
    async (draft: ModuleRecordValues) => {
      if (!target || !onSave) return;
      setSaving(true);
      try {
        await onSave(draft, target);
        onClose();
      } catch (error) {
        toast.error("Couldn't save record", {
          description: errorParser(error)?.message,
        });
      } finally {
        setSaving(false);
      }
    },
    [target, onSave, onClose],
  );

  return (
    <Dialog open={!!target} onOpenChange={changeOpen}>
      <DialogContent
        overlayClassName="supports-backdrop-filter:backdrop-blur-none"
        className="flex flex-col gap-0 p-0 rounded-md"
        style={{
          width: "100%",
          maxWidth: "60%",
          height: "80%",
          marginTop: "3%",
        }}
      >
        {target && (
          <RecordForm
            target={target}
            fields={fields}
            values={values}
            saving={saving}
            onCancel={onClose}
            onSave={onSave ? save : undefined}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RecordForm({
  target,
  fields,
  values,
  saving,
  onCancel,
  onSave,
}: ModuleOpenRecordFormProps) {
  const defaultValues = useMemo<ModuleRecordFormValues>(
    () => ({ values: fields?.map(({ key }) => values?.[key] ?? "") ?? [] }),
    [fields, values],
  );
  const form = useForm<ModuleRecordFormValues>({ defaultValues });
  const isNew = target.mode === "new";
  const readOnly = !onSave;
  const submit = useCallback(
    (data: ModuleRecordFormValues) => {
      if (saving) return;
      onSave?.(
        Object.fromEntries(
          fields?.map(({ key }, index) => [key, data?.values?.[index] ?? ""]) ??
            [],
        ),
      );
    },
    [saving, onSave, fields],
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <DialogHeader className="shrink-0 p-4 pr-10 pb-3 border-b">
          <DialogTitle>{isNew ? "New record" : "Record"}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-8">
          {fields?.length ? (
            fields.map(({ key, field }, index) => (
              <FormField2
                key={key}
                control={form.control}
                name={`values.${index}`}
                label={field?.name}
                labelProps={{ size: "sm" }}
                className="grid grid-cols-[minmax(0,12rem)_1fr] items-center gap-x-4"
                render={({ field: input }) => (
                  <RecordInputControl
                    field={field}
                    name={input.name}
                    value={input.value ?? ""}
                    disabled={readOnly || saving}
                    onChange={input.onChange}
                    onBlur={input.onBlur}
                    className="w-full"
                  />
                )}
              />
            ))
          ) : (
            <p className="m-auto max-w-64 text-center text-sm text-muted-foreground">
              No fields yet. Add fields from the Fields menu to fill in records.
            </p>
          )}
        </div>

        <DialogFooter className="m-0 shrink-0">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button
              type="submit"
              size="sm"
              disabled={saving || !fields?.length}
            >
              {saving ? "Saving…" : isNew ? "Add record" : "Save changes"}
            </Button>
          )}
        </DialogFooter>
      </form>
    </Form>
  );
}
