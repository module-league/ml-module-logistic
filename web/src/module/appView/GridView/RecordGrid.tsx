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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnPinningState,
  type ColumnSizingState,
  type RowSelectionState,
  type Updater,
} from "@tanstack/react-table";
import type { CheckedState } from "@radix-ui/react-checkbox";
import {
  Maximize2,
  Pin,
  Plus,
  PinOff,
  Square,
  SquareCheck,
  Trash2,
} from "lucide-react";
import {
  Button,
  Checkbox,
  cn,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ModuleAddNewButton,
  ModuleAddNewFieldDialog,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@moduleleague/ui";
import type {
  ModuleColumnPin,
  ModuleSortableRowProps,
  RecordGridHeaderCellProps,
  RecordGridProps,
} from "../moduleAppView.types";
import { RecordGridEmpty } from "./RecordGridEmpty";
import {
  COLUMN_WIDTH,
  lockToDragAxis,
  pinClass,
  pinStyle,
  sameKindCollision,
  toRowId,
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
    () =>
      columns?.map((column) =>
        typeof column?.header === "string" ? column.header : column?.key,
      ) ?? [],
    [columns],
  );
  const data = useMemo(() => records ?? [], [records]);
  const columnByKey = useMemo(
    () => new Map(columns?.map((column) => [column?.key, column])),
    [columns],
  );
  const columnDefs = useMemo<ColumnDef<T>[]>(
    () =>
      columns?.map((column, index) => ({
        id: column?.key,
        header: () => column?.header,
        cell: ({ row }) => column?.cell(row.original),
        size: column?.width ?? COLUMN_WIDTH.default,
        minSize: COLUMN_WIDTH.min,
        enableResizing: hasAddField || index < columns.length - 1,
      })) ?? [],
    [columns, hasAddField],
  );
  const rowSelection = useMemo<RowSelectionState>(
    () => Object.fromEntries(selectedKeys?.map((key) => [key, true]) ?? []),
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
    (updater: Updater<RowSelectionState>) => {
      const next = functionalUpdate(updater, rowSelection);
      onSelectionChange?.(Object.keys(next).filter((key) => next[key]));
    },
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
  const pageSelection: CheckedState = table.getIsAllPageRowsSelected()
    ? true
    : table.getIsSomePageRowsSelected()
      ? "indeterminate"
      : false;
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
    () =>
      new Map(
        pinnedRows
          ?.filter((key) => pageKeys.includes(key))
          .map((key, index) => [key, index]),
      ),
    [pinnedRows, pageKeys],
  );
  const fillerStyle = useMemo(() => ({ height: rowHeight }), [rowHeight]);
  const fillerRows = useMemo(
    () =>
      rows.length
        ? Array.from(
            {
              length: Math.max(0, pageSize - (rows.length - pinnedIndex.size)),
            },
            (_, i) => i,
          )
        : [],
    [rows.length, pageSize, pinnedIndex],
  );
  const keys = useMemo(() => headers.map((header) => header.id), [headers]);
  const widths = useMemo(
    () =>
      headers.map((header, index) =>
        !hasAddField && index === headers.length - 1
          ? undefined
          : (columnSizing[header.id] ?? header.getSize()),
      ),
    [headers, columnSizing, hasAddField],
  );
  const pins = useMemo(() => {
    let left = selectable ? COLUMN_WIDTH.select : 0;
    return headers.map((header, index): ModuleColumnPin | undefined => {
      if (!header.column.getIsPinned()) return undefined;
      const pin = { left, last: header.column.getIsLastColumn("left") };
      left += widths[index] ?? COLUMN_WIDTH.last;
      return pin;
    });
  }, [headers, widths, selectable]);
  const tableStyle = useMemo(
    () => ({
      minWidth: widths.reduce<number>(
        (sum, width) => sum + (width ?? COLUMN_WIDTH.last),
        (selectable ? COLUMN_WIDTH.select : 0) +
          (hasAddField ? COLUMN_WIDTH.addField : 0),
      ),
    }),
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
                  <SortableRow
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
                      "group/row [&>td]:h-8",
                      selected
                        ? "bg-primary-10 hover:bg-primary-10"
                        : "bg-background even:bg-table-stripe hover:bg-primary-10 data-[state=open]:bg-primary-10",
                      pinned && "sticky z-[5]",
                      pinned &&
                        pinnedAt === pinnedIndex.size - 1 &&
                        "sticky-row-edge",
                    )}
                  >
                    {selectable && (
                      <TableCell className="sticky left-0 z-[2] p-0 bg-inherit">
                        <div className="flex items-center gap-2 pl-2">
                          <Checkbox
                            aria-label="Select record"
                            checked={selected}
                            onCheckedChange={() => row.toggleSelected()}
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
                              className="shadow-md opacity-0 group-hover/row:opacity-100 hover:bg-foreground/10 hover:text-foreground focus-visible:opacity-100"
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
                  </SortableRow>
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

function SortableRow({
  rowId,
  rowKey,
  sortable,
  measureRef,
  selected,
  pinnedTop,
  className,
  children,
  onRowPinToggle,
  onSelectToggle,
  onRowDelete,
}: ModuleSortableRowProps) {
  const { setNodeRef, listeners, transform, transition, isDragging } =
    useSortable({
      id: rowId,
      data: { type: "row", key: rowKey },
      disabled: !sortable,
    });
  const setRefs = useCallback(
    (node: HTMLTableRowElement | null) => {
      setNodeRef(node);
      measureRef?.(node);
    },
    [setNodeRef, measureRef],
  );
  const style = useMemo(
    () => ({
      top: pinnedTop,
      transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
      transition,
    }),
    [pinnedTop, transform, transition],
  );
  const pinned = pinnedTop !== undefined;

  const row = (
    <TableRow
      ref={setRefs}
      style={style}
      aria-selected={selected}
      {...(sortable ? listeners : {})}
      className={cn(
        className,
        sortable && "cursor-grab active:cursor-grabbing",
        isDragging && "relative z-10 bg-background shadow-md",
      )}
    >
      {children}
    </TableRow>
  );

  if (!onRowPinToggle && !onSelectToggle && !onRowDelete) return row;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-40">
        {onRowPinToggle && (
          <ContextMenuItem onSelect={() => onRowPinToggle(rowKey)}>
            {pinned ? <PinOff /> : <Pin />}
            {pinned ? "Unpin from top" : "Pin to top"}
          </ContextMenuItem>
        )}
        {onSelectToggle && (
          <ContextMenuItem onSelect={() => onSelectToggle(rowKey)}>
            {selected ? <Square /> : <SquareCheck />}
            {selected ? "Deselect" : "Select"}
          </ContextMenuItem>
        )}
        {onRowDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              variant="destructive"
              onSelect={() => onRowDelete(rowKey)}
            >
              <Trash2 />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function RecordGridHeaderCell<T>({
  header,
  column,
  sortable,
  pin,
  onColumnPinToggle,
}: RecordGridHeaderCellProps<T>) {
  const { setNodeRef, listeners, transform, transition, isDragging } =
    useSortable({
      id: header.id,
      data: { type: "column" },
      disabled: !sortable,
    });
  const style = useMemo(
    () => ({
      ...pinStyle(pin),
      transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
      transition,
    }),
    [pin, transform, transition],
  );
  const label = typeof column?.header === "string" ? column.header : header.id;
  const resizable = header.column.getCanResize();

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      {...(sortable ? listeners : {})}
      className={cn(
        "group/head relative border-r select-none last:border-r-0 h-4",
        "border-r-foreground/15 bg-table-head hover:bg-primary-10",
        sortable && "cursor-grab active:cursor-grabbing",
        pin && "sticky z-20",
        pinClass(pin),
        isDragging && "z-30 bg-primary-10 shadow-sm",
        column?.headerClassName,
      )}
    >
      <span className="flex items-center gap-1">
        {column?.icon}
        <span className="min-w-0 flex-1 truncate">
          {flexRender(header.column.columnDef.header, header.getContext())}
        </span>
        {onColumnPinToggle && (
          <button
            type="button"
            aria-label={pin ? `Unpin ${label}` : `Pin ${label}`}
            aria-pressed={!!pin}
            title={pin ? "Unpin column" : "Pin column"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onColumnPinToggle(header.id)}
            className={cn(
              "flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
              pin
                ? "text-primary"
                : "opacity-0 group-hover/head:opacity-100 focus-visible:opacity-100",
            )}
          >
            <Pin className={cn("size-3.5", pin && "fill-current")} />
          </button>
        )}
      </span>
      {resizable && (
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label}`}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={cn(
            "absolute top-0 -right-1 z-10 h-full w-2 cursor-col-resize touch-none after:absolute after:inset-y-1 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:rounded-full hover:after:bg-primary",
            header.column.getIsResizing() && "after:bg-primary",
          )}
        />
      )}
    </TableHead>
  );
}
