import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Layers, Plus } from "lucide-react";
import {
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
          getKey={getKey}
          columns={columns}
          empty={empty}
        />
      )}
    </div>
  );
}

function ListView<T>({
  records,
  getKey,
  columns,
  empty,
}: ModuleListViewProps<T>) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <Table containerClassName="overflow-visible">
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow className="bg-muted/50">
            {columns?.map((column) => (
              <TableHead key={column.key} className={column?.headerClassName}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {!records?.length && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns?.length}>
                <EmptyState {...empty} />
              </TableCell>
            </TableRow>
          )}
          {records?.map((record) => (
            <TableRow key={getKey(record)}>
              {columns?.map((column) => (
                <TableCell key={column.key} className={column?.className}>
                  {column.cell(record)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
