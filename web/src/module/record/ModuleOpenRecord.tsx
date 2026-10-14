import { useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  toast,
} from "@moduleleague/ui";
import { errorParser } from "@/hooks/useErrorParser";
import { dateToFriendlyLongString } from "@/lib/dateHelper";
import QueryWrapper from "@/components/custom/QueryWrapper";
import { ModuleRecordForm } from "./ModuleRecordForm";
import { ModuleAutoSaveStatus } from "./ModuleAutoSaveStatus";
import { useAutoSave } from "../../hooks/useAutoSave";
import { RECORD_DIALOG_STYLE, toRecordText } from "./moduleRecord.utils";
import type { ModuleOpenRecordProps } from "./moduleRecord.types";

export function ModuleOpenRecord({
  recordKey,
  onClose,
  fields,
  members,
  record,
  isLoading = false,
  error,
  onRetry,
  onSave,
}: ModuleOpenRecordProps) {
  const save = useCallback(
    async (values: ISidebarRecordValues) => {
      try {
        await onSave?.(values);
      } catch (err) {
        toast.error("Couldn't save record", {
          description: errorParser(err)?.message,
        });
        throw err;
      }
    },
    [onSave],
  );
  const { status, schedule, flush } = useAutoSave(save);
  const changeOpen = useCallback(
    (next: boolean) => {
      if (next) return;
      flush();
      onClose();
    },
    [flush, onClose],
  );
  const title = useMemo(() => {
    const first = fields?.[0];
    return (
      (first && toRecordText(first, record?.values?.[first.objId], members)) ||
      "Untitled record"
    );
  }, [fields, record, members]);

  return (
    <Dialog open={!!recordKey} onOpenChange={changeOpen}>
      <DialogContent
        overlayClassName="supports-backdrop-filter:backdrop-blur-none"
        className="flex flex-col gap-0 p-0 rounded-md"
        style={RECORD_DIALOG_STYLE}
      >
        <DialogHeader className="shrink-0 p-4 pr-10 pb-3 border-b">
          <DialogTitle className="flex min-w-0 items-center gap-3">
            <span className="truncate">{title}</span>
            <ModuleAutoSaveStatus status={status} />
          </DialogTitle>
        </DialogHeader>
        <QueryWrapper isLoading={isLoading} error={error} onRetry={onRetry}>
          {record ? (
            <ModuleRecordForm
              key={record.objId}
              fields={fields}
              members={members}
              values={record.values}
              readOnly={!onSave}
              onValuesChange={onSave ? schedule : undefined}
            />
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
