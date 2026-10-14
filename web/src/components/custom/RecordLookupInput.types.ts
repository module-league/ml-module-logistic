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

export interface RecordLookupInputProps {
  id?: string;
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
  /** Shows a preview button right of the picker; off while nothing is linked. */
  onPreview?: () => void;
  /** The preview of this field is showing. */
  previewActive?: boolean;
}
