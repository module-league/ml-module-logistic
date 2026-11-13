import { useCallback, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
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
import { nonEmpty } from "@/lib/stringHelper";
import { tableFields } from "@/module/dashboard/moduleDashboard.utils";
import { checkSize, typeTitle, type DocumentRow } from "./document.utils";
import type { DocumentData } from "./useDocumentData";

const ACCEPT = "application/pdf,image/png,image/jpeg";

/**
 * Adding papers to the selected shipment: one list of the files still to classify, ending in a row to drop or pick more.
 * Dropped files land in the shipment's attachment field; choosing what each one is moves it onto the checklist.
 */
export function DocumentInbox({
  row,
  data,
  onOpenRules,
}: {
  row: DocumentRow;
  data: DocumentData;
  onOpenRules: () => void;
}) {
  const { checklist, shipment } = row;
  const {
    lookups,
    sources,
    documentSettings,
    rules,
    isSaving,
    onFile,
    onDrop,
  } = data;
  const { openPreview, dialogProps } = useAttachmentPreview();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldName = useMemo(
    () =>
      tableFields(lookups[sources?.shipmentSidebarId ?? ""]).find(
        (field) => field.objId === documentSettings?.attachmentFieldId,
      )?.name,
    [lookups, sources?.shipmentSidebarId, documentSettings?.attachmentFieldId],
  );
  const isReady = nonEmpty(fieldName) !== undefined;
  const unclassified = useMemo(
    () => checklist.unclassified ?? [],
    [checklist.unclassified],
  );
  const files = useMemo(
    () => unclassified.map((entry) => entry.file),
    [unclassified],
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

  const add = useCallback(
    (list?: FileList | null) => {
      const picked = [...(list ?? [])].filter(checkSize);
      const [first, ...others] = picked;
      if (!first) return;
      void attempt("Couldn't add the files", async () => {
        await onDrop(shipment.id, picked);
        const what = others.length > 0 ? `${picked.length} files` : first.name;
        toast.success(`${what} added. Choose what each one is.`);
      });
    },
    [onDrop, shipment.id],
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
    // Pinned under the checklist, and the whole strip takes a drop, not only the add row
    <section
      aria-label="Add documents"
      onDragOver={(event) => {
        if (!isReady || isSaving) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        if (!isReady) return;
        event.preventDefault();
        setDragging(false);
        add(event.dataTransfer.files);
      }}
      className="flex flex-col gap-2 border-t bg-background px-6 py-3"
    >
      {unclassified.length > 0 && (
        <h3 className="flex flex-wrap items-baseline gap-x-1.5 text-sm font-medium">
          Choose what each file is
          <span className="text-muted-foreground tabular-nums">
            {unclassified.length}
          </span>
        </h3>
      )}
      {unclassified.length > 0 && (
        // Three 52px rows, two dividers and the border make 160px, so a fourth file starts the scroll
        <ul className="flex max-h-40 flex-col divide-y overflow-y-auto rounded-lg border">
          {unclassified.map((entry, index) => (
            <li
              key={entry.file?.id ?? index}
              className="flex flex-wrap items-center gap-3 px-3 py-2"
            >
              <button
                type="button"
                onClick={() => openPreview(files, index)}
                aria-label={`Preview ${entry.file?.name ?? "file"}`}
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-muted/40 transition-colors hover:border-primary"
              >
                <AttachmentThumbnail
                  attachment={entry.file}
                  className="size-full object-cover"
                />
              </button>
              <span className="flex min-w-40 flex-1 basis-40 flex-col">
                <span
                  className="truncate text-sm font-medium"
                  title={entry.file?.name ?? ""}
                >
                  {entry.file?.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {[
                    nonEmpty(entry.file?.fileExtension?.toUpperCase()),
                    formatFileSize(entry.file?.fileSize ?? 0),
                    entry.origin === "checkpoint"
                      ? "from a checkpoint log"
                      : `from ${fieldName ?? "the shipment's attachments"}`,
                    nonEmpty(entry.label) !== undefined &&
                      `labelled ${entry.label}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-2">
                {nonEmpty(entry.suggestedDocType) !== undefined && (
                  <Button
                    variant="secondary"
                    size="xs"
                    startIcon={<Sparkles size={13} />}
                    disabled={isSaving}
                    title="Suggested from its name or label; click to file it as this"
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
                    className="h-6 w-36 text-xs"
                    aria-label={`Classify ${entry.file?.name ?? "file"}`}
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
      )}
      {isReady ? (
        // The whole box opens the file picker; the button's click lands here too, so it opens once
        <div
          role="presentation"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3 py-2.5 transition-colors hover:border-primary hover:bg-primary-10",
            dragging && "border-primary bg-primary-10",
            isSaving && "pointer-events-none opacity-60",
          )}
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-medium">
              {dragging
                ? `Drop to add them to ${shipment.title}`
                : "Drop files here, or click to browse"}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              PDF, JPG or PNG · then choose what each one is to tick it off
            </span>
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            hidden
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              add(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-dashed px-3 py-2.5">
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-medium text-muted-foreground">
              Add documents
            </span>
            <span className="text-xs text-muted-foreground">
              Choose the shipment&apos;s attachment field first.{" "}
              <button
                type="button"
                onClick={onOpenRules}
                className="cursor-pointer text-primary underline-offset-2 hover:underline"
              >
                Open rules
              </button>
            </span>
          </span>
        </div>
      )}
      <AttachmentPreviewDialog {...dialogProps} />
    </section>
  );
}
