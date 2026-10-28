import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export interface KanbanColumn<T> {
  value: string;
  label: string;
  hint: string;
  items: T[];
}

const COLUMN_CLASS =
  "flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-muted/60 p-2 xl:w-auto xl:min-w-60 xl:flex-1";

/** Columns side by side, each with its label, hint and count over a scrolling list of cards; scrolls sideways when narrow. */
export function KanbanBoard<T>({
  columns,
  getKey,
  renderItem,
}: {
  columns: KanbanColumn<T>[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map((column) => (
        <section
          key={column.value}
          aria-label={column.label}
          className={COLUMN_CLASS}
        >
          <header className="flex items-start justify-between gap-2 px-1 pt-1">
            <div className="flex min-w-0 flex-col">
              <h2 className="truncate text-sm font-semibold">{column.label}</h2>
              <span className="truncate text-xs text-muted-foreground">
                {column.hint}
              </span>
            </div>
            <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs font-medium">
              {column.items.length}
            </span>
          </header>
          <div className="-mr-1 flex max-h-[70dvh] flex-col gap-2 overflow-y-auto overscroll-contain pr-1">
            {column.items.length > 0 ? (
              column.items.map((item) => (
                <div key={getKey(item)}>{renderItem(item)}</div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Nothing here.
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

export function KanbanBoardSkeleton({
  columns,
  label,
}: {
  columns: number;
  label: string;
}) {
  return (
    <div className="flex gap-3 overflow-hidden" aria-busy aria-label={label}>
      {Array.from({ length: columns }, (_, column) => (
        <div key={column} className={COLUMN_CLASS}>
          <Skeleton className="m-1 h-9 w-32" />
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-36 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
