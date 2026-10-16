import { useState } from "react";
import { attachmentUrl } from "@/services/attachments/attachment.api";
import { isImageAttachment } from "@/lib/attachmentHelper";
import { AttachmentTypeIcon } from "./AttachmentTypeIcon";
import type { AttachmentThumbnailProps } from "./RecordAttachmentInput.types";

/** The image itself for image attachments; the file-type icon for other files, or when the image fails to load. */
export function AttachmentThumbnail({
  attachment,
  iconSize = "sm",
  className,
}: AttachmentThumbnailProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !isImageAttachment(attachment))
    return <AttachmentTypeIcon attachment={attachment} size={iconSize} />;
  return (
    <img
      src={attachmentUrl(attachment?.id)}
      alt=""
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
