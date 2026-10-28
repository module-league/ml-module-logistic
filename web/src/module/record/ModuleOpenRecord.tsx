import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  toast,
} from "@moduleleague/ui";
import { errorParser } from "@/hooks/useErrorParser";
import { QueryWrapper } from "@/components/custom/QueryWrapper";
import { ModuleRecordForm } from "./ModuleRecordForm";
import { ModuleLookupPreview } from "./ModuleLookupPreview";
import { ModuleAutoSaveStatus } from "./ModuleAutoSaveStatus";
import { useAutoSave } from "../../hooks/useAutoSave";
import { RECORD_DIALOG_STYLE } from "./moduleRecord.utils";
import type { ModuleOpenRecordProps } from "./moduleRecord.types";

export function ModuleOpenRecord({
  recordKey,
  onClose,
  fields,
  members,
  onUploadAttachment,
  record,
  previousKey,
  nextKey,
  onNavigate,
  isLoading = false,
  error,
  onRetry,
  onSave,
}: ModuleOpenRecordProps) {
  const save = useCallback(
    async (values: ISidebarRecordValues) => {
      try {
        await onSave?.(values);
      } catch (err: unknown) {
        toast.error("Couldn't save record", {
          description: errorParser(err)?.message,
        });
        throw err;
      }
    },
    [onSave],
  );
  const { status, schedule, flush } = useAutoSave(save);
  const [draft, setDraft] = useState<{
    recordId?: string;
    values: ISidebarRecordValues;
  }>();
  const [previewFieldId, setPreviewFieldId] = useState<string>();
  const recordId = record?.objId;
  const changeValues = useCallback(
    (values: ISidebarRecordValues) => {
      setDraft({ recordId, values });
      schedule(values);
    },
    [recordId, schedule],
  );
  const liveValues =
    draft?.recordId === recordId ? draft?.values : record?.values;
  const previewField = useMemo(
    () =>
      fields.find(
        (field) =>
          field.objId === previewFieldId &&
          field.lookupSettings?.previewEnabled !== false,
      ),
    [fields, previewFieldId],
  );
  const togglePreview = useCallback(
    (field: ISidebarField) =>
      setPreviewFieldId((current) =>
        current === field.objId ? undefined : field.objId,
      ),
    [],
  );
  const dialogStyle = useMemo(
    () =>
      previewField
        ? { ...RECORD_DIALOG_STYLE, maxWidth: "85%" }
        : RECORD_DIALOG_STYLE,
    [previewField],
  );
  const changeOpen = useCallback(
    (next: boolean) => {
      if (next) return;
      void flush();
      setPreviewFieldId(undefined);
      onClose();
    },
    [flush, onClose],
  );
  const navigate = useCallback(
    (key?: string) => {
      if (key == null || key === "" || !onNavigate) return;
      void flush().then(() => onNavigate(key));
    },
    [flush, onNavigate],
  );

  return (
    <Dialog
      open={recordKey != null && recordKey !== ""}
      onOpenChange={changeOpen}
    >
      <DialogContent
        overlayClassName="supports-backdrop-filter:backdrop-blur-none"
        className="flex flex-col gap-0 p-0 rounded-md"
        style={dialogStyle}
      >
        <DialogHeader
          className="shrink-0 flex-row items-center gap-2 p-4 pr-10 pb-3 border-b"
          style={{ height: "56.89px" }}
        >
          {onNavigate && (
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous record"
                title="Previous record"
                disabled={previousKey == null || previousKey === ""}
                className="text-black"
                startIcon={<ChevronLeft size={13} />}
                onClick={() => navigate(previousKey)}
              ></Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next record"
                title="Next record"
                disabled={nextKey == null || nextKey === ""}
                className="text-black"
                startIcon={<ChevronRight size={13} />}
                onClick={() => navigate(nextKey)}
              ></Button>
            </div>
          )}
          <DialogTitle className="flex min-w-0 flex-1 items-center gap-3">
            {/* <span className="truncate">{title}</span> */}
            <ModuleAutoSaveStatus status={status} />
          </DialogTitle>
        </DialogHeader>
        <QueryWrapper isLoading={isLoading} error={error} onRetry={onRetry}>
          {record ? (
            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                <ModuleRecordForm
                  key={record.objId}
                  fields={fields}
                  members={members}
                  onUploadAttachment={onUploadAttachment}
                  values={record.values}
                  readOnly={!onSave}
                  onValuesChange={onSave ? changeValues : undefined}
                  onPreviewLookup={togglePreview}
                  previewFieldId={previewField?.objId}
                />
              </div>
              {previewField && (
                <ModuleLookupPreview
                  field={previewField}
                  value={
                    liveValues?.[previewField.lookupSettings?.linkFieldId ?? ""]
                  }
                  members={members}
                />
              )}
            </div>
          ) : (
            <p className="m-auto text-sm text-muted-foreground">
              This record isn't available.
            </p>
          )}
        </QueryWrapper>
      </DialogContent>
    </Dialog>
  );
}
