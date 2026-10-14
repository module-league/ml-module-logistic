import type { CSSProperties } from "react";

export interface LinkedRecordChipProps {
  label: string;
  className?: string;
}

export interface LinkedRecordChipListProps {
  field: IField;
  /** A JSON array of the linked record ids. */
  value?: string | null;
  /** Needed when the shown field is a member field. */
  members?: IUserInfo[];
}

export interface RecordLinkInputProps {
  id?: string;
  /** A link_table field. */
  field: IField;
  /** A JSON array of the linked record ids. */
  value?: string;
  members?: IUserInfo[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}

export interface RecordLookupInputProps
  extends Pick<RecordLinkInputProps, "id" | "members" | "className" | "style"> {
  /** A lookup field. */
  field: IField;
  /** Its link field's value: a JSON array of the linked record ids. */
  value?: string;
  /** Shows a preview button on the right; off while nothing is linked. */
  onPreview?: () => void;
  /** The preview of this field is showing. */
  previewActive?: boolean;
}
