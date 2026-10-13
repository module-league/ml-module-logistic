import { memo, useMemo } from "react";
import QueryWrapper from "@/components/custom/QueryWrapper";
import type { GridViewProps } from "../moduleAppView.types";
import { RecordGrid } from "./RecordGrid";
import { Skeleton } from "@/ui-kit";

function GridViewComponent<T>({
  records,
  getKey,
  pinnedRows,
  page = 1,
  pageSize = 20,
  isLoading,
  error,
  onRetry,
  ...grid
}: GridViewProps<T>) {
  const pageRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    if (!pinnedRows?.length)
      return records?.slice(start, start + pageSize) ?? [];
    const byKey = new Map(records?.map((record) => [getKey(record), record]));
    const pinned = pinnedRows
      .map((key) => byKey.get(key))
      .filter((record): record is T => !!record);
    const rest =
      records?.filter((record) => !pinnedRows.includes(getKey(record))) ?? [];
    return [...pinned, ...rest.slice(start, start + pageSize)];
  }, [records, getKey, pinnedRows, page, pageSize]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <QueryWrapper
        isLoading={!!isLoading}
        error={error}
        onRetry={onRetry}
        renderLoader={GridLoadingSkeleton()}
      >
        <RecordGrid
          {...grid}
          records={pageRecords}
          getKey={getKey}
          pinnedRows={pinnedRows}
          pageSize={pageSize}
        />
      </QueryWrapper>
    </div>
  );
}

function GridLoadingSkeleton() {
  return (
    <div className="flex-1 w-full h-full">
      <Skeleton className="h-[28px] rounded-none" />

      <div className="flex flex-col">
        {Array(20)
          .fill(0)
          .map((_, index) => (
            <div key={index} className="p-4 flex gap-4 items-center border-b">
              <Skeleton className="h-[8px] w-[10px] bg-slate-300 rounded-full" />
              <div className="flex gap-4 flex-1">
                {Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-[8px] bg-slate-300 flex-1 rounded-full"
                    />
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export const GridView = memo(GridViewComponent) as typeof GridViewComponent;
