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
