import type { ReactElement } from "react";
import type { ModuleAddFieldHandler } from "./moduleAddNewField.types";

/** A table column the user can show or hide. */
export interface PageToolbarColumnOption {
  key: string;
  label: string;
  /** Picks the icon beside the label. */
  type?: IField["type"];
}

export interface PageToolbarProps {
  onAdd?: () => void;
  /** @default "Add record" */
  addLabel?: string;
  /** Shows the Columns button when set together with onHiddenColumnsChange. */
  columnOptions?: PageToolbarColumnOption[];
  hiddenColumns?: string[];
  onHiddenColumnsChange?: (hidden: string[]) => void;
  /** Column keys in their new order, after a drag in the Columns menu. */
  onColumnOrderChange?: (keys: string[]) => void;
  /** Shows "Add field" in the Fields menu; called with the field the dialog built. */
  onAddField?: ModuleAddFieldHandler;
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

interface ToolbarCompactProps {
  /** Icon-only button with a tooltip. */
  compact?: boolean;
}

export interface FieldsDropdownProps
  extends ToolbarCompactProps,
    Required<
      Pick<
        PageToolbarProps,
        "columnOptions" | "hiddenColumns" | "onHiddenColumnsChange"
      >
    >,
    Pick<PageToolbarProps, "onColumnOrderChange" | "onAddField"> {}

export interface FieldsDropdownItemProps {
  field: PageToolbarColumnOption;
  shown: boolean;
  /** The last visible column can't be hidden. */
  locked: boolean;
  sortable: boolean;
  onToggle: (key: string) => void;
}

export interface ToolbarTooltipProps {
  label: string;
  /** Only icon-only buttons need a tooltip. */
  enabled: boolean;
  children: ReactElement;
}
