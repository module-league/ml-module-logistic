import { memo } from "react";
import { useAttachmentPreview } from "@/hooks/useAttachmentPreview";
import { attachmentOption } from "@/lib/attachmentHelper";
import { SelectionNode } from "./RecordValueNode";
import { AttachmentThumbnail } from "./AttachmentThumbnail";
import { AttachmentPreviewDialog } from "./AttachmentPreviewDialog";
import type {
  AttachmentChipListProps,
  AttachmentChipProps,
} from "./RecordAttachmentInput.types";

/** A small chip for one attachment: a thumbnail for images, a file icon otherwise, and its label when it has one. */
export const AttachmentChip = memo(function AttachmentChip({
  attachment,
  option,
  onOpen,
}: AttachmentChipProps) {
  return (
    <button
      type="button"
      title={option ? `${option.value} · ${attachment.name}` : attachment.name}
      onClick={onOpen}
      disabled={!onOpen}
      className="inline-flex max-w-40 min-w-0 shrink-0 cursor-pointer items-center gap-1 rounded-md border bg-background py-0.5 pr-1.5 pl-0.5 text-xs hover:bg-muted disabled:cursor-default"
    >
      <AttachmentThumbnail
        attachment={attachment}
        iconSize="xs"
        className="size-5 shrink-0 rounded-sm object-cover"
      />
      {option && (
        <SelectionNode
          dropDownValue={option}
          className="shrink-0 px-1 py-0 text-[0.65rem]"
        >
          {option.value}
        </SelectionNode>
      )}
      <span className="truncate">{attachment.name}</span>
    </button>
  );
});

/** The chips of one cell; clicking one opens the viewer on it, able to step through the others. */
export function AttachmentChipList({
  attachments,
  options,
}: AttachmentChipListProps) {
  const { openPreview, dialogProps } = useAttachmentPreview();

  return (
    <>
      <span className="flex min-w-0 items-center gap-1 overflow-hidden">
        {attachments.map((attachment, index) => (
          <AttachmentChip
            key={attachment.id}
            attachment={attachment}
            option={attachmentOption(attachment, options)}
            onOpen={() => openPreview(attachments, index)}
          />
        ))}
      </span>
      <AttachmentPreviewDialog {...dialogProps} />
    </>
  );
}
