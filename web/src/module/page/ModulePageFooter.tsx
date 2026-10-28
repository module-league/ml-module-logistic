import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@moduleleague/ui";
import type { ModulePageFooterProps } from "./modulePage.types";

export function ModulePageFooter({
  total,
  page,
  pageSize,
  onPageChange,
  selectedCount = 0,
  onClearSelection,
  pinnedCount = 0,
}: ModulePageFooterProps) {
  const paged = total - pinnedCount;
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(paged / pageSize)),
    [paged, pageSize],
  );
  const range = useMemo(
    () =>
      paged > pageSize
        ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, paged)} of ${paged}`
        : null,
    [paged, page, pageSize],
  );

  return (
    <footer className="h-9 overflow-hidden flex shrink-0 items-center gap-2 border-t bg-background px-4 py-2 text-sm text-muted-foreground">
      <span className="flex items-center truncate">
        <span className="font-medium text-foreground tabular-nums">
          {total}
        </span>
        &nbsp;
        {total === 1 ? "record" : "records"}
        {pinnedCount > 0 && (
          <span className="ml-2 tabular-nums">· {pinnedCount} pinned</span>
        )}
        {range != null && range !== "" && (
          <span className="ml-2 tabular-nums">· Showing {range}</span>
        )}
        {selectedCount > 0 && (
          <span className="ml-2 flex items-center gap-1.5 text-primary">
            ·
            <span className="font-medium tabular-nums">
              {selectedCount} selected
            </span>
            {onClearSelection && (
              <Button variant="outline" size="xs" onClick={onClearSelection}>
                Clear
              </Button>
            )}
          </span>
        )}
      </span>

      <div className="ml-auto flex items-center gap-2 overflow-hidden">
        <span className="text-xs tabular-nums truncate">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="xs"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          startIcon={<ChevronLeft size={13} />}
        ></Button>
        <Button
          variant="outline"
          size="xs"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          startIcon={<ChevronRight size={13} />}
        ></Button>
      </div>
    </footer>
  );
}
