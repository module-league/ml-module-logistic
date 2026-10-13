import type { ReactNode } from "react";

export type ModuleAppViewMode = "list" | "grid";

export interface ModuleAppColumn<T> {
  key: string;
  header: ReactNode;
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

export interface ModuleAppViewProps<T>
  extends ModuleAppColumnLayout,
    ModuleAppAddAction,
    ModuleAppSelection,
    ModuleAppRowOrder,
    ModuleAppRowMenu {
  records: T[];
  getKey: (record: T) => string;
  columns: ModuleAppColumn<T>[];
  /** Card for the grid view; without it only the table view is offered. */
  renderCard?: (record: T) => ReactNode;
  /** @default "list" */
  appView?: ModuleAppViewMode;
  /** @default 20 */
  pageSize?: number;
  /** 1-based page to show; set by ModulePage. @default 1 */
  page?: number;
  empty?: ModuleAppEmptyState;
  /** Records are being fetched for the first time; the table area shows the loader. */
isLoading?: boolean;
/** Loading the records failed; the table area shows the error with Try again. */
error?: unknown;
onRetry?: () => void;

}

export interface ModuleListViewProps<T>
  extends ModuleAppColumnLayout,
    ModuleAppAddAction,
    ModuleAppSelection,
    ModuleAppRowOrder,
    ModuleAppRowMenu {
  /** Pinned rows first, then the rows of the current page. */
  records: T[];
  /** Empty rows fill the page up to this many, so the grid keeps its shape. */
  pageSize?: number;
  getKey: (record: T) => string;
  columns: ModuleAppColumn<T>[];
  empty?: ModuleAppEmptyState;
}

export interface ModuleListHeaderCellProps<T> {
  column: ModuleAppColumn<T>;
  resizable: boolean;
  sortable: boolean;
  onResize?: (key: string, width: number) => void;
  pin?: ModuleColumnPin;
  onPinToggle?: (key: string) => void;
}

/** Where a pinned column sticks; undefined for columns that scroll. */
export interface ModuleColumnPin {
  left: number;
  /** The right-most pinned column draws the edge shadow. */
  last: boolean;
}

export interface ModuleSortableRowProps {
  rowId: string;
  rowKey: string;
  sortable: boolean;
  measureRef?: (node: HTMLTableRowElement | null) => void;
  selected?: boolean;
  /** Distance (px) from the top of the scroll area while the row is pinned. */
  pinnedTop?: number;
  className?: string;
  children: ReactNode;
  onPinToggle?: (key: string) => void;
  onSelectToggle?: (key: string) => void;
  onDelete?: (key: string) => void;
}

export interface ModuleCardGridProps<T> {
  records: T[];
  getKey: (record: T) => string;
  renderCard: (record: T) => ReactNode;
}
