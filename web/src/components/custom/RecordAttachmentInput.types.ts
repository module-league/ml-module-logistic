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
  /** The attachment field's labels; each file can take one. Left out or empty, files have no label. */
  options?: IFieldDropDownValue[];
  /** "dropzone" shows a drop box while there are no files; "button" always shows the Attach File button. Files can be dropped on the input either way. @default "dropzone" */
  trigger?: "dropzone" | "button";
  /** "compact" shows each file as a small row card, for tight spaces like a comment box. @default "default" */
  cardSize?: AttachmentCardProps["size"];
}

export interface AttachmentCardProps {
  /** The file's tile: its image, or an icon. */
  media: ReactNode;
  title: string;
  description: string;
  /** Pulses the name and turns the panel off while the file uploads. */
  uploading?: boolean;
  onOpen?: () => void;
  /** The footer's controls, e.g. the label picker and the file's actions. */
  children?: ReactNode;
  /** "compact" is a small row card: the tile beside the name, details and controls. @default "default" */
  size?: "default" | "compact";
}

export interface AttachmentLabelSelectProps {
  /** The file's name, for the picker's label. */
  name: string;
  options: IFieldDropDownValue[];
  /** The picked option's id. */
  value?: string;
  disabled?: boolean;
  onChange: (optionId?: string) => void;
}

export interface AttachmentChipProps {
  attachment: IAttachment;
  /** The label picked for the file. */
  option?: IFieldDropDownValue;
  /** Opens the preview; without it the chip is a plain label. */
  onOpen?: () => void;
}

export interface AttachmentThumbnailProps {
  attachment: IAttachment;
  /** The file-type icon's size, shown for files that aren't images and when the image fails to load. */
  iconSize?: AttachmentTypeIconProps["size"];
  /** The image's classes. */
  className?: string;
}

export interface AttachmentTypeIconProps {
  attachment?: Pick<IAttachment, "fileType" | "fileExtension">;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** The extension badge, shown from md up. */
  showBadge?: boolean;
  className?: string;
}

export interface AttachmentChipListProps {
  attachments: IAttachment[];
  /** The attachment field's labels. */
  options?: IFieldDropDownValue[];
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
