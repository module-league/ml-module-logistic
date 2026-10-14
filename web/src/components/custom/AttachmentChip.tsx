import { memo } from "react";
import { FileText } from "lucide-react";
import { useAttachmentPreview } from "@/hooks/useAttachmentPreview";
import { AttachmentThumbnail } from "./AttachmentThumbnail";
import { AttachmentPreviewDialog } from "./AttachmentPreviewDialog";
import type {
  AttachmentChipListProps,
  AttachmentChipProps,
} from "./RecordAttachmentInput.types";

/** A small chip for one attachment: a thumbnail for images, a file icon otherwise. */
export const AttachmentChip = memo(function AttachmentChip({
  attachment,
  onOpen,
}: AttachmentChipProps) {
  return (
    <button
      type="button"
      title={attachment?.name}
      onClick={onOpen}
      disabled={!onOpen}
      className="inline-flex max-w-40 min-w-0 shrink-0 cursor-pointer items-center gap-1 rounded-md border bg-background py-0.5 pr-1.5 pl-0.5 text-xs hover:bg-muted disabled:cursor-default"
    >
      <AttachmentThumbnail
        attachment={attachment}
        className="size-4 shrink-0 rounded-sm object-cover"
        fallback={<FileText className="size-3.5 shrink-0 text-muted-foreground" />}
      />
      <span className="truncate">{attachment?.name}</span>
    </button>
  );
});

/** The chips of one cell; clicking one opens the viewer on it, able to step through the others. */
export function AttachmentChipList({ attachments }: AttachmentChipListProps) {
  const { openPreview, dialogProps } = useAttachmentPreview();

  return (
    <>
      <span className="flex min-w-0 items-center gap-1 overflow-hidden">
        {attachments?.map((attachment, index) => (
          <AttachmentChip
            key={attachment.id}
            attachment={attachment}
            onOpen={() => openPreview(attachments, index)}
          />
        ))}
      </span>
      <AttachmentPreviewDialog {...dialogProps} />
    </>
  );
}
