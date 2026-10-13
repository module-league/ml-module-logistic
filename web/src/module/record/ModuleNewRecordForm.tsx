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
import QueryWrapper from "@/components/custom/QueryWrapper";
import { RecordInputControl } from "../../components/custom/RecordInputControl";
import type {
  ModuleNewRecordFormProps,
  ModuleRecordFormProps,
  ModuleRecordFormValues,
} from "./moduleRecord.types";

const DIALOG_STYLE = {
  width: "100%",
  maxWidth: "60%",
  height: "80%",
  marginTop: "3%",
};

export function ModuleNewRecordForm({
  open,
  onOpenChange,
  fields,
  isLoading = false,
  error,
  onRetry,
  onSave,
}: ModuleNewRecordFormProps) {
  const [saving, setSaving] = useState(false);
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const changeOpen = useCallback(
    (next: boolean) => {
      if (!saving) onOpenChange(next);
    },
    [saving, onOpenChange],
  );
  const save = useCallback(
    async (values: ISidebarRecordValues) => {
      setSaving(true);
      try {
        await onSave(values);
        onOpenChange(false);
      } catch (err) {
        toast.error("Couldn't add record", {
          description: errorParser(err)?.message,
        });
      } finally {
        setSaving(false);
      }
    },
    [onSave, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent
        aria-describedby={undefined}
        overlayClassName="supports-backdrop-filter:backdrop-blur-none"
        className="flex flex-col gap-0 p-0 rounded-md"
        style={DIALOG_STYLE}
      >
        <DialogHeader className="shrink-0 p-4 pr-10 pb-3 border-b">
          <DialogTitle>New record</DialogTitle>
        </DialogHeader>
        <QueryWrapper isLoading={isLoading} error={error} onRetry={onRetry}>
          <NewRecordFields
            fields={fields}
            saving={saving}
            onCancel={close}
            onSave={save}
          />
        </QueryWrapper>
      </DialogContent>
    </Dialog>
  );
}

function NewRecordFields({
  fields,
  saving,
  onCancel,
  onSave,
}: ModuleRecordFormProps) {
  const defaultValues = useMemo<ModuleRecordFormValues>(
    () => ({ values: fields?.map(() => "") ?? [] }),
    [fields],
  );
  const form = useForm<ModuleRecordFormValues>({ defaultValues });
  const submit = useCallback(
    (data: ModuleRecordFormValues) => {
      if (saving) return;
      onSave(
        Object.fromEntries(
          fields?.map((field, i) => [field?.objId, data?.values?.[i] ?? ""]) ??
            [],
        ),
      );
    },
    [saving, onSave, fields],
  );

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
              label={field?.name}
              labelProps={{ size: "sm" }}
              className="grid grid-cols-[minmax(0,12rem)_1fr] items-center gap-x-4"
              render={({ field: input }) => (
                <RecordInputControl
                  field={field}
                  name={input.name}
                  value={input.value ?? ""}
                  disabled={saving}
                  onChange={input.onChange}
                  onBlur={input.onBlur}
                  className="w-full"
                />
              )}
            />
          ))}
        </div>
        <DialogFooter className="m-0 shrink-0">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Adding…" : "Add record"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
