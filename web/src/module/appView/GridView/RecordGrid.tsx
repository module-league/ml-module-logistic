import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  useReactTable,
  type ColumnPinningState,
  type ColumnSizingState,
  type RowSelectionState,
  type Updater,
} from "@tanstack/react-table";
import { Maximize2, Pin, Plus } from "lucide-react";
import {
  Button,
  Checkbox,
  cn,
  ModuleAddNewButton,
  ModuleAddNewFieldDialog,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@moduleleague/ui";
import type { RecordGridProps } from "../moduleAppView.types";
import { RecordGridEmpty } from "./RecordGridEmpty";
import { RecordGridHeaderCell } from "./RecordGridHeaderCell";
import { RecordGridRow } from "./RecordGridRow";
import {
  COLUMN_WIDTH,
  columnLabel,
  columnPinsOf,
  columnWidthsOf,
  fillerRowKeys,
  lockToDragAxis,
  pageSelectionState,
  pinClass,
  pinnedRowIndex,
  pinStyle,
  recordRowClass,
  sameKindCollision,
  selectedKeysOf,
  tableMinWidth,
  toColumnDefs,
  toRowId,
  toRowSelection,
} from "./RecordGrid.utils";

export function RecordGrid<T>({
  records,
  pageSize = 0,
  onAdd,
  addLabel,
  getKey,
  columns,
  empty,
  columnWidths,
  onColumnResize,
  onColumnReorder,
  pinnedColumns,
  onColumnPinToggle,
  onColumnEdit,
  onColumnHide,
  onColumnDelete,
  selectedKeys,
  onSelectionChange,
  onRowReorder,
  pinnedRows,
  onRowPinToggle,
  onRowDelete,
  onRowExpand,
  onAddField,
}: RecordGridProps<T>) {
  const selectable = !!onSelectionChange;
  const hasAddField = !!onAddField;
  const [addingField, setAddingField] = useState(false);
  const openAddField = useCallback(() => setAddingField(true), []);
  const fieldNames = useMemo(
    () => columns?.map((column) => columnLabel(column)) ?? [],
    [columns],
  );
  const data = useMemo(() => records ?? [], [records]);
  const columnByKey = useMemo(
    () => new Map(columns?.map((column) => [column?.key, column])),
    [columns],
  );
  const columnDefs = useMemo(
    () => toColumnDefs(columns, hasAddField),
    [columns, hasAddField],
  );
  const rowSelection = useMemo<RowSelectionState>(
    () => toRowSelection(selectedKeys),
    [selectedKeys],
  );
  const columnSizing = useMemo<ColumnSizingState>(
    () => columnWidths ?? {},
    [columnWidths],
  );
  const columnPinning = useMemo<ColumnPinningState>(
    () => ({
      left: pinnedColumns?.filter((key) => columnByKey.has(key)) ?? [],
    }),
    [pinnedColumns, columnByKey],
  );
  const changeRowSelection = useCallback(
    (updater: Updater<RowSelectionState>) =>
      onSelectionChange?.(
        selectedKeysOf(functionalUpdate(updater, rowSelection)),
      ),
    [rowSelection, onSelectionChange],
  );
  const changeColumnSizing = useCallback(
    (updater: Updater<ColumnSizingState>) => {
      const next = functionalUpdate(updater, columnSizing);
      Object.entries(next).forEach(([key, width]) => {
        if (columnSizing[key] === width) return;
        onColumnResize?.(key, Math.max(COLUMN_WIDTH.min, Math.round(width)));
      });
    },
    [columnSizing, onColumnResize],
  );

  const table = useReactTable({
    data,
    columns: columnDefs,
    getRowId: (record) => getKey(record),
    getCoreRowModel: getCoreRowModel(),
    state: { rowSelection, columnSizing, columnPinning },
    onRowSelectionChange: changeRowSelection,
    onColumnSizingChange: changeColumnSizing,
    enableRowSelection: selectable,
    enableColumnResizing: !!onColumnResize,
    columnResizeMode: "onChange",
  });
  const headerGroups = table.getHeaderGroups();
  const headers = useMemo(() => headerGroups[0]?.headers ?? [], [headerGroups]);
  const rows = table.getRowModel().rows;

  const pageKeys = useMemo(() => rows.map((row) => row.id), [rows]);
  const pageSelection = pageSelectionState(table);
  const togglePage = useCallback(
    () => table.toggleAllPageRowsSelected(),
    [table],
  );
  const toggleRow = useCallback(
    (key: string) => table.getRow(key)?.toggleSelected(),
    [table],
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [rowHeight, setRowHeight] = useState<number>();
  const measureRow = useCallback((node: HTMLTableRowElement | null) => {
    if (node) setRowHeight(node.getBoundingClientRect().height);
  }, []);
  const [headerHeight, setHeaderHeight] = useState<number>();
  const measureHeader = useCallback((node: HTMLTableSectionElement | null) => {
    if (node) setHeaderHeight(node.getBoundingClientRect().height);
  }, []);
  const pinnedIndex = useMemo(
    () => pinnedRowIndex(pinnedRows, pageKeys),
    [pinnedRows, pageKeys],
  );
  const fillerStyle = useMemo(() => ({ height: rowHeight }), [rowHeight]);
  const fillerRows = useMemo(
    () => fillerRowKeys(rows.length, pinnedIndex.size, pageSize),
    [rows.length, pinnedIndex.size, pageSize],
  );
  const keys = useMemo(() => headers.map((header) => header.id), [headers]);
  const widths = useMemo(
    () => columnWidthsOf(headers, columnSizing, hasAddField),
    [headers, columnSizing, hasAddField],
  );
  const pins = useMemo(
    () => columnPinsOf(headers, widths, selectable ? COLUMN_WIDTH.select : 0),
    [headers, widths, selectable],
  );
  const tableStyle = useMemo(
    () => ({ minWidth: tableMinWidth(widths, selectable, hasAddField) }),
    [widths, selectable, hasAddField],
  );
  const rowIds = useMemo(
    () => pageKeys.filter((key) => !pinnedIndex.has(key)).map(toRowId),
    [pageKeys, pinnedIndex],
  );
  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active?.id === over?.id) return;
      if (active?.data?.current?.type === "row") {
        onRowReorder?.(active.data.current?.key, over.data.current?.key);
        return;
      }
      onColumnReorder?.(
        arrayMove(
          keys,
          keys.indexOf(String(active.id)),
          keys.indexOf(String(over.id)),
        ),
      );
    },
    [keys, onColumnReorder, onRowReorder],
  );

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={sameKindCollision}
        modifiers={[lockToDragAxis]}
        onDragEnd={handleDragEnd}
      >
        <Table
          containerClassName="overflow-visible"
          className="table-fixed"
          style={tableStyle}
        >
          <colgroup>
            {selectable && <col style={{ width: COLUMN_WIDTH.select }} />}
            {headers.map((header, index) => (
              <col key={header.id} style={{ width: widths[index] }} />
            ))}
            {hasAddField && <col style={{ width: "100%" }} />}
          </colgroup>
          <TableHeader
            ref={measureHeader}
            className="sticky top-0 z-10 bg-background h-7"
          >
            <SortableContext
              items={keys}
              strategy={horizontalListSortingStrategy}
            >
              <TableRow className="border-b-foreground/20 hover:bg-transparent">
                {selectable && (
                  <TableHead className="sticky left-0 z-20 h-4 px-0 bg-table-head">
                    <span className="flex items-center pl-2">
                      <Checkbox
                        aria-label="Select all on this page"
                        checked={pageSelection}
                        disabled={!pageKeys.length}
                        onCheckedChange={togglePage}
                      />
                    </span>
                  </TableHead>
                )}
                {headers.map((header, index) => (
                  <RecordGridHeaderCell
                    key={header.id}
                    header={header}
                    column={columnByKey.get(header.id)}
                    sortable={!!onColumnReorder}
                    pin={pins[index]}
                    onColumnPinToggle={onColumnPinToggle}
                    onColumnEdit={onColumnEdit}
                    onColumnHide={onColumnHide}
                    onColumnDelete={onColumnDelete}
                  />
                ))}
                {hasAddField && (
                  <TableHead className="h-4 bg-table-head px-1 w-28">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Add field"
                      title="Add field"
                      onClick={openAddField}
                      startIcon={<Plus size={13} />}
                      className="text-muted-foreground w-full hover:bg-primary-10 hover:text-primary"
                    />
                  </TableHead>
                )}
              </TableRow>
            </SortableContext>
          </TableHeader>
          <TableBody>
            {!rows.length && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={
                    headers.length +
                    (selectable ? 1 : 0) +
                    (hasAddField ? 1 : 0)
                  }
                >
                  <RecordGridEmpty {...empty} />
                </TableCell>
              </TableRow>
            )}
            <SortableContext
              items={rowIds}
              strategy={verticalListSortingStrategy}
            >
              {rows.map((row, index) => {
                const key = row.id;
                const selected = row.getIsSelected();
                const pinnedAt = pinnedIndex.get(key);
                const pinned = pinnedAt !== undefined;
                return (
                  <RecordGridRow
                    key={key}
                    rowId={toRowId(key)}
                    rowKey={key}
                    sortable={!!onRowReorder && !pinned}
                    measureRef={index === 0 ? measureRow : undefined}
                    selected={selectable ? selected : undefined}
                    pinnedTop={
                      pinned
                        ? (headerHeight ?? 0) + pinnedAt * (rowHeight ?? 0)
                        : undefined
                    }
                    onRowPinToggle={onRowPinToggle}
                    onSelectToggle={selectable ? toggleRow : undefined}
                    onRowDelete={onRowDelete}
                    className={cn(
                      recordRowClass(selected, pinnedAt, pinnedIndex.size),
                    )}
                  >
                    {selectable && (
                      <TableCell className="sticky left-0 z-[2] p-0 bg-inherit">
                        <div className="flex items-center gap-2 pl-2">
                          <Checkbox
                            aria-label="Select record"
                            checked={selected}
                            onCheckedChange={() => row.toggleSelected()}
                            className="bg-white"
                          />
                          {onRowExpand && (
                            <Button
                              type="button"
                              aria-label="Expand record"
                              title="Expand"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={() => onRowExpand(key)}
                              startIcon={<Maximize2 className="size-2" />}
                              variant={"outline"}
                              size="xs"
                              className="shadow-md opacity-0 group-hover/row:opacity-100 hover:bg-white hover:text-foreground focus-visible:opacity-100"
                            ></Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {row.getVisibleCells().map((cell, cellIndex) => (
                      <TableCell
                        key={cell.id}
                        style={pinStyle(pins[cellIndex])}
                        className={cn(
                          "overflow-hidden text-ellipsis border-r border-r-foreground/12 last:border-r-0 text-xs p-1",
                          pins[cellIndex] && "sticky z-[1] bg-inherit",
                          pinClass(pins[cellIndex]),
                          columnByKey.get(cell.column.id)?.className,
                        )}
                      >
                        {pinned && cellIndex === 0 ? (
                          <span className="flex items-center gap-1">
                            <Pin className="size-3 shrink-0 fill-current text-primary" />
                            <span className="min-w-0 truncate">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </span>
                          </span>
                        ) : (
                          flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )
                        )}
                      </TableCell>
                    ))}
                    {hasAddField && <TableCell className="p-0" />}
                  </RecordGridRow>
                );
              })}
            </SortableContext>
            {fillerRows?.map((filler) => (
              <TableRow
                key={`filler-${filler}`}
                style={fillerStyle}
                className="group/filler bg-background even:bg-table-stripe hover:bg-primary-10"
              >
                {selectable && (
                  <TableCell className="sticky left-0 z-[2] p-0 bg-inherit" />
                )}
                {headers.map((header, index) => (
                  <TableCell
                    key={header.id}
                    style={pinStyle(pins[index])}
                    className={cn(
                      "border-r border-r-foreground/12 p-1 last:border-r-0",
                      pins[index] && "sticky z-[1] bg-inherit",
                      pinClass(pins[index]),
                    )}
                  >
                    {index === 0 && onAdd && (
                      <span className="invisible group-hover/filler:visible">
                        <ModuleAddNewButton label={addLabel} onClick={onAdd} />
                      </span>
                    )}
                  </TableCell>
                ))}
                {hasAddField && <TableCell className="p-0" />}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DndContext>
      {onAddField && (
        <ModuleAddNewFieldDialog
          open={addingField}
          onOpenChange={setAddingField}
          onAdd={onAddField}
          takenNames={fieldNames}
        />
      )}
    </div>
  );
}
