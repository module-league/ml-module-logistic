import { memo } from "react";
import { FileText } from "lucide-react";
import { attachmentUrl } from "@/services/attachments/attachment.api";
import { isImageAttachment } from "@/lib/attachmentHelper";
import type { AttachmentChipProps } from "./RecordAttachmentInput.types";

/** A small link to one attachment: a thumbnail for images, a file icon otherwise. */
export const AttachmentChip = memo(function AttachmentChip({
  attachment,
}: AttachmentChipProps) {
  const url = attachmentUrl(attachment?.id);

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={attachment?.name}
      className="inline-flex max-w-40 min-w-0 shrink-0 items-center gap-1 rounded-md border bg-background py-0.5 pr-1.5 pl-0.5 text-xs hover:bg-muted"
    >
      {isImageAttachment(attachment) ? (
        <img src={url} alt="" className="size-4 shrink-0 rounded-sm object-cover" />
      ) : (
        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate">{attachment?.name}</span>
    </a>
  );
});
