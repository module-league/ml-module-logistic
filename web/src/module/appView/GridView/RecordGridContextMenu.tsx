import {
  EyeOff,
  Pencil,
  Pin,
  PinOff,
  Square,
  SquareCheck,
  Trash2,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@moduleleague/ui";
import type {
  RecordGridHeaderContextMenuProps,
  RecordGridRowContextMenuProps,
} from "../moduleAppView.types";

/** Right-click menu of a record row: pin, select, delete. Without any handler it renders the row alone. */
export function RecordGridRowContextMenu({
  rowKey,
  pinned,
  selected,
  onRowPinToggle,
  onSelectToggle,
  onRowDelete,
  children,
}: RecordGridRowContextMenuProps) {
  if (!onRowPinToggle && !onSelectToggle && !onRowDelete) return children;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-40">
        {onRowPinToggle && (
          <ContextMenuItem onSelect={() => onRowPinToggle(rowKey)}>
            {pinned ? <PinOff /> : <Pin />}
            {pinned ? "Unpin from top" : "Pin to top"}
          </ContextMenuItem>
        )}
        {onSelectToggle && (
          <ContextMenuItem onSelect={() => onSelectToggle(rowKey)}>
            {selected === true ? <Square /> : <SquareCheck />}
            {selected === true ? "Deselect" : "Select"}
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

/** Right-click menu of a header cell: edit, hide, delete the field. Without any handler it renders the cell alone. */
export function RecordGridHeaderContextMenu({
  columnKey,
  onColumnEdit,
  onColumnHide,
  onColumnDelete,
  children,
}: RecordGridHeaderContextMenuProps) {
  if (!onColumnEdit && !onColumnHide && !onColumnDelete) return children;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-40">
        {onColumnEdit && (
          <ContextMenuItem onSelect={() => onColumnEdit(columnKey)}>
            <Pencil />
            Edit field
          </ContextMenuItem>
        )}
        {onColumnEdit !== undefined &&
          (onColumnHide !== undefined || onColumnDelete !== undefined) && (
            <ContextMenuSeparator />
          )}
        {onColumnHide && (
          <ContextMenuItem onSelect={() => onColumnHide(columnKey)}>
            <EyeOff />
            Hide field
          </ContextMenuItem>
        )}
        {onColumnDelete && (
          <ContextMenuItem
            variant="destructive"
            onSelect={() => onColumnDelete(columnKey)}
          >
            <Trash2 />
            Delete field
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
