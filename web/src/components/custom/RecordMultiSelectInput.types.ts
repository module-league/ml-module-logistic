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
  /** Keeps the chips on one line, counting the ones that don't fit as "+N", e.g. in a table row. */
  singleLine?: boolean;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}
