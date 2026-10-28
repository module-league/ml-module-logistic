/** True when a parsed JSON item has the fields every stored attachment carries. */
function isAttachment(item: unknown): item is IAttachment {
  return (
    item instanceof Object &&
    "id" in item &&
    typeof item.id === "string" &&
    "name" in item &&
    typeof item.name === "string"
  );
}

/** The attachments in a stored value (a JSON array); empty when the value is blank or not valid. */
export function parseAttachments(value?: string | null): IAttachment[] {
  if (value == null || value === "") return [];
  try {
    const list: unknown = JSON.parse(value);
    return Array.isArray(list) ? list.filter(isAttachment) : [];
  } catch {
    return [];
  }
}

/** The label picked for a file, when it is still one of the field's options. */
export function attachmentOption(
  attachment: Pick<IAttachment, "optionId">,
  options?: IFieldDropDownValue[],
) {
  return options?.find((option) => option.id === attachment.optionId);
}

export function toAttachmentValue(attachments: IAttachment[]) {
  return attachments.length > 0 ? JSON.stringify(attachments) : "";
}

/** Types the API serves inline (AttachmentController.InlineTypes); anything else only downloads. */
export const PREVIEW_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
];

export function canPreviewAttachment(
  attachment?: Pick<IAttachment, "fileType">,
) {
  return PREVIEW_FILE_TYPES.includes(attachment?.fileType ?? "");
}

export function isImageAttachment(attachment?: Pick<IAttachment, "fileType">) {
  return attachment?.fileType?.startsWith("image/") === true;
}

export function bytesToKilobytes(bytes = 0) {
  return Math.ceil((bytes / 1024) * 100) / 100;
}

/** Takes KB, like IAttachment.fileSize: 0.09 → "0.09 KB", 1536 → "1.5 MB". */
export function formatFileSize(kilobytes = 0) {
  if (kilobytes < 1) return `${kilobytes} KB`;
  const units = ["KB", "MB", "GB"];
  let size = kilobytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unit]}`;
}

export function attachmentNames(value?: string | null) {
  return parseAttachments(value)
    .map((attachment) => attachment.name)
    .join(", ");
}
