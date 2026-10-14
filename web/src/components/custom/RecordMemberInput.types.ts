import type { CSSProperties } from "react";

export interface MemberChipProps {
  member?: Partial<IUserInfo>;
  className?: string;
}

export interface RecordMemberInputProps {
  id?: string;
  field: IField;
  /** One user id, or a JSON array of ids when the field allows several people. */
  value?: string;
  members?: IUserInfo[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}
