import { useCallback, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ModuleCardGridProps } from "../../../services/modules/moduleAppView.types";
import { columnsFor } from "./GridView.utils";

export function GridView<T>({
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
    estimateSize: () => 150,
    paddingStart: 16,
    paddingEnd: 4,
    overscan: 3,
  });
  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }),
    [columns],
  );

  if (!records?.length) return null;

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
            className="absolute top-0 left-0 grid w-full gap-3 px-4 pb-3"
            style={{ ...gridStyle, transform: `translateY(${row.start}px)` }}
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
