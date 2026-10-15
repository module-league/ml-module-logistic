import { useMemo } from "react";
import type { Modifier } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";

/** Moves a dragged row up and down only, and never past the list that holds it, so the list can't grow while dragging. */
export const lockToVerticalAxis: Modifier = ({
  transform,
  draggingNodeRect,
  containerNodeRect,
}) => {
  if (!draggingNodeRect || !containerNodeRect) return { ...transform, x: 0 };
  return {
    ...transform,
    x: 0,
    y: Math.min(
      Math.max(transform.y, containerNodeRect.top - draggingNodeRect.top),
      containerNodeRect.bottom - draggingNodeRect.bottom,
    ),
  };
};

/**
 * One row of a SortableList: put `ref` and `style` on the row and pass `handle` to its SortableHandle.
 * @example
 * const { ref, style, isDragging, handle } = useSortableRow(option.id);
 */
export function useSortableRow(id: string, disabled = false) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  const style = useMemo(
    () => ({
      transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
      transition,
    }),
    [transform, transition],
  );
  const handle = useMemo(
    () => ({ ref: setActivatorNodeRef, ...attributes, ...listeners }),
    [setActivatorNodeRef, attributes, listeners],
  );
  return { ref: setNodeRef, style, isDragging, handle };
}
