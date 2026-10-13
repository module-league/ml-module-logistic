import type { ComponentType, ReactElement, ReactNode } from "react";

export interface PageToolbarOption {
  value: string;
  label: ReactNode;
}

/** One group of choices in the filter dropdown, e.g. Status. */
export interface PageToolbarInputOption {
  key: string;
  label: string;
  options: PageToolbarOption[];
}

/** One way of showing the page's records, e.g. a table or cards. */
export interface PageToolbarViewOption {
  value: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}

/** Selected values per filter key; an empty or missing list means no filter. */
export type PageToolbarFilterValue = Record<string, string[]>;

/** A table column the user can show or hide. */
export interface PageToolbarColumnOption {
  key: string;
  label: string;
}

export interface PageToolbarProps {
  onAdd?: () => void;
  /** @default "Add record" */
  addLabel?: string;
  /** Defaults to list and grid when onViewChange is set. */
  views?: PageToolbarViewOption[];
  view?: string;
  onViewChange?: (value: string) => void;
  inputOptions?: PageToolbarInputOption[];
  filterValue?: PageToolbarFilterValue;
  onFilterChange?: (value: PageToolbarFilterValue) => void;
  /** Shows the Columns button when set together with onHiddenColumnsChange. */
  columnOptions?: PageToolbarColumnOption[];
  hiddenColumns?: string[];
  onHiddenColumnsChange?: (hidden: string[]) => void;
  /** Column keys in their new order, after a drag in the Columns menu. */
  onColumnOrderChange?: (keys: string[]) => void;
  /** Shows "Add field" in the Fields menu; called with the field the dialog built. */
  onAddField?: (field: IField) => void | Promise<unknown>;
  /** Deletes the ticked records; shown as the toolbar's only action while records are ticked. */
  onDelete?: (keys: string[]) => void;
  /** Set by ModulePage: how many records are ticked. Above 0 the toolbar switches to selection mode. */
  selectedCount?: number;
  onDeleteSelected?: () => void;
  onCancelSelection?: () => void;
  onExport?: () => void;
  /** @default "Export" */
  exportLabel?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  /** @default "Search" */
  searchPlaceholder?: string;
  className?: string;
}

export interface FilterDropdownProps {
  inputOptions: PageToolbarInputOption[];
  value?: PageToolbarFilterValue;
  onChange?: (value: PageToolbarFilterValue) => void;
  /** Icon-only button with a tooltip. */
  compact?: boolean;
}

export interface FieldsDropdownProps {
  fields: PageToolbarColumnOption[];
  hidden: string[];
  onChange: (hidden: string[]) => void;
  onReorder?: (keys: string[]) => void;
  onAddField?: (field: IField) => void | Promise<unknown>;
  /** Icon-only button with a tooltip. */
  compact?: boolean;
}

export interface FieldsDropdownItemProps {
  field: PageToolbarColumnOption;
  shown: boolean;
  /** The last visible column can't be hidden. */
  locked: boolean;
  sortable: boolean;
  onToggle: (key: string) => void;
}

export interface ModuleAppViewDropdownProps {
  views: PageToolbarViewOption[];
  value?: string;
  onChange: (value: string) => void;
  /** Icon-only button with a tooltip. */
  compact?: boolean;
}

export interface ToolbarTooltipProps {
  label: string;
  /** Only icon-only buttons need a tooltip. */
  enabled: boolean;
  children: ReactElement;
}
