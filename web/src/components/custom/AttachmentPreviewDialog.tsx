import {
  useCallback,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { attachmentUrl } from "@/services/attachments/attachment.api";
import {
  canPreviewAttachment,
  formatFileSize,
  isImageAttachment,
} from "@/lib/attachmentHelper";
import { AttachmentThumbnail } from "./AttachmentThumbnail";
import { AttachmentTypeIcon } from "./AttachmentTypeIcon";
import type {
  AttachmentChipProps,
  AttachmentPreviewDialogProps,
} from "./RecordAttachmentInput.types";

// The dialog can sit inside a grid row; its events must not reach the row's drag and right-click handlers
const stopPropagation = (event: SyntheticEvent) => event.stopPropagation();

const ICON_BUTTON =
  "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none";

/**
 * Full-screen viewer for the files of one cell or input. Images and PDFs show in place; other files, or a preview
 * that fails to load, get a download card. ← and → step between files.
 */
export function AttachmentPreviewDialog({
  attachments,
  index,
  open,
  onOpenChange,
  onIndexChange,
}: AttachmentPreviewDialogProps) {
  const [failedId, setFailedId] = useState<string>();
  const count = attachments?.length ?? 0;
  const attachment = attachments?.[index];
  const step = useCallback(
    (by: number) => onIndexChange((index + by + count) % count),
    [index, count, onIndexChange],
  );
  const navigate = useCallback(
    (event: KeyboardEvent) => {
      if (count < 2) return;
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    },
    [count, step],
  );

  if (!attachment) return null;
  const previewable =
    canPreviewAttachment(attachment) && failedId !== attachment.id;
  const details = [
    attachment.fileExtension?.toUpperCase(),
    formatFileSize(attachment.fileSize),
    count > 1 && `${index + 1} of ${count}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/85"
        className="top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-transparent p-0 text-white ring-0 sm:max-w-none"
        onKeyDown={navigate}
        onPointerDown={stopPropagation}
        onClick={stopPropagation}
        onContextMenu={stopPropagation}
      >
        <header className="flex shrink-0 items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-sm font-medium text-white">
              {attachment.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60 tabular-nums">
              {details}
            </DialogDescription>
          </div>
          {previewable && <DownloadLink attachment={attachment} />}
          <DialogClose aria-label="Close" className={ICON_BUTTON}>
            <X className="size-5" />
          </DialogClose>
        </header>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4 sm:px-16">
          {count > 1 && (
            <button
              type="button"
              aria-label="Previous file"
              onClick={() => step(-1)}
              className={cn(ICON_BUTTON, "absolute left-3 z-10 bg-white/10")}
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          {previewable ? (
            isImageAttachment(attachment) ? (
              <img
                key={attachment.id}
                src={attachmentUrl(attachment.id)}
                alt={attachment.name}
                onError={() => setFailedId(attachment.id)}
                className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
              />
            ) : (
              <iframe
                key={attachment.id}
                src={attachmentUrl(attachment.id)}
                title={attachment.name}
                onError={() => setFailedId(attachment.id)}
                className="size-full max-w-5xl rounded-md bg-white shadow-2xl"
              />
            )
          ) : (
            <PreviewFallback
              attachment={attachment}
              failed={failedId === attachment.id}
            />
          )}
          {count > 1 && (
            <button
              type="button"
              aria-label="Next file"
              onClick={() => step(1)}
              className={cn(ICON_BUTTON, "absolute right-3 z-10 bg-white/10")}
            >
              <ChevronRight className="size-5" />
            </button>
          )}
        </div>

        {count > 1 && (
          <footer className="flex shrink-0 justify-center gap-2 overflow-x-auto p-4">
            {attachments.map((item, at) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show ${item.name}`}
                aria-current={at === index}
                onClick={() => onIndexChange(at)}
                className="flex size-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md bg-white/10 text-[0.6rem] font-medium text-white/70 opacity-60 ring-2 ring-transparent transition hover:opacity-100 aria-[current=true]:opacity-100 aria-[current=true]:ring-white"
              >
                <AttachmentThumbnail
                  attachment={item}
                  className="size-full object-cover"
                  iconSize="sm"
                />
              </button>
            ))}
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreviewFallback({
  attachment,
  failed,
}: AttachmentChipProps & { failed: boolean }) {
  return (
    <div className="flex max-w-80 flex-col items-center gap-3 rounded-xl bg-white/10 px-8 py-6 text-center">
      <AttachmentTypeIcon attachment={attachment} size="lg" />
      <p className="text-sm text-white/70">
        {failed
          ? "This file couldn't be shown."
          : "This file type can't be previewed."}{" "}
        Download it to open it on your device.
      </p>
      <DownloadLink attachment={attachment} />
    </div>
  );
}

function DownloadLink({ attachment }: AttachmentChipProps) {
  return (
    <a
      href={attachmentUrl(attachment.id, true)}
      download={attachment.name}
      className={cn(
        buttonVariants({ variant: "default", size: "xs" }),
        "gap-1.5",
      )}
    >
      <Download className="size-3.5" />
      Download
    </a>
  );
}
