import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { flexRender } from "@tanstack/react-table";
import { Pin } from "lucide-react";
import { cn, TableHead } from "@moduleleague/ui";
import type { RecordGridHeaderCellProps } from "../moduleAppView.types";
import { RecordGridHeaderContextMenu } from "./RecordGridContextMenu";
import { columnDragStyle, columnLabel, pinClass } from "./RecordGrid.utils";

/** A header cell that can be dragged sideways, pinned and resized, with its right-click menu. */
export function RecordGridHeaderCell<T>({
  header,
  column,
  sortable,
  pin,
  onColumnPinToggle,
  onColumnEdit,
  onColumnHide,
  onColumnDelete,
}: RecordGridHeaderCellProps<T>) {
  const { setNodeRef, listeners, transform, transition, isDragging } =
    useSortable({
      id: header.id,
      data: { type: "column" },
      disabled: !sortable,
    });
  const style = useMemo(
    () => columnDragStyle(transform, transition, pin),
    [transform, transition, pin],
  );
  const label = columnLabel(column, header.id);
  const resizable = header.column.getCanResize();

  return (
    <RecordGridHeaderContextMenu
      columnKey={header.id}
      onColumnEdit={column?.system ? undefined : onColumnEdit}
      onColumnHide={onColumnHide}
      onColumnDelete={column?.system ? undefined : onColumnDelete}
    >
      <TableHead
        ref={setNodeRef}
        style={style}
        {...(sortable ? listeners : {})}
        className={cn(
          "group/head relative border-r select-none last:border-r-0 h-4 font-[family-name:Calibri]",
          "border-r-foreground/15 bg-table-head hover:bg-primary-10 data-[state=open]:bg-primary-10",
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
    </RecordGridHeaderContextMenu>
  );
}
