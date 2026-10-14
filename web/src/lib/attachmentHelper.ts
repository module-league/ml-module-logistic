/** The attachments in a stored value (a JSON array); empty when the value is blank or not valid. */
export function parseAttachments(value?: string | null): IAttachment[] {
  if (!value) return [];
  try {
    const list: unknown = JSON.parse(value);
    return Array.isArray(list)
      ? list.filter(
          (item): item is IAttachment =>
            typeof item?.id === "string" && typeof item?.name === "string",
        )
      : [];
  } catch {
    return [];
  }
}

export function toAttachmentValue(attachments: IAttachment[]) {
  return attachments?.length ? JSON.stringify(attachments) : "";
}

export function isImageAttachment(attachment?: Pick<IAttachment, "fileType">) {
  return !!attachment?.fileType?.startsWith("image/");
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
    .map((attachment) => attachment?.name)
    .join(", ");
}
