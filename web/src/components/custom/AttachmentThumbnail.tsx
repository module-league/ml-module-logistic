import { useState } from "react";
import { attachmentUrl } from "@/services/attachments/attachment.api";
import { isImageAttachment } from "@/lib/attachmentHelper";
import type { AttachmentThumbnailProps } from "./RecordAttachmentInput.types";

/** The image itself for image attachments; the fallback for other files, or when the image fails to load. */
export function AttachmentThumbnail({
  attachment,
  fallback,
  className,
}: AttachmentThumbnailProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !isImageAttachment(attachment)) return <>{fallback}</>;
  return (
    <img
      src={attachmentUrl(attachment?.id)}
      alt=""
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
