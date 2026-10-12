import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@moduleleague/ui";
import type { ModulePageFooterProps } from "../../services/moduleAppView.types";

export function ModulePageFooter({
  total,
  page,
  pageSize,
  appView,
  onPageChange,
}: ModulePageFooterProps) {
  const paginated = appView !== "grid";
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize],
  );
  const range = useMemo(
    () =>
      paginated && total > pageSize
        ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`
        : null,
    [paginated, total, page, pageSize],
  );

  return (
    <footer className="h-9 overflow-hidden flex shrink-0 items-center gap-2 border-t bg-background px-4 py-2 text-sm text-muted-foreground">
      <span className="flex items-center truncate">
        <span className="font-medium text-foreground tabular-nums">
          {total}
        </span>
        &nbsp;
        {total === 1 ? "record" : "records"}
        {range && <span className="ml-2 tabular-nums">· Showing {range}</span>}
      </span>

      {paginated && (
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
      )}
    </footer>
  );
}
