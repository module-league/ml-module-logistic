import { useCallback, useMemo, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { FileText, Upload, UploadIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/sonner";
import { errorParser } from "@/hooks/useErrorParser";
import { ATTACHMENT_MAX_BYTES } from "@/services/attachments/attachment.api";
import {
  bytesToKilobytes,
  formatFileSize,
  isImageAttachment,
  parseAttachments,
  toAttachmentValue,
} from "@/lib/attachmentHelper";
import { useAttachmentPreview } from "@/hooks/useAttachmentPreview";
import { AttachmentPreviewDialog } from "./AttachmentPreviewDialog";
import { AttachmentThumbnail } from "./AttachmentThumbnail";
import type { RecordAttachmentInputProps } from "./RecordAttachmentInput.types";
import { Button } from "@/ui-kit";

type PendingUpload = Pick<IAttachment, "name" | "fileSize"> & { key: string };

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
          <AttachmentGroup className="flex-wrap overflow-visible">
            {attachments.map((attachment, index) => (
              <Attachment key={attachment.id} size="sm" className="max-w-60">
                <AttachmentMedia
                  variant={isImageAttachment(attachment) ? "image" : "icon"}
                >
                  <AttachmentThumbnail
                    attachment={attachment}
                    fallback={<FileText />}
                  />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle title={attachment.name}>
                    {attachment.name}
                  </AttachmentTitle>
                  <AttachmentDescription>
                    {[
                      attachment.fileExtension?.toUpperCase(),
                      formatFileSize(attachment.fileSize),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </AttachmentDescription>
                </AttachmentContent>
                <AttachmentTrigger
                  aria-label={`Open ${attachment.name}`}
                  onClick={() => openPreview(attachments, index)}
                  className="cursor-pointer"
                />
                {!disabled && (
                  <AttachmentActions>
                    <AttachmentAction
                      aria-label={`Remove ${attachment.name}`}
                      onClick={() => remove(attachment.id)}
                      startIcon={<X size={13} />}
                    />
                  </AttachmentActions>
                )}
              </Attachment>
            ))}
            {pending.map((file) => (
              <Attachment
                key={file.key}
                size="sm"
                state="uploading"
                className="max-w-60"
              >
                <AttachmentMedia>
                  <Spinner />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{file.name}</AttachmentTitle>
                  <AttachmentDescription>
                    Uploading · {formatFileSize(file.fileSize)}
                  </AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            ))}
          </AttachmentGroup>
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
