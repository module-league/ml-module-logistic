import { useCallback, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { cn, TableRow } from "@moduleleague/ui";
import type { RecordGridRowProps } from "../moduleAppView.types";
import { RecordGridRowContextMenu } from "./RecordGridContextMenu";
import { rowDragStyle } from "./RecordGrid.utils";

/** A record row that can be dragged up and down, with its right-click menu. */
export function RecordGridRow({
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
}: RecordGridRowProps) {
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
    () => rowDragStyle(transform, transition, pinnedTop),
    [transform, transition, pinnedTop],
  );

  return (
    <RecordGridRowContextMenu
      rowKey={rowKey}
      pinned={pinnedTop !== undefined}
      selected={selected}
      onRowPinToggle={onRowPinToggle}
      onSelectToggle={onSelectToggle}
      onRowDelete={onRowDelete}
    >
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
    </RecordGridRowContextMenu>
  );
}
