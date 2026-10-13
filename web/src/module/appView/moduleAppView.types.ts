import type { ReactNode } from "react";
import type { Header } from "@tanstack/react-table";
import type { ModuleQueryState } from "@/module/shell/module.types";

/** The ways ModuleAppView can show records; only the grid for now. */
export type ModuleAppViewMode = "grid";

export interface ModuleAppColumn<T> {
  key: string;
  header: ReactNode;
  /** Shown before the header text, e.g. the field's type icon. */
  icon?: ReactNode;
  cell: (record: T) => ReactNode;
  /** Classes for the body cells. */
  className?: string;
  /** Classes for the header cell, e.g. "text-right" to line up with right-aligned cells. */
  headerClassName?: string;
  /** Starting width in px. @default 160 */
  width?: number;
}

export interface ModuleAppAddAction {
  /** Starts a new record; filler rows offer it on hover. */
  onAdd?: () => void;
  addLabel?: string;
}

export interface ModuleAppRowOrder {
  /** A row was dragged onto another row; both are getKey values. */
  onRowReorder?: (activeKey: string, overKey: string) => void;
}

export interface ModuleAppRowMenu {
  /** Keys (from getKey) of rows held under the header, in the order they were pinned. */
  pinnedRows?: string[];
  onRowPinToggle?: (key: string) => void;
  onRowDelete?: (key: string) => void;
  /** The row's expand button; without it the button is hidden. */
  onRowExpand?: (key: string) => void;
}

export interface ModuleAppSelection {
  /** Keys (from getKey) of the ticked records. */
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
}

export interface ModuleAppColumnLayout {
  /** Widths (px) the user set by dragging a header edge, by column key. */
  columnWidths?: Record<string, number>;
  onColumnResize?: (key: string, width: number) => void;
  /** Visible column keys in their new order, after a header drag. */
  onColumnReorder?: (keys: string[]) => void;
  /** Columns kept on the left while the table scrolls sideways. */
  pinnedColumns?: string[];
  onColumnPinToggle?: (key: string) => void;
}

export interface ModuleAppEmptyState {
  /** @default "No records yet" */
  title?: string;
  /** @default "Records you create will show up here." */
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Pinned rows come first in records, then the rows of the current page. */
export interface RecordGridProps<T>
  extends ModuleAppColumnLayout,
    ModuleAppAddAction,
    ModuleAppSelection,
    ModuleAppRowOrder,
    ModuleAppRowMenu {
  records: T[];
  getKey: (record: T) => string;
  columns: ModuleAppColumn<T>[];
  /** Empty rows fill the page up to this many, so the grid keeps its shape. */
  pageSize?: number;
  empty?: ModuleAppEmptyState;
}

export interface ModuleAppViewProps<T>
  extends RecordGridProps<T>,
    ModuleQueryState {
  /** @default "grid" */
  appView?: ModuleAppViewMode;
  /** 1-based page to show; pinned rows sit above every page. @default 1 */
  page?: number;
}

export type GridViewProps<T> = Omit<ModuleAppViewProps<T>, "appView">;

export interface RecordGridHeaderCellProps<T>
  extends Pick<ModuleAppColumnLayout, "onColumnPinToggle"> {
  header: Header<T, unknown>;
  column?: ModuleAppColumn<T>;
  sortable: boolean;
  pin?: ModuleColumnPin;
}

/** Where a pinned column sticks; undefined for columns that scroll. */
export interface ModuleColumnPin {
  left: number;
  /** The right-most pinned column draws the edge shadow. */
  last: boolean;
}

export interface ModuleSortableRowProps
  extends Pick<ModuleAppRowMenu, "onRowPinToggle" | "onRowDelete"> {
  rowId: string;
  rowKey: string;
  sortable: boolean;
  measureRef?: (node: HTMLTableRowElement | null) => void;
  selected?: boolean;
  /** Distance (px) from the top of the scroll area while the row is pinned. */
  pinnedTop?: number;
  className?: string;
  children: ReactNode;
  onSelectToggle?: (key: string) => void;
}
