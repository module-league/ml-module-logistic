import type { ReactNode } from "react";
import type { PageToolbarProps } from "@/components/ml/pageToolbar.types";
import type {
  ModuleAppViewMode,
  ModuleAppViewProps,
} from "@/module/appView/moduleAppView.types";

export interface ModulePageProps<T> {
  /** Buttons shown on the right of the page header. */
  actions?: ReactNode;
  /** Add, filter, export and search row shown under the page header. */
  toolbar?: Omit<
    PageToolbarProps,
    | "view"
    | "onViewChange"
    | "columnOptions"
    | "hiddenColumns"
    | "onHiddenColumnsChange"
    | "onColumnOrderChange"
    | "selectedCount"
    | "onDeleteSelected"
    | "onCancelSelection"
  >;
  /** The records, shown as a table by default. */
  appView: Omit<
    ModuleAppViewProps<T>,
    | "appView"
    | "page"
    | "columnWidths"
    | "onColumnResize"
    | "onColumnReorder"
    | "pinnedColumns"
    | "onColumnPinToggle"
    | "selectedKeys"
    | "onSelectionChange"
    | "onRowReorder"
    | "pinnedRows"
    | "onRowPinToggle"
    | "onRowDelete"
    | "onRowExpand"
    | "onAdd"
    | "addLabel"
  >;
  /** Field templates shown as extra columns, e.g. from useFields(). Without it, added fields only live in this page. */
  fields?: ISidebarField[];
  /** Reads a record's field values (by field key) for the field columns. */
  getRecordValues?: (record: T) => Record<string, string | null | undefined>;
}

export interface ModulePageFooterProps {
  total: number;
  /** 1-based. */
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Grid view shows every record, so paging is hidden. @default "list" */
  appView?: ModuleAppViewMode;
  /** How many records are ticked; shown with a Clear button when above 0. */
  selectedCount?: number;
  onClearSelection?: () => void;
  /** Rows pinned to the top; they sit above every page, so paging skips them. */
  pinnedCount?: number;
}
