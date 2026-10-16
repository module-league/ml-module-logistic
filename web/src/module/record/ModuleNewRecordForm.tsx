import { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  toast,
} from "@moduleleague/ui";
import { errorParser } from "@/hooks/useErrorParser";
import QueryWrapper from "@/components/custom/QueryWrapper";
import { ModuleRecordForm } from "./ModuleRecordForm";
import { RECORD_DIALOG_STYLE } from "./moduleRecord.utils";
import type { ModuleNewRecordFormProps } from "./moduleRecord.types";

export function ModuleNewRecordForm({
  open,
  onOpenChange,
  title = "New record",
  description,
  fields,
  form,
  members,
  onUploadAttachment,
  isLoading = false,
  error,
  onRetry,
  onSave,
}: ModuleNewRecordFormProps) {
  const [saving, setSaving] = useState(false);
  // A form shows its own fields in its order; without one every field shows
  const layout = useMemo(() => {
    if (!form) return { fields };
    const fieldById = new Map(fields?.map((field) => [field?.objId, field]));
    const items = form.fields?.filter((item) => fieldById.has(item?.fieldId));
    return {
      fields: items?.flatMap((item) => fieldById.get(item.fieldId) ?? []),
      initialValues: Object.fromEntries(
        items?.flatMap((item) =>
          item?.defaultValue ? [[item.fieldId, item.defaultValue]] : [],
        ) ?? [],
      ),
      placeholders: Object.fromEntries(
        items?.flatMap((item) =>
          item?.placeholder ? [[item.fieldId, item.placeholder]] : [],
        ) ?? [],
      ),
    };
  }, [form, fields]);
  const heading = form?.formTitle || title;
  const subheading = form ? form.formDescription : description;
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
        {...(!subheading && { "aria-describedby": undefined })}
        overlayClassName="supports-backdrop-filter:backdrop-blur-none"
        className="flex flex-col gap-0 p-0 rounded-md"
        style={RECORD_DIALOG_STYLE}
      >
        <DialogHeader className="shrink-0 p-4 pr-10 pb-3 border-b">
          <DialogTitle>{heading}</DialogTitle>
          {subheading && <DialogDescription>{subheading}</DialogDescription>}
        </DialogHeader>
        <QueryWrapper isLoading={isLoading} error={error} onRetry={onRetry}>
          <ModuleRecordForm
            key={form?.objId}
            {...layout}
            members={members}
            onUploadAttachment={onUploadAttachment}
            saving={saving}
            submitLabel={form?.submitLabel || "Add record"}
            savingLabel="Adding…"
            onCancel={close}
            onSave={save}
          />
        </QueryWrapper>
      </DialogContent>
    </Dialog>
  );
}
