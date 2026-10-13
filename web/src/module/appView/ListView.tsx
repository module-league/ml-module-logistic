import { useCallback, useMemo, useRef, useState } from "react";
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
import type { CheckedState } from "@radix-ui/react-checkbox";
import {
  Maximize2,
  Pin,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@moduleleague/ui";
import type {
  ModuleListHeaderCellProps,
  ModuleListViewProps,
  ModuleSortableRowProps,
} from "./moduleAppView.types";
import { ModuleEmptyAppView } from "./ModuleEmptyAppView";
import {
  COLUMN_WIDTH,
  lockToDragAxis,
  pinClass,
  pinStyle,
  sameKindCollision,
  toRowId,
} from "./ListView.utils";

export function ListView<T>({
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
}: ModuleListViewProps<T>) {
  const selectable = !!onSelectionChange;
  const pageKeys = useMemo(
    () => records?.map((record) => getKey(record)) ?? [],
    [records, getKey],
  );
  const pageSelection = useMemo<CheckedState>(() => {
    const ticked = pageKeys.filter((key) => selectedKeys?.includes(key)).length;
    if (!ticked) return false;
    return ticked === pageKeys.length ? true : "indeterminate";
  }, [pageKeys, selectedKeys]);
  const togglePage = useCallback(
    () =>
      onSelectionChange?.(
        pageSelection === true
          ? (selectedKeys ?? []).filter((key) => !pageKeys.includes(key))
          : [...new Set([...(selectedKeys ?? []), ...pageKeys])],
      ),
    [onSelectionChange, pageSelection, selectedKeys, pageKeys],
  );
  const toggleRow = useCallback(
    (key: string) =>
      onSelectionChange?.(
        selectedKeys?.includes(key)
          ? selectedKeys.filter((selected) => selected !== key)
          : [...(selectedKeys ?? []), key],
      ),
    [onSelectionChange, selectedKeys],
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
      records?.length
        ? Array.from(
            {
              length: Math.max(
                0,
                pageSize - (records.length - pinnedIndex.size),
              ),
            },
            (_, i) => i,
          )
        : [],
    [records?.length, pageSize, pinnedIndex],
  );
  const keys = useMemo(
    () => columns?.map((column) => column?.key) ?? [],
    [columns],
  );
  const widths = useMemo(
    () =>
      columns?.map((column, index) =>
        index === columns.length - 1
          ? undefined
          : (columnWidths?.[column?.key] ??
            column?.width ??
            COLUMN_WIDTH.default),
      ) ?? [],
    [columns, columnWidths],
  );
  const pins = useMemo(() => {
    let left = selectable ? COLUMN_WIDTH.select : 0;
    const pinnedCount =
      columns?.filter((column) => pinnedColumns?.includes(column?.key))
        .length ?? 0;
    return (
      columns?.map((column, index) => {
        if (!pinnedColumns?.includes(column?.key)) return undefined;
        const pin = { left, last: index === pinnedCount - 1 };
        left += widths[index] ?? COLUMN_WIDTH.last;
        return pin;
      }) ?? []
    );
  }, [columns, pinnedColumns, widths, selectable]);
  const tableStyle = useMemo(
    () => ({
      minWidth: widths.reduce<number>(
        (sum, width) => sum + (width ?? COLUMN_WIDTH.last),
        selectable ? COLUMN_WIDTH.select : 0,
      ),
    }),
    [widths, selectable],
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
            {columns?.map((column, index) => (
              <col key={column?.key} style={{ width: widths[index] }} />
            ))}
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
                {columns?.map((column, index) => (
                  <ListHeaderCell
                    key={column?.key}
                    column={column}
                    resizable={!!onColumnResize && index < columns.length - 1}
                    sortable={!!onColumnReorder}
                    onColumnResize={onColumnResize}
                    pin={pins[index]}
                    onColumnPinToggle={onColumnPinToggle}
                  />
                ))}
              </TableRow>
            </SortableContext>
          </TableHeader>
          <TableBody>
            {!records?.length && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={(columns?.length ?? 0) + (selectable ? 1 : 0)}
                >
                  <ModuleEmptyAppView {...empty} />
                </TableCell>
              </TableRow>
            )}
            <SortableContext
              items={rowIds}
              strategy={verticalListSortingStrategy}
            >
              {records?.map((record, index) => {
                const key = getKey(record);
                const selected = !!selectedKeys?.includes(key);
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
                            onCheckedChange={() => toggleRow(key)}
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
                    {columns?.map((column, columnIndex) => (
                      <TableCell
                        key={column.key}
                        style={pinStyle(pins[columnIndex])}
                        className={cn(
                          "overflow-hidden text-ellipsis border-r border-r-foreground/12 last:border-r-0 text-xs p-1",
                          pins[columnIndex] && "sticky z-[1] bg-inherit",
                          pinClass(pins[columnIndex]),
                          column?.className,
                        )}
                      >
                        {pinned && columnIndex === 0 ? (
                          <span className="flex items-center gap-1">
                            <Pin className="size-3 shrink-0 fill-current text-primary" />
                            <span className="min-w-0 truncate">
                              {column.cell(record)}
                            </span>
                          </span>
                        ) : (
                          column.cell(record)
                        )}
                      </TableCell>
                    ))}
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
                {columns?.map((column, index) => (
                  <TableCell
                    key={column.key}
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DndContext>
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

function ListHeaderCell<T>({
  column,
  resizable,
  sortable,
  onColumnResize,
  pin,
  onColumnPinToggle,
}: ModuleListHeaderCellProps<T>) {
  const { setNodeRef, listeners, transform, transition, isDragging } =
    useSortable({
      id: column?.key,
      data: { type: "column" },
      disabled: !sortable,
    });
  const cellRef = useRef<HTMLTableCellElement | null>(null);
  const resizeStart = useRef<{ x: number; width: number } | null>(null);
  const setRefs = useCallback(
    (node: HTMLTableCellElement | null) => {
      cellRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef],
  );
  const style = useMemo(
    () => ({
      ...pinStyle(pin),
      transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
      transition,
    }),
    [pin, transform, transition],
  );
  const label =
    typeof column?.header === "string" ? column.header : column?.key;

  return (
    <TableHead
      ref={setRefs}
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
        <span className="min-w-0 flex-1 truncate">{column?.header}</span>
        {onColumnPinToggle && (
          <button
            type="button"
            aria-label={pin ? `Unpin ${label}` : `Pin ${label}`}
            aria-pressed={!!pin}
            title={pin ? "Unpin column" : "Pin column"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onColumnPinToggle(column?.key)}
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
          className="absolute top-0 -right-1 z-10 h-full w-2 cursor-col-resize after:absolute after:inset-y-1 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:rounded-full hover:after:bg-primary"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            resizeStart.current = {
              x: e.clientX,
              width: cellRef.current?.getBoundingClientRect().width ?? 0,
            };
          }}
          onPointerMove={(e) => {
            const start = resizeStart.current;
            if (!start) return;
            onColumnResize?.(
              column?.key,
              Math.max(
                COLUMN_WIDTH.min,
                Math.round(start.width + e.clientX - start.x),
              ),
            );
          }}
          onPointerUp={() => (resizeStart.current = null)}
          onPointerCancel={() => (resizeStart.current = null)}
        />
      )}
    </TableHead>
  );
}
