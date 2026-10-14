import {
  closestCenter,
  type CollisionDetection,
  type Modifier,
} from "@dnd-kit/core";
import type {
  ColumnDef,
  ColumnSizingState,
  Header,
  RowSelectionState,
  Table,
} from "@tanstack/react-table";
import type { CheckedState } from "@radix-ui/react-checkbox";
import type { ModuleAppColumn, ModuleColumnPin } from "../moduleAppView.types";

export const COLUMN_WIDTH = {
  default: 160,
  min: 64,
  last: 120,
  select: 66,
  addField: 44,
};

export const toRowId = (key: string) => `row:${key}`;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Rows move up and down, columns sideways; each stays inside the element that holds it. */
export const lockToDragAxis: Modifier = ({
  transform,
  active,
  draggingNodeRect,
  containerNodeRect,
}) => {
  const isRow = active?.data?.current?.type === "row";
  if (!draggingNodeRect || !containerNodeRect) {
    return isRow ? { ...transform, x: 0 } : { ...transform, y: 0 };
  }
  return isRow
    ? {
        ...transform,
        x: 0,
        y: clamp(
          transform.y,
          containerNodeRect.top - draggingNodeRect.top,
          containerNodeRect.bottom - draggingNodeRect.bottom,
        ),
      }
    : {
        ...transform,
        y: 0,
        x: clamp(
          transform.x,
          containerNodeRect.left - draggingNodeRect.left,
          containerNodeRect.right - draggingNodeRect.right,
        ),
      };
};

/** A row only lands on rows, a column only on columns. */
export const sameKindCollision: CollisionDetection = (args) =>
  closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) =>
        container?.data?.current?.type === args.active?.data?.current?.type,
    ),
  });

export function pinStyle(pin: ModuleColumnPin | undefined) {
  return pin ? { left: pin.left } : undefined;
}

export function pinClass(pin: ModuleColumnPin | undefined) {
  if (!pin) return undefined;
  return pin.last ? "sticky-edge" : "sticky-line";
}

/** The text a header reads as, for aria labels and the taken-name check. */
export function columnLabel<T>(column: ModuleAppColumn<T> | undefined, fallback = "") {
  return typeof column?.header === "string" ? column.header : (column?.key ?? fallback);
}

/** Every column can be resized, except the last one when no + column follows it to absorb the spare width. */
export function toColumnDefs<T>(
  columns: ModuleAppColumn<T>[] | undefined,
  hasAddField: boolean,
): ColumnDef<T>[] {
  return (
    columns?.map((column, index) => ({
      id: column?.key,
      header: () => column?.header,
      cell: ({ row }) => column?.cell(row.original),
      size: column?.width ?? COLUMN_WIDTH.default,
      minSize: COLUMN_WIDTH.min,
      enableResizing: hasAddField || index < columns.length - 1,
    })) ?? []
  );
}

export function toRowSelection(keys: string[] | undefined): RowSelectionState {
  return Object.fromEntries(keys?.map((key) => [key, true]) ?? []);
}

export function selectedKeysOf(selection: RowSelectionState) {
  return Object.keys(selection).filter((key) => selection[key]);
}

export function pageSelectionState<T>(table: Table<T>): CheckedState {
  if (table.getIsAllPageRowsSelected()) return true;
  return table.getIsSomePageRowsSelected() ? "indeterminate" : false;
}

/** Position of each pinned row that is on this page, by row key. */
export function pinnedRowIndex(pinnedRows: string[] | undefined, pageKeys: string[]) {
  return new Map(
    pinnedRows
      ?.filter((key) => pageKeys.includes(key))
      .map((key, index) => [key, index]),
  );
}

/** Empty rows that fill the page up to pageSize; none while there are no records, so the empty state shows. */
export function fillerRowKeys(rowCount: number, pinnedCount: number, pageSize: number) {
  if (!rowCount) return [];
  return Array.from(
    { length: Math.max(0, pageSize - (rowCount - pinnedCount)) },
    (_, index) => index,
  );
}

/** Width of each column; the last one has none when there's no + column, so it takes the spare width. */
export function columnWidthsOf<T>(
  headers: Header<T, unknown>[],
  columnSizing: ColumnSizingState,
  hasAddField: boolean,
) {
  return headers.map((header, index) =>
    !hasAddField && index === headers.length - 1
      ? undefined
      : (columnSizing[header.id] ?? header.getSize()),
  );
}

/** Where each pinned column sticks: its left edge is the total width of the pinned columns before it. */
export function columnPinsOf<T>(
  headers: Header<T, unknown>[],
  widths: (number | undefined)[],
  startLeft: number,
) {
  let left = startLeft;
  return headers.map((header, index): ModuleColumnPin | undefined => {
    if (!header.column.getIsPinned()) return undefined;
    const pin = { left, last: header.column.getIsLastColumn("left") };
    left += widths[index] ?? COLUMN_WIDTH.last;
    return pin;
  });
}

export function tableMinWidth(
  widths: (number | undefined)[],
  selectable: boolean,
  hasAddField: boolean,
) {
  return widths.reduce<number>(
    (sum, width) => sum + (width ?? COLUMN_WIDTH.last),
    (selectable ? COLUMN_WIDTH.select : 0) + (hasAddField ? COLUMN_WIDTH.addField : 0),
  );
}

type DragOffset = { x: number; y: number } | null;

export function rowDragStyle(transform: DragOffset, transition?: string, top?: number) {
  return {
    top,
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
  };
}

export function columnDragStyle(
  transform: DragOffset,
  transition?: string,
  pin?: ModuleColumnPin,
) {
  return {
    ...pinStyle(pin),
    transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
    transition,
  };
}

/** Row colours: ticked rows stay tinted; the last pinned row draws the edge shadow. */
export function recordRowClass(
  selected: boolean,
  pinnedAt: number | undefined,
  pinnedCount: number,
) {
  const pinned = pinnedAt !== undefined;
  return [
    "group/row [&>td]:h-8",
    selected
      ? "bg-primary-10 hover:bg-primary-10"
      : "bg-background even:bg-table-stripe hover:bg-primary-10 data-[state=open]:bg-primary-10",
    pinned && "sticky z-[5]",
    pinned && pinnedAt === pinnedCount - 1 && "sticky-row-edge",
  ];
}
