import { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@moduleleague/ui";
import { QueryWrapper } from "@/components/custom/QueryWrapper";
import { ModuleRecordForm } from "./ModuleRecordForm";
import { RECORD_DIALOG_STYLE } from "./moduleRecord.utils";
import { useNewRecordSave } from "./useNewRecordSave";
import type { ModuleNewRecordProps } from "./moduleRecord.types";

/** Adds a record with every field of its sidebar. */
export function ModuleNewRecord({
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
}: ModuleNewRecordProps) {
  const { saving, save, changeOpen } = useNewRecordSave(onSave, onOpenChange);
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent
        {...((description == null || description === "") && {
          "aria-describedby": undefined,
        })}
        overlayClassName="supports-backdrop-filter:backdrop-blur-none"
        className="flex flex-col gap-0 p-0 rounded-md"
        style={RECORD_DIALOG_STYLE}
      >
        <DialogHeader className="shrink-0 p-4 pr-10 pb-3 border-b">
          <DialogTitle>{title}</DialogTitle>
          {description != null && description !== "" && (
            <DialogDescription>{description}</DialogDescription>
          )}
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
            onSave={(values) => void save(values)}
          />
        </QueryWrapper>
      </DialogContent>
    </Dialog>
  );
}
