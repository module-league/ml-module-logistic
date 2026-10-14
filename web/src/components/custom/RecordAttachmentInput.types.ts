import type { CSSProperties, ReactNode } from "react";

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
  /** Opens the preview; without it the chip is a plain label. */
  onOpen?: () => void;
}

export interface AttachmentThumbnailProps {
  attachment: IAttachment;
  /** Shown for files that aren't images, and when the image fails to load. */
  fallback: ReactNode;
  className?: string;
}

export interface AttachmentChipListProps {
  attachments: IAttachment[];
}

export interface AttachmentPreviewDialogProps {
  /** Every file of the cell or input, so the viewer can step between them. Kept after open turns false so it can animate out. */
  attachments: IAttachment[];
  /** Position of the file shown. */
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
}
