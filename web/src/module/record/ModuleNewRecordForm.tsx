import { useCallback, useState } from "react";
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
  members,
  onUploadAttachment,
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
        {...(!description && { "aria-describedby": undefined })}
        overlayClassName="supports-backdrop-filter:backdrop-blur-none"
        className="flex flex-col gap-0 p-0 rounded-md"
        style={RECORD_DIALOG_STYLE}
      >
        <DialogHeader className="shrink-0 p-4 pr-10 pb-3 border-b">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <QueryWrapper isLoading={isLoading} error={error} onRetry={onRetry}>
          <ModuleRecordForm
            fields={fields}
            members={members}
            onUploadAttachment={onUploadAttachment}
            saving={saving}
            submitLabel="Add record"
            savingLabel="Adding…"
            onCancel={close}
            onSave={save}
          />
        </QueryWrapper>
      </DialogContent>
    </Dialog>
  );
}
