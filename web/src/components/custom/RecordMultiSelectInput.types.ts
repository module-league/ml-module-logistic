import type { CSSProperties } from "react";

export interface RecordMultiSelectInputProps {
  id?: string;
  field: IField;
  /** A JSON array of the picked option ids. */
  value?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}
