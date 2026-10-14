import type { CSSProperties } from "react";

/** Uploads one file and resolves with what the attachment field stores for it. */
export type AttachmentUploadHandler = (file: File) => Promise<IAttachment>;

export interface RecordAttachmentInputProps {
  id?: string;
  /** A JSON array of IAttachment. */
  value?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  /** Without it the drop zone is hidden and the files can only be opened or removed. */
  onUpload?: AttachmentUploadHandler;
}

export interface AttachmentChipProps {
  attachment: IAttachment;
}
