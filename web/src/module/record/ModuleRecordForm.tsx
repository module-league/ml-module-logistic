import { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  Button,
  DialogFooter,
  FieldTypeIcon,
  Form,
  FormField2,
} from "@moduleleague/ui";
import { RecordInputControl } from "@/components/custom/RecordInputControl";
import type {
  ModuleRecordFormProps,
  ModuleRecordFormValues,
} from "./moduleRecord.types";

export function ModuleRecordForm({
  fields,
  members,
  onUploadAttachment,
  values,
  saving = false,
  readOnly = false,
  submitLabel = "Save",
  savingLabel = "Saving…",
  onCancel,
  onSave,
  onValuesChange,
}: ModuleRecordFormProps) {
  const defaultValues = useMemo<ModuleRecordFormValues>(
    () => ({
      values: fields?.map((field) => values?.[field?.objId] ?? "") ?? [],
    }),
    [fields, values],
  );
  const form = useForm<ModuleRecordFormValues>({ defaultValues });
  const toRecordValues = useCallback(
    (data: ModuleRecordFormValues): ISidebarRecordValues =>
      Object.fromEntries(
        fields?.map((field, i) => [field?.objId, data?.values?.[i] ?? ""]) ??
          [],
      ),
    [fields],
  );
  const submit = useCallback(
    (data: ModuleRecordFormValues) => {
      if (saving || readOnly) return;
      onSave?.(toRecordValues(data));
    },
    [saving, readOnly, onSave, toRecordValues],
  );
  const emitChange = useCallback(
    () => onValuesChange?.(toRecordValues(form.getValues())),
    [onValuesChange, toRecordValues, form],
  );
  const unchanged = !!values && !form.formState.isDirty;

  if (!fields?.length) {
    return (
      <p className="m-auto max-w-64 text-center text-sm text-muted-foreground">
        No fields yet. Add fields from the Fields menu to fill in records.
      </p>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-8">
          {fields.map((field, index) => (
            <FormField2
              key={field.objId}
              control={form.control}
              name={`values.${index}`}
              label={
                <span className="flex min-w-0 items-center gap-1.5">
                  <FieldTypeIcon type={field?.type} />
                  <span className="truncate">{field?.name}</span>
                </span>
              }
              labelProps={{ size: "sm" }}
              className="grid grid-cols-[minmax(0,12rem)_1fr] items-center gap-x-4"
              render={({ field: input }) => (
                <RecordInputControl
                  field={field}
                  members={members}
                  onUploadAttachment={onUploadAttachment}
                  name={input.name}
                  value={input.value ?? ""}
                  disabled={saving || readOnly}
                  onChange={(next) => {
                    input.onChange(next);
                    emitChange();
                  }}
                  onBlur={input.onBlur}
                  className="w-full"
                />
              )}
            />
          ))}
        </div>
        {onSave && !readOnly && (
          <DialogFooter className="m-0 shrink-0">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving || unchanged}>
              {saving ? savingLabel : submitLabel}
            </Button>
          </DialogFooter>
        )}
      </form>
    </Form>
  );
}
