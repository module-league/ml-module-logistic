import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@moduleleague/ui";
import { useWorkspaceContext } from "../../context/workspace.context";
import type { SnapTarget, SplitEdge } from "../../services/workspace.types";

export const SNAP_PANEL_ID = "snap:panel";

const LAYOUTS: { label: string; edges: [SplitEdge, SplitEdge]; grid: string }[] = [
  { label: "Side by side", edges: ["left", "right"], grid: "grid-cols-2" },
  { label: "Stacked", edges: ["top", "bottom"], grid: "grid-rows-2" },
];

export function SnapLayoutDrawer() {
  const { setNodeRef } = useDroppable({ id: SNAP_PANEL_ID });

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center">
      <div
        ref={setNodeRef}
        className="animate-slide-up rounded-t-xl border border-b-0 bg-popover px-4 pt-2.5 pb-3 text-popover-foreground shadow-[0_-8px_24px_-6px_rgb(0_0_0/0.15)]"
      >
        <p className="mb-2 text-center text-xs text-muted-foreground">
          Drop on a half to split, on a pane to move the tab, or between tabs to reorder
        </p>
        <div className="flex gap-4">
          {LAYOUTS.map((layout) => (
            <div key={layout.label} className="flex flex-col items-center gap-1">
              <div className={cn("grid h-16 w-28 gap-1", layout.grid)}>
                {layout.edges.map((edge) => (
                  <SnapCell key={edge} edge={edge} />
                ))}
              </div>
              <span className="text-xs font-medium">{layout.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SnapCell({ edge }: { edge: SplitEdge }) {
  const { items, dragging } = useWorkspaceContext();
  const target: SnapTarget = useMemo(() => ({ snap: edge }), [edge]);
  const { setNodeRef, isOver } = useDroppable({ id: `snap:${edge}`, data: target });
  const Icon = useMemo(
    () => items?.find((item) => item?.keyValue === dragging?.key)?.icon,
    [items, dragging?.key],
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center justify-center rounded-md border bg-muted transition-colors",
        isOver && "border-primary bg-primary/15 text-primary",
      )}
    >
      {isOver && Icon && <Icon className="size-4" />}
    </div>
  );
}
