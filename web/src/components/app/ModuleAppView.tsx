import { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { Layers, Pin, Plus } from "lucide-react";
import {
  Checkbox,
  cn,
  ModuleAddNewButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@moduleleague/ui";
import type {
  ModuleAppEmptyState,
  ModuleAppViewProps,
  ModuleCardGridProps,
  ModuleColumnPin,
  ModuleListHeaderCellProps,
  ModuleSortableRowProps,
  ModuleListViewProps,
} from "../../services/moduleAppView.types";

const GRID_PADDING = 16;
const GRID_GAP = 12;
const ESTIMATED_ROW_HEIGHT = 150;

function columnsFor(width: number) {
  if (width >= 900) return 3;
  if (width >= 560) return 2;
  return 1;
}

export function ModuleAppView<T>({
  records,
  getKey,
  columns,
  renderCard,
  appView = "list",
  pageSize = 20,
  page = 1,
  empty,
  columnWidths,
  onColumnResize,
  onColumnReorder,
  onAdd,
  addLabel,
  pinnedColumns,
  onColumnPinToggle,
  selectedKeys,
  onSelectionChange,
  onRowReorder,
}: ModuleAppViewProps<T>) {
  if (!appView) return <></>;
  const total = records?.length ?? 0;
  const visible = useMemo(
    () => records?.slice((page - 1) * pageSize, page * pageSize) ?? [],
    [records, page, pageSize],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {appView === "grid" && renderCard ? (
        total === 0 ? (
          <div className="min-h-0 flex-1 overflow-auto">
            <EmptyState {...empty} />
          </div>
        ) : (
          <VirtualCardGrid
            records={records}
            getKey={getKey}
            renderCard={renderCard}
          />
        )
      ) : (
        <ListView
          records={visible}
          pageSize={pageSize}
          onAdd={onAdd}
          addLabel={addLabel}
          getKey={getKey}
          columns={columns}
          empty={empty}
          columnWidths={columnWidths}
          onColumnResize={onColumnResize}
          onColumnReorder={onColumnReorder}
          pinnedColumns={pinnedColumns}
          onColumnPinToggle={onColumnPinToggle}
          selectedKeys={selectedKeys}
          onSelectionChange={onSelectionChange}
          onRowReorder={onRowReorder}
        />
      )}
    </div>
  );
}

const DEFAULT_COLUMN_WIDTH = 160;
const MIN_COLUMN_WIDTH = 64;
const LAST_COLUMN_MIN_WIDTH = 120;

const ROW_PREFIX = "row:";

const lockToDragAxis: Modifier = ({ transform, active }) =>
  active?.data?.current?.type === "row"
    ? { ...transform, x: 0 }
    : { ...transform, y: 0 };

const sameKindCollision: CollisionDetection = (args) =>
  closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) =>
        container?.data?.current?.type === args.active?.data?.current?.type,
    ),
  });

const PINNED_ROW_CELL =
  "sticky z-[1] bg-background group-even/row:bg-[color-mix(in_oklab,var(--muted)_30%,var(--background))] group-hover/row:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))]";
const PINNED_FILLER_CELL =
  "sticky z-[1] bg-background group-even/filler:bg-[color-mix(in_oklab,var(--muted)_30%,var(--background))] group-hover/filler:bg-primary-10";
const SELECT_COLUMN_WIDTH = 36;
const SELECTED_STICKY_CELL = "sticky z-[1] bg-primary-10";
const SELECT_HEAD_CELL =
  "bg-[color-mix(in_oklab,var(--foreground)_7%,var(--background))] shadow-[inset_-1px_0_0_color-mix(in_oklab,var(--foreground)_15%,transparent)]";
const PINNED_LINE =
  "border-r-0 shadow-[inset_-1px_0_0_color-mix(in_oklab,var(--foreground)_15%,transparent)]";
const PINNED_EDGE =
  "border-r-0 shadow-[inset_-1px_0_0_color-mix(in_oklab,var(--foreground)_20%,transparent),6px_0_8px_-6px_rgb(0_0_0/0.3)]";

function pinStyle(pin: ModuleColumnPin | undefined) {
  return pin ? { left: pin.left } : undefined;
}

function ListView<T>({
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
  const fillerStyle = useMemo(() => ({ height: rowHeight }), [rowHeight]);
  const fillerRows = useMemo(
    () =>
      records?.length
        ? Array.from(
            { length: Math.max(0, pageSize - records.length) },
            (_, i) => i,
          )
        : [],
    [records?.length, pageSize],
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
            DEFAULT_COLUMN_WIDTH),
      ) ?? [],
    [columns, columnWidths],
  );
  const pins = useMemo(() => {
    let left = selectable ? SELECT_COLUMN_WIDTH : 0;
    const pinnedCount =
      columns?.filter((column) => pinnedColumns?.includes(column?.key))
        .length ?? 0;
    return (
      columns?.map((column, index) => {
        if (!pinnedColumns?.includes(column?.key)) return undefined;
        const pin = { left, last: index === pinnedCount - 1 };
        left += widths[index] ?? LAST_COLUMN_MIN_WIDTH;
        return pin;
      }) ?? []
    );
  }, [columns, pinnedColumns, widths, selectable]);
  const tableStyle = useMemo(
    () => ({
      minWidth: widths.reduce<number>(
        (sum, width) => sum + (width ?? LAST_COLUMN_MIN_WIDTH),
        selectable ? SELECT_COLUMN_WIDTH : 0,
      ),
    }),
    [widths],
  );
  const rowIds = useMemo(
    () => pageKeys.map((key) => `${ROW_PREFIX}${key}`),
    [pageKeys],
  );
  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active?.id === over?.id) return;
      if (active?.data?.current?.type === "row") {
        onRowReorder?.(
          String(active.id).slice(ROW_PREFIX.length),
          String(over.id).slice(ROW_PREFIX.length),
        );
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
            {selectable && <col style={{ width: SELECT_COLUMN_WIDTH }} />}
            {columns?.map((column, index) => (
              <col key={column?.key} style={{ width: widths[index] }} />
            ))}
          </colgroup>
          <TableHeader className="sticky top-0 z-10 bg-background h-7">
            <SortableContext
              items={keys}
              strategy={horizontalListSortingStrategy}
            >
              <TableRow className="border-b-foreground/20 hover:bg-transparent">
                {selectable && (
                  <TableHead
                    className={cn(
                      "sticky left-0 z-20 h-4 px-0",
                      SELECT_HEAD_CELL,
                    )}
                  >
                    <span className="flex items-center justify-center">
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
                    onResize={onColumnResize}
                    pin={pins[index]}
                    onPinToggle={onColumnPinToggle}
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
                  <EmptyState {...empty} />
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
                return (
                  <SortableRow
                    key={key}
                    rowId={`${ROW_PREFIX}${key}`}
                    sortable={!!onRowReorder}
                    measureRef={index === 0 ? measureRow : undefined}
                    selected={selectable ? selected : undefined}
                    className={cn(
                      "group/row [&>td]:h-8",
                      "hover:bg-primary-10",
                      selected
                        ? "bg-primary-10 hover:bg-primary-10"
                        : "even:bg-muted/30",
                    )}
                  >
                    {selectable && (
                      <TableCell
                        className={cn(
                          "sticky left-0 z-[2] p-0",
                          selected ? SELECTED_STICKY_CELL : PINNED_ROW_CELL,
                          PINNED_LINE,
                        )}
                      >
                        <span className="flex items-center justify-center">
                          <Checkbox
                            aria-label="Select record"
                            checked={selected}
                            onCheckedChange={() => toggleRow(key)}
                          />
                        </span>
                      </TableCell>
                    )}
                    {columns?.map((column, columnIndex) => (
                      <TableCell
                        key={column.key}
                        style={pinStyle(pins[columnIndex])}
                        className={cn(
                          "overflow-hidden text-ellipsis border-r border-r-foreground/12 last:border-r-0 text-xs p-1",
                          pins[columnIndex] && [
                            selected ? SELECTED_STICKY_CELL : PINNED_ROW_CELL,
                            PINNED_LINE,
                          ],
                          pins[columnIndex]?.last && PINNED_EDGE,
                          column?.className,
                        )}
                      >
                        {column.cell(record)}
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
                className="group/filler even:bg-muted/30 hover:bg-primary-10"
              >
                {selectable && (
                  <TableCell
                    className={cn(
                      "sticky left-0 z-[2] p-0",
                      PINNED_FILLER_CELL,
                      PINNED_LINE,
                    )}
                  />
                )}
                {columns?.map((column, index) => (
                  <TableCell
                    key={column.key}
                    style={pinStyle(pins[index])}
                    className={cn(
                      "border-r border-r-foreground/12 p-1 last:border-r-0",
                      pins[index] && [PINNED_FILLER_CELL, PINNED_LINE],
                      pins[index]?.last && PINNED_EDGE,
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
  sortable,
  measureRef,
  selected,
  className,
  children,
}: ModuleSortableRowProps) {
  const { setNodeRef, listeners, transform, transition, isDragging } =
    useSortable({ id: rowId, data: { type: "row" }, disabled: !sortable });
  const setRefs = useCallback(
    (node: HTMLTableRowElement | null) => {
      setNodeRef(node);
      measureRef?.(node);
    },
    [setNodeRef, measureRef],
  );
  const style = useMemo(
    () => ({
      transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
      transition,
    }),
    [transform, transition],
  );

  return (
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
}

function ListHeaderCell<T>({
  column,
  resizable,
  sortable,
  onResize,
  pin,
  onPinToggle,
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
        "border-r-foreground/15 bg-[color-mix(in_oklab,var(--foreground)_7%,var(--background))] hover:bg-primary-10",
        sortable && "cursor-grab active:cursor-grabbing",
        pin && ["sticky z-20", PINNED_LINE],
        pin?.last && PINNED_EDGE,
        isDragging && "z-30 bg-primary-10 shadow-sm",
        column?.headerClassName,
      )}
    >
      <span className="flex items-center gap-1">
        <span className="min-w-0 flex-1 truncate">{column?.header}</span>
        {onPinToggle && (
          <button
            type="button"
            aria-label={pin ? `Unpin ${label}` : `Pin ${label}`}
            aria-pressed={!!pin}
            title={pin ? "Unpin column" : "Pin column"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onPinToggle(column?.key)}
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
            onResize?.(
              column?.key,
              Math.max(
                MIN_COLUMN_WIDTH,
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

function VirtualCardGrid<T>({
  records,
  getKey,
  renderCard,
}: ModuleCardGridProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setColumns(columnsFor(entry?.contentRect?.width ?? 0)),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const rowCount = Math.ceil((records?.length ?? 0) / columns);
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    paddingStart: GRID_PADDING,
    paddingEnd: GRID_PADDING - GRID_GAP,
    overscan: 3,
  });
  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }),
    [columns],
  );

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
      <div
        ref={measureRef}
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            data-index={row.index}
            ref={virtualizer.measureElement}
            className="absolute top-0 left-0 grid w-full px-4"
            style={{
              ...gridStyle,
              gap: GRID_GAP,
              paddingBottom: GRID_GAP,
              transform: `translateY(${row.start}px)`,
            }}
          >
            {records
              ?.slice(row.index * columns, row.index * columns + columns)
              .map((record) => (
                <div key={getKey(record)}>{renderCard(record)}</div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const BLUEPRINT_CORNERS = [
  "top-2 left-2",
  "top-2 right-2",
  "bottom-2 left-2",
  "bottom-2 right-2",
];

const BLUEPRINT = (
  <div aria-hidden className="relative h-40 w-full max-w-sm">
    <div className="absolute inset-0 [--grid:color-mix(in_oklab,var(--primary)_14%,transparent)] bg-[linear-gradient(to_right,var(--grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid)_1px,transparent_1px)] bg-size-[20px_20px] mask-[radial-gradient(ellipse_at_center,black_45%,transparent_100%)]" />
    {BLUEPRINT_CORNERS.map((corner) => (
      <Plus
        key={corner}
        strokeWidth={1.5}
        className={cn("absolute size-3.5 text-primary/60", corner)}
      />
    ))}
    <div className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-primary-20 bg-background text-primary shadow-[0_10px_24px_-8px_color-mix(in_oklab,var(--primary)_35%,transparent)]">
      <Layers className="size-7" strokeWidth={1.75} />
    </div>
  </div>
);

const EmptyState = memo(function EmptyState({
  title = "No records yet",
  description = "Records you create will show up here.",
  actionLabel,
  onAction,
}: ModuleAppEmptyState) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      {BLUEPRINT}
      <p className="mt-2 font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <ModuleAddNewButton
          label={actionLabel}
          onClick={onAction}
          className="mt-1"
        />
      )}
    </div>
  );
});
