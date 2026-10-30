import { useCallback, useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
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
    <section className="flex flex-col gap-2">
      <h3 className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
        Add documents
        <span className="text-xs font-normal text-muted-foreground">
          Drop files, then choose what each one is to tick off the checklist.
        </span>
      </h3>
      {/* The whole box takes a drop, not only the add row */}
      <div
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
        className={cn(
          "rounded-xl border bg-muted/40 p-1 transition-colors",
          dragging && "border-primary bg-primary-10",
        )}
      >
        <ul className="flex flex-col divide-y overflow-hidden rounded-lg bg-background shadow-xs">
          {unclassified.map((entry, index) => (
            <li
              key={entry.file?.id ?? index}
              className="flex flex-wrap items-center gap-3 p-3"
            >
              <button
                type="button"
                onClick={() => openPreview(files, index)}
                aria-label={`Preview ${entry.file?.name ?? "file"}`}
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-muted/40 transition-colors hover:border-primary"
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
          <li>
            {isReady ? (
              <label
                className={cn(
                  "group/add flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-muted/40 focus-within:ring-2 focus-within:ring-ring focus-within:ring-inset",
                  isSaving && "pointer-events-none opacity-60",
                )}
              >
                <AddTile isActive={dragging} />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">Add documents</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {dragging
                      ? `Drop to add them to ${shipment.title}`
                      : "Drop files here or click to browse · PDF, JPG or PNG"}
                  </span>
                </span>
                <input
                  type="file"
                  multiple
                  accept={ACCEPT}
                  className="sr-only"
                  onChange={(event) => {
                    add(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
            ) : (
              <div className="flex items-center gap-3 p-3">
                <AddTile isActive={false} />
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
          </li>
        </ul>
      </div>
      <AttachmentPreviewDialog {...dialogProps} />
    </section>
  );
}

/** The "+" box at the start of the add row; it lights up while files are dragged over. */
function AddTile({ isActive }: { isActive: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg border text-muted-foreground transition-colors group-hover/add:border-primary group-hover/add:text-primary",
        isActive && "border-primary bg-primary-10 text-primary",
      )}
    >
      <Plus className="size-4" />
    </span>
  );
}
