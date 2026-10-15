import type { CSSProperties, ReactNode } from "react";

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

export interface RecordLookupInputProps extends Pick<
  RecordLinkInputProps,
  "id" | "members" | "className" | "style"
> {
  /** A lookup field. */
  field: IField;
  /** Its link field's value: a JSON array of the linked record ids. */
  value?: string;
  /** Shows a preview button on the right; off while nothing is linked. */
  onPreview?: () => void;
  /** The preview of this field is showing. */
  previewActive?: boolean;
}

export interface RecordLinkCardProps {
  title: string;
  /** Undefined while loading, or when the linked record no longer exists. */
  record?: ISidebarRecord;
  /** The fields shown under the title, from linkCardFields. */
  fields: ISidebarField[];
  members?: IUserInfo[];
  /** Pickable options show a tick when selected. */
  selected?: boolean;
  /** Makes the card a pickable option. */
  onSelect?: () => void;
  /** Shown in the card's top corner, e.g. a button to unlink the record. */
  action?: ReactNode;
  className?: string;
}

export interface RecordLinkCardListProps extends Pick<
  RecordLinkCardProps,
  "fields" | "members"
> {
  /** Names the listbox, e.g. "Party records". */
  label: string;
  /** The records matching the search, in list order. */
  records: ISidebarRecord[];
  selectedIds: string[];
  multiple: boolean;
  titleOf: (record?: ISidebarRecord) => string;
  onSelect: (recordId: string) => void;
}
