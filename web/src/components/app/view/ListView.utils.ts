import {
  closestCenter,
  type CollisionDetection,
  type Modifier,
} from "@dnd-kit/core";
import type { ModuleColumnPin } from "../../../services/moduleAppView.types";

export const COLUMN_WIDTH = { default: 160, min: 64, last: 120, select: 36 };

export const toRowId = (key: string) => `row:${key}`;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Rows move up and down, columns sideways; each stays inside the element that holds it. */
export const lockToDragAxis: Modifier = ({
  transform,
  active,
  draggingNodeRect,
  containerNodeRect,
}) => {
  const isRow = active?.data?.current?.type === "row";
  if (!draggingNodeRect || !containerNodeRect) {
    return isRow ? { ...transform, x: 0 } : { ...transform, y: 0 };
  }
  return isRow
    ? {
        ...transform,
        x: 0,
        y: clamp(
          transform.y,
          containerNodeRect.top - draggingNodeRect.top,
          containerNodeRect.bottom - draggingNodeRect.bottom,
        ),
      }
    : {
        ...transform,
        y: 0,
        x: clamp(
          transform.x,
          containerNodeRect.left - draggingNodeRect.left,
          containerNodeRect.right - draggingNodeRect.right,
        ),
      };
};

/** A row only lands on rows, a column only on columns. */
export const sameKindCollision: CollisionDetection = (args) =>
  closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) =>
        container?.data?.current?.type === args.active?.data?.current?.type,
    ),
  });

export function pinStyle(pin: ModuleColumnPin | undefined) {
  return pin ? { left: pin.left } : undefined;
}

export function pinClass(pin: ModuleColumnPin | undefined) {
  if (!pin) return undefined;
  return pin.last ? "sticky-edge" : "sticky-line";
}
