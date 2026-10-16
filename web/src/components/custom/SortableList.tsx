import { useCallback, type ComponentProps, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { lockToVerticalAxis, useSortableRow } from "@/hooks/useSortableRow";

// dnd-kit reads out the dragged ids by default, which are GUIDs here
const ACCESSIBILITY = {
  announcements: {
    onDragStart: () => "Picked up. Use the arrow keys to move, space to drop.",
    onDragOver: () => "Moved.",
    onDragEnd: () => "Dropped.",
    onDragCancel: () => "Cancelled; the order is unchanged.",
  },
};

/**
 * A vertical list whose rows (each using useSortableRow) are dragged by their handle; with grid, items wrap and move both ways.
 * @example
 * <SortableList ids={ids} onReorder={setIds}>{rows}</SortableList>
 */
export function SortableList({
  ids,
  onReorder,
  grid = false,
  children,
}: {
  ids: string[];
  /** The same ids in their new order, after a drop. */
  onReorder: (ids: string[]) => void;
  /** Items sit in a wrapping grid; pass grid to useSortableRow too. */
  grid?: boolean;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const dragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active?.id === over?.id) return;
      onReorder(
        arrayMove(
          ids,
          ids.indexOf(String(active.id)),
          ids.indexOf(String(over.id)),
        ),
      );
    },
    [ids, onReorder],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={grid ? undefined : [lockToVerticalAxis]}
      onDragEnd={dragEnd}
      accessibility={ACCESSIBILITY}
    >
      <SortableContext
        items={ids}
        strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** The grip a SortableList row is dragged by; a click on it doesn't reach the row. */
export function SortableHandle({
  handle,
  label,
  className,
  ...props
}: Omit<ComponentProps<"button">, "ref"> & {
  handle: ReturnType<typeof useSortableRow>["handle"];
  /** What the row is, for "Drag to reorder …". */
  label?: string;
}) {
  return (
    <button
      type="button"
      {...handle}
      {...props}
      aria-label={`Drag to reorder ${label ?? ""}`.trim()}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-foreground/10 active:cursor-grabbing",
        className,
      )}
    >
      <GripVertical className="size-3.5" />
    </button>
  );
}
