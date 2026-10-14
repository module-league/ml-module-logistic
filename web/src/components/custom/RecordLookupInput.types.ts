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
}
