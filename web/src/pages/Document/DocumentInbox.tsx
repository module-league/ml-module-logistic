import { useCallback, useMemo, useState, type DragEvent } from "react";
import { Sparkles, Upload } from "lucide-react";
import {
  Button,
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@moduleleague/ui";
import { attempt } from "@/lib/toastHelper";
import { AttachmentThumbnail } from "@/components/custom/AttachmentThumbnail";
import { AttachmentPreviewDialog } from "@/components/custom/AttachmentPreviewDialog";
import { useAttachmentPreview } from "@/hooks/useAttachmentPreview";
import { formatFileSize } from "@/lib/attachmentHelper";
import { tableFields } from "@/module/dashboard/moduleDashboard.utils";
import { checkSize, typeTitle, type DocumentRow } from "./document.utils";
import type { DocumentData } from "./useDocumentData";

/** The selected shipment's unclassified files beside a drop zone that adds more to its attachment field. */
export function DocumentInbox({
  row,
  data,
  onOpenRules,
}: {
  row: DocumentRow;
  data: DocumentData;
  onOpenRules: () => void;
}) {
  const { lookups, sources, documentSettings } = data;
  const fieldName = useMemo(
    () =>
      tableFields(lookups[sources?.shipmentSidebarId ?? ""]).find(
        (field) => field.objId === documentSettings?.attachmentFieldId,
      )?.name,
    [lookups, sources?.shipmentSidebarId, documentSettings?.attachmentFieldId],
  );
  return (
    <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <UnclassifiedFiles row={row} data={data} fieldName={fieldName} />
      <DropZone
        row={row}
        data={data}
        fieldName={fieldName}
        onOpenRules={onOpenRules}
      />
    </div>
  );
}

function UnclassifiedFiles({
  row,
  data,
  fieldName,
}: {
  row: DocumentRow;
  data: DocumentData;
  fieldName?: string;
}) {
  const { checklist, shipment } = row;
  const { rules, isSaving, onFile } = data;
  const { openPreview, dialogProps } = useAttachmentPreview();
  const files = useMemo(
    () => checklist.unclassified.map((entry) => entry.file),
    [checklist.unclassified],
  );
  const choices = useMemo(
    () => [
      ...(rules?.types ?? []).map((type) => ({
        value: type.docType,
        label: type.title,
      })),
      { value: "other", label: "Other" },
    ],
    [rules?.types],
  );
  const classify = useCallback(
    (file: IAttachment, docType: string) =>
      attempt("Couldn't classify the file", async () => {
        await onFile({
          shipmentId: shipment.id,
          docType,
          attachmentId: file.id,
        });
        toast.success(`${file.name} filed as ${typeTitle(rules, docType)}`);
      }),
    [onFile, shipment.id, rules],
  );

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-background p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold">Unclassified attachments</h2>
        <p className="text-xs text-muted-foreground">
          From the {fieldName ?? "shipment's attachment"} field and checkpoint
          logs. Classify them to tick off the checklist.
        </p>
      </div>
      {checklist.unclassified.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {checklist.unclassified.map((entry, index) => (
            <li
              key={entry.file.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-2"
            >
              <button
                type="button"
                onClick={() => openPreview(files, index)}
                aria-label={`Preview ${entry.file.name}`}
                className="flex size-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md bg-muted"
              >
                <AttachmentThumbnail
                  attachment={entry.file}
                  className="size-full object-cover"
                />
              </button>
              <span className="flex min-w-40 flex-1 basis-40 flex-col">
                <span
                  className="truncate text-sm font-medium"
                  title={entry.file.name}
                >
                  {entry.file.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {[
                    entry.file.fileExtension.toUpperCase(),
                    formatFileSize(entry.file.fileSize),
                    entry.origin === "checkpoint"
                      ? "checkpoint log"
                      : undefined,
                    entry.label != null &&
                      entry.label !== "" &&
                      `labelled ${entry.label}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                {entry.suggestedDocType != null &&
                  entry.suggestedDocType !== "" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      startIcon={<Sparkles size={14} />}
                      disabled={isSaving}
                      title="Suggested from its name or label"
                      onClick={() =>
                        void classify(entry.file, entry.suggestedDocType ?? "")
                      }
                    >
                      {typeTitle(rules, entry.suggestedDocType)}
                    </Button>
                  )}
                <Select
                  value=""
                  disabled={isSaving}
                  onValueChange={(docType) =>
                    void classify(entry.file, docType)
                  }
                >
                  <SelectTrigger
                    className="h-8 w-36"
                    aria-label={`Classify ${entry.file.name}`}
                  >
                    <SelectValue placeholder="Classify as…" />
                  </SelectTrigger>
                  <SelectContent position="popper" align="end">
                    {choices.map((choice) => (
                      <SelectItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Nothing to classify.
        </p>
      )}
      <AttachmentPreviewDialog {...dialogProps} />
    </section>
  );
}

/** Drop or pick files; they go into the shipment's attachment field and show up unclassified with a suggested type. */
function DropZone({
  row,
  data,
  fieldName,
  onOpenRules,
}: {
  row: DocumentRow;
  data: DocumentData;
  fieldName?: string;
  onOpenRules: () => void;
}) {
  const { shipment } = row;
  const { onDrop, isSaving } = data;
  const [dragging, setDragging] = useState(false);
  const ready = fieldName != null && fieldName !== "";
  const add = useCallback(
    (list?: FileList | null) => {
      const files = [...(list ?? [])].filter(checkSize);
      const [first, ...others] = files;
      if (!first) return;
      void attempt("Couldn't add the files", async () => {
        await onDrop(shipment.id, files);
        const what = others.length > 0 ? `${files.length} files` : first.name;
        toast.success(`${what} added to ${shipment.title}`);
      });
    },
    [onDrop, shipment.id, shipment.title],
  );
  const dragOver = useCallback(
    (event: DragEvent) => {
      if (!ready) return;
      event.preventDefault();
      setDragging(true);
    },
    [ready],
  );

  if (!ready) {
    return (
      <section className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center">
        <Upload className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Pick the shipment&apos;s attachment field to drop files here.
        </p>
        <Button variant="outline" size="sm" onClick={onOpenRules}>
          Open rules
        </Button>
      </section>
    );
  }
  return (
    <label
      onDragOver={dragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        add(event.dataTransfer.files);
      }}
      className={cn(
        "flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary-10/40 p-6 text-center transition-colors hover:border-primary/60 focus-within:ring-2 focus-within:ring-ring",
        dragging && "border-primary bg-primary-10",
        isSaving && "pointer-events-none opacity-60",
      )}
    >
      <Upload className="size-5 text-primary" />
      <span className="text-sm font-semibold text-primary">
        Drop files for {shipment.title}
      </span>
      <span className="text-xs text-muted-foreground">
        PDF, JPG or PNG. We&apos;ll suggest a document type from the file.
      </span>
      <input
        type="file"
        multiple
        accept="application/pdf,image/png,image/jpeg"
        className="sr-only"
        onChange={(event) => {
          add(event.target.files);
          event.target.value = "";
        }}
      />
    </label>
  );
}
