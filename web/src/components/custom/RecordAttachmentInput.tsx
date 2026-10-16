import { useCallback, useMemo, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { FileText, Tag, Trash2Icon, Upload, UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/sonner";
import { errorParser } from "@/hooks/useErrorParser";
import { ATTACHMENT_MAX_BYTES } from "@/services/attachments/attachment.api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  attachmentOption,
  bytesToKilobytes,
  formatFileSize,
  parseAttachments,
  toAttachmentValue,
} from "@/lib/attachmentHelper";
import { useAttachmentPreview } from "@/hooks/useAttachmentPreview";
import { AttachmentPreviewDialog } from "./AttachmentPreviewDialog";
import { AttachmentThumbnail } from "./AttachmentThumbnail";
import { SelectionNode } from "./RecordValueNode";
import type {
  AttachmentCardProps,
  AttachmentLabelSelectProps,
  RecordAttachmentInputProps,
} from "./RecordAttachmentInput.types";
import { Button } from "@/ui-kit";

type PendingUpload = Pick<IAttachment, "name" | "fileSize"> & { key: string };

/** Radix Select can't hold an empty value, so "No label" is this. */
const NO_LABEL = "__none";

/**
 * Files for an attachment field: drop anywhere on it, or use Attach File / the empty box, to upload; open one in the
 * viewer, or remove it. Uploading stays off while a batch uploads, so two batches can't overwrite each other's result.
 */
export function RecordAttachmentInput({
  id,
  value,
  disabled,
  className,
  style,
  onChange,
  onBlur,
  onUpload,
  options,
}: RecordAttachmentInputProps) {
  const attachments = useMemo(() => parseAttachments(value), [value]);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const { openPreview, dialogProps } = useAttachmentPreview();

  const upload = useCallback(
    async (files: File[]) => {
      if (!onUpload || !files?.length) return;
      setPending(
        files.map((file) => ({
          key: window.crypto.randomUUID(),
          name: file.name,
          fileSize: bytesToKilobytes(file.size),
        })),
      );
      const results = await Promise.allSettled(
        files.map((file) => onUpload(file)),
      );
      setPending([]);
      const uploaded = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      const failed = results.flatMap((result, index) =>
        result.status === "rejected"
          ? [{ file: files[index], reason: result.reason }]
          : [],
      );
      if (failed.length) {
        toast.error(
          `Couldn't upload ${failed.map(({ file }) => file.name).join(", ")}`,
          { description: errorParser(failed[0]?.reason)?.message },
        );
      }
      if (uploaded.length) {
        onChange?.(toAttachmentValue([...attachments, ...uploaded]));
      }
      onBlur?.();
    },
    [onUpload, onChange, onBlur, attachments],
  );
  const reject = useCallback((rejections: FileRejection[]) => {
    const tooLarge = rejections.filter(({ errors }) =>
      errors.some((error) => error.code === "file-too-large"),
    );
    toast.error(
      tooLarge.length
        ? `Files can be up to ${formatFileSize(bytesToKilobytes(ATTACHMENT_MAX_BYTES))}`
        : "Couldn't add these files",
      {
        description: rejections.map(({ file }) => file.name).join(", "),
      },
    );
  }, []);
  const remove = useCallback(
    (attachmentId: string) => {
      onChange?.(
        toAttachmentValue(
          attachments.filter((attachment) => attachment?.id !== attachmentId),
        ),
      );
      onBlur?.();
    },
    [attachments, onChange, onBlur],
  );

  const label = useCallback(
    (attachmentId: string, optionId?: string) => {
      onChange?.(
        toAttachmentValue(
          attachments.map((attachment) =>
            attachment?.id === attachmentId
              ? { ...attachment, optionId }
              : attachment,
          ),
        ),
      );
      onBlur?.();
    },
    [attachments, onChange, onBlur],
  );

  const uploading = pending.length > 0;
  const canUpload = !!onUpload && !disabled;
  const hasFiles = attachments.length > 0 || uploading;
  const maxSizeLabel = formatFileSize(bytesToKilobytes(ATTACHMENT_MAX_BYTES));
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDropAccepted: upload,
    onDropRejected: reject,
    maxSize: ATTACHMENT_MAX_BYTES,
    disabled: !canUpload || uploading,
    noClick: true,
    noKeyboard: true,
  });

  return (
    <>
      <div
        {...getRootProps({
          className: cn(
            "relative flex min-w-0 flex-col gap-2",
            isDragActive && "min-h-20",
            className,
          ),
          style,
        })}
      >
        <input {...getInputProps({ id })} />
        {canUpload &&
          (hasFiles ? (
            <Button
              variant="outline"
              size="xs"
              startIcon={<UploadIcon size={13} />}
              disabled={uploading}
              onClick={open}
              className="w-fit"
            >
              {uploading ? "Uploading…" : "Attach File"}
            </Button>
          ) : (
            <button
              type="button"
              onClick={open}
              className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed px-3 py-3 text-center text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-primary-10 focus-visible:border-primary focus-visible:outline-none"
            >
              <Upload className="size-4" />
              <span>
                Drop files here or{" "}
                <span className="font-medium text-primary">browse</span>
              </span>
              <span className="text-[0.7rem]">Up to {maxSizeLabel} each</span>
            </button>
          ))}
        {hasFiles && (
          <div className="flex flex-wrap gap-3">
            {attachments.map((attachment, index) => (
              <AttachmentCard
                key={attachment.id}
                media={
                  <AttachmentThumbnail
                    attachment={attachment}
                    fallback={<FileText className="size-5" />}
                    className="size-full object-cover"
                  />
                }
                title={attachment.name}
                description={[
                  attachment.fileExtension?.toUpperCase(),
                  formatFileSize(attachment.fileSize),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                onOpen={() => openPreview(attachments, index)}
              >
                {!!options?.length && (
                  <AttachmentLabelSelect
                    name={attachment.name}
                    options={options}
                    value={attachmentOption(attachment, options)?.id}
                    disabled={disabled}
                    onChange={(optionId) => label(attachment.id, optionId)}
                  />
                )}
                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  {!disabled && (
                    <Button
                      variant="outline"
                      size="icon-xs"
                      aria-label={`Remove ${attachment.name}`}
                      title="Remove"
                      onClick={() => remove(attachment.id)}
                      startIcon={<Trash2Icon size={13} />}
                      className="text-muted-foreground hover:text-destructive"
                    />
                  )}
                </div>
              </AttachmentCard>
            ))}
            {pending.map((file) => (
              <AttachmentCard
                key={file.key}
                media={<Spinner className="size-5" />}
                title={file.name}
                description={`Uploading · ${formatFileSize(file.fileSize)}`}
                uploading
              />
            ))}
          </div>
        )}
        {isDragActive && (
          <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-primary bg-primary-10 text-center text-xs text-primary">
            <Upload className="size-4" />
            <span className="font-medium">Drop to upload</span>
            <span className="text-[0.7rem]">Up to {maxSizeLabel} each</span>
          </div>
        )}
      </div>
      <AttachmentPreviewDialog {...dialogProps} />
    </>
  );
}

/** The label of one file, picked from the attachment field's options; it sits above the card's open trigger. */
function AttachmentLabelSelect({
  name,
  options,
  value,
  disabled,
  onChange,
}: AttachmentLabelSelectProps) {
  const picked = options.find((option) => option?.id === value);
  if (disabled && !picked) return null;
  return (
    <Select
      value={value ?? NO_LABEL}
      onValueChange={(next) => onChange(next === NO_LABEL ? undefined : next)}
      disabled={disabled}
    >
      <SelectTrigger
        asChild
        aria-label={`Label for ${name}`}
        className="flex h-6 w-fit max-w-full min-w-0 cursor-pointer items-center rounded-md border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none disabled:cursor-default"
      >
        <button type="button">
          {picked ? (
            <SelectionNode
              dropDownValue={picked}
              className="flex h-6 min-w-0 items-center gap-1 px-2 text-xs font-medium"
            >
              <Tag className="size-3 shrink-0" />
              <span className="truncate">{picked.value}</span>
            </SelectionNode>
          ) : (
            <span className="flex h-6 items-center gap-1 rounded-md border bg-background px-2 font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <Tag className="size-3" />
              Add label
            </span>
          )}
        </button>
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={NO_LABEL} textValue="No label">
          <span className="text-muted-foreground">No label</span>
        </SelectItem>
        {options.map((option) => (
          <SelectItem
            key={option.id}
            value={option.id}
            textValue={option.value}
          >
            <SelectionNode dropDownValue={option}>{option.value}</SelectionNode>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** One file as a card: its tile, name and details in a raised panel that opens it, with the footer's controls below. */
function AttachmentCard({
  media,
  title,
  description,
  uploading = false,
  onOpen,
  children,
}: AttachmentCardProps) {
  return (
    <div className="flex w-58 max-w-full flex-col gap-1.5 rounded-xl border bg-muted/50 p-1.5">
      <button
        type="button"
        tabIndex={-1}
        disabled={uploading}
        onClick={onOpen}
        className="flex flex-col h-48 items-start gap-3 rounded-lg border bg-card p-3 text-left shadow-xs transition-colors enabled:cursor-pointer enabled:hover:border-primary/40"
      >
        <span className="flex w-full flex-1 items-center justify-center overflow-hidden rounded-lg bg-foreground text-background">
          {media}
        </span>
        <span className="flex w-full min-w-0 flex-col gap-0.5">
          <span
            title={title}
            className={cn(
              "truncate text-sm font-semibold text-foreground",
              uploading && "animate-pulse",
            )}
          >
            {title}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {description}
          </span>
        </span>
      </button>
      {children && (
        <div className="flex min-h-6 items-center gap-1.5 px-0.5">
          {children}
        </div>
      )}
    </div>
  );
}
