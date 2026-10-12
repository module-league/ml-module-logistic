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
}

export interface ModuleAppEmptyState {
  /** @default "No records yet" */
  title?: string;
  /** @default "Records you create will show up here." */
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ModuleAppViewProps<T> {
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
}

export interface ModuleListViewProps<T> {
  /** The rows of the current page. */
  records: T[];
  getKey: (record: T) => string;
  columns: ModuleAppColumn<T>[];
  empty?: ModuleAppEmptyState;
}

export interface ModuleCardGridProps<T> {
  records: T[];
  getKey: (record: T) => string;
  renderCard: (record: T) => ReactNode;
}

export interface ModulePageFooterProps {
  total: number;
  /** 1-based. */
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Grid view shows every record, so paging is hidden. @default "list" */
  appView?: ModuleAppViewMode;
}
