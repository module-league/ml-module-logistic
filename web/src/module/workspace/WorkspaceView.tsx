import { Fragment, Suspense, useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Group, Panel, useDefaultLayout } from "react-resizable-panels";
import { cn, Skeleton, useIsMobile } from "@moduleleague/ui";
import { ResizeSeparator } from "@/components/custom/ResizeSeparator";
import { ModuleViewerTab } from "./ModuleViewerTab";
import { SNAP_PANEL_ID, SnapLayoutDrawer } from "./SnapLayoutDrawer";
import { NavItemContext } from "@/module/shell/navItem.context";
import { flattenNavItems } from "@/module/shell/nav.utils";
import type { IModuleConfig } from "@/module/shell/module.types";
import {
  WorkspaceContext,
  useWorkspaceContext,
  type DraggedTab,
  type WorkspaceContextValue,
} from "./workspace.context";
import {
  canDrop,
  findPane,
  firstPane,
  focusedKey,
  moveTab,
  reorderTab,
  snapTab,
  useWorkspace,
  workspaceKey,
} from "./workspace.utils";
import type {
  DropTarget,
  DropZone,
  LayoutNode,
  PaneNode,
  SnapTarget,
  SplitEdge,
  SplitNode,
} from "./workspace.types";

// Panes can't be resized smaller than this (px).
const MIN_PANE_SIZE = 280;

const EDGES: SplitEdge[] = ["left", "right", "top", "bottom"];

// Where the pointer has to be for each zone; they don't overlap.
const HIT_AREA: Record<DropZone, string> = {
  left: "inset-y-0 left-0 w-1/4",
  right: "inset-y-0 right-0 w-1/4",
  top: "top-0 right-1/4 left-1/4 h-1/4",
  bottom: "right-1/4 bottom-0 left-1/4 h-1/4",
  center: "inset-x-1/4 inset-y-1/4",
};

/** Preview of where the tab will end up. */
const PREVIEW: Record<DropZone, string> = {
  left: "inset-y-0 left-0 w-1/2",
  right: "inset-y-0 right-0 w-1/2",
  top: "inset-x-0 top-0 h-1/2",
  bottom: "inset-x-0 bottom-0 h-1/2",
  center: "inset-0",
};

// The snap drawer sits on top of the panes, so its halves win over the drop zones under it
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const snapCells = hits.filter(
    (hit) => String(hit.id).startsWith("snap:") && hit.id !== SNAP_PANEL_ID,
  );
  if (snapCells.length > 0) return snapCells;
  const panel = hits.filter((hit) => hit.id === SNAP_PANEL_ID);
  if (panel.length > 0) return panel;
  const tabs = hits.filter((hit) => {
    const container: unknown = hit.data?.droppableContainer;
    return (
      container instanceof Object &&
      "data" in container &&
      container.data instanceof Object &&
      "current" in container.data &&
      container.data.current instanceof Object &&
      "key" in container.data.current
    );
  });
  return tabs.length > 0 ? tabs : hits;
};

export function WorkspaceView({ config }: { config: IModuleConfig }) {
  const storageKey = workspaceKey(config.code);
  const workspace = useWorkspace(storageKey);
  console.log(workspace);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [dragging, setDragging] = useState<DraggedTab | null>(null);
  // A small move starts a drag, so a plain click on a tab still switches to it
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Kept stable between renders so the panes' and tabs' memoized values and handlers stay cached
  const items = useMemo(() => flattenNavItems(config), [config]);
  const goTo = useCallback(
    (key: string | null) => {
      if (key != null && key !== "") void navigate(`/${key}`);
    },
    [navigate],
  );
  const context = useMemo<WorkspaceContextValue>(
    () => ({
      config,
      storageKey,
      workspace,
      items,
      dragging,
      canSplit: !isMobile,
      goTo,
    }),
    [config, storageKey, workspace, items, dragging, isMobile, goTo],
  );

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null);
    const tab = event.active.data.current as DraggedTab | undefined;
    const target = event.over?.data.current as
      DropTarget | SnapTarget | DraggedTab | undefined;
    if (!tab || !target) return;
    if ("key" in target) {
      if (target.key === tab.key && target.fromPaneId === tab.fromPaneId)
        return;
      if (target.fromPaneId !== tab.fromPaneId) {
        moveTab(storageKey, tab.key, tab.fromPaneId, {
          paneId: target.fromPaneId,
          zone: "center",
        });
      }
      context.goTo(
        focusedKey(
          reorderTab(storageKey, target.fromPaneId, tab.key, target.key),
        ),
      );
      return;
    }
    const next =
      "snap" in target
        ? snapTab(storageKey, tab.key, tab.fromPaneId, target.snap)
        : moveTab(storageKey, tab.key, tab.fromPaneId, target);
    context.goTo(focusedKey(next));
  }

  // Phones show only the focused pane, full size
  const root: LayoutNode = isMobile
    ? (findPane(workspace.root, workspace.currentViewerId) ??
      firstPane(workspace.root))
    : workspace.root;

  return (
    <WorkspaceContext.Provider value={context}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={(event) =>
          setDragging(event.active.data.current as DraggedTab)
        }
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="min-h-0 flex-1">
          <LayoutNodeView node={root} />
        </div>

        {createPortal(
          <>
            {dragging && <SnapLayoutDrawer />}
            <DragOverlay dropAnimation={null}>
              {dragging && <DraggedTabChip tab={dragging} />}
            </DragOverlay>
          </>,
          document.body,
        )}
      </DndContext>
    </WorkspaceContext.Provider>
  );
}

function LayoutNodeView({ node }: { node: LayoutNode }) {
  return node.type === "split" ? (
    <SplitView node={node} />
  ) : (
    <PaneView pane={node} />
  );
}

/** Panes side by side or stacked, resizable; sizes are remembered per split. */
function SplitView({ node }: { node: SplitNode }) {
  const { storageKey } = useWorkspaceContext();
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: `${storageKey}:${node.id}`,
    panelIds: node.children?.map((child) => child.id) ?? [],
  });

  return (
    <Group
      orientation={node.orientation}
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      resizeTargetMinimumSize={{ fine: 12, coarse: 24 }}
      disableCursor
    >
      {node.children?.map((child, index) => (
        <Fragment key={child.id}>
          {index > 0 && (
            <ResizeSeparator
              orientation={node.orientation}
              className="shadow-sm bg-background bg-sidebar-accent data-[separator=active]:bg-primary data-[separator=hover]:bg-primary"
            />
          )}
          <Panel id={child.id} minSize={MIN_PANE_SIZE}>
            <LayoutNodeView node={child} />
          </Panel>
        </Fragment>
      ))}
    </Group>
  );
}

/** One pane: its tab strip, then its active page. */
function PaneView({ pane }: { pane: PaneNode }) {
  const { workspace, items, dragging, goTo } = useWorkspaceContext();
  const focused = pane.id === workspace.currentViewerId;
  const active = items.find((item) => item.sidebarId === pane.activeKey);

  return (
    <section
      aria-label={active?.sidebarText ?? "Empty pane"}
      className="flex h-full min-h-0 flex-col"
      // Clicking anywhere in another pane focuses it, and the URL follows
      onPointerDownCapture={() => {
        if (!focused) goTo(pane.activeKey);
      }}
    >
      <ModuleViewerTab pane={pane} focused={focused} />
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 overflow-auto bg-muted/40">
          <div className="flex h-full min-h-0 w-full flex-col">
            {active ? (
              <NavItemContext.Provider value={active}>
                <Suspense fallback={<PageLoading />}>
                  <active.page />
                </Suspense>
              </NavItemContext.Provider>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Drop a tab here, or pick a page from the sidebar.
              </p>
            )}
          </div>
        </div>
        {dragging && <PaneDropZones pane={pane} dragging={dragging} />}
      </div>
    </section>
  );
}

/** While a tab is dragged: drop on an edge to split this pane, or in the middle to move the tab here. */
function PaneDropZones({
  pane,
  dragging,
}: {
  pane: PaneNode;
  dragging: DraggedTab;
}) {
  const { workspace } = useWorkspaceContext();
  // Only the zones a drop would do something in; fixed for the whole drag, so worked out once
  const zones = useMemo(
    () =>
      (["center", ...EDGES] as DropZone[]).filter((zone) =>
        canDrop(workspace, dragging.fromPaneId, { paneId: pane.id, zone }),
      ),
    [workspace, dragging.fromPaneId, pane.id],
  );
  const edgesAllowed = zones.some((zone) => zone !== "center");

  return (
    <div className="absolute inset-0 z-30">
      {zones.map((zone) => (
        <DropZoneArea
          key={zone}
          paneId={pane.id}
          zone={zone}
          fill={zone === "center" && !edgesAllowed}
        />
      ))}
    </div>
  );
}

function DropZoneArea({
  paneId,
  zone,
  fill,
}: {
  paneId: string;
  zone: DropZone;
  fill: boolean;
}) {
  const target: DropTarget = { paneId, zone };
  const { setNodeRef, isOver } = useDroppable({
    id: `${paneId}:${zone}`,
    data: target,
  });

  return (
    <>
      <div
        ref={setNodeRef}
        className={cn("absolute", fill ? "inset-0" : HIT_AREA[zone])}
      />
      {isOver && (
        <div
          className={cn(
            "pointer-events-none absolute m-2 rounded-lg border-2 border-primary bg-primary/10 transition-all",
            PREVIEW[zone],
          )}
        />
      )}
    </>
  );
}

/** The tab that follows the pointer while dragging. */
function DraggedTabChip({ tab }: { tab: DraggedTab }) {
  const { items } = useWorkspaceContext();
  const item = items.find((entry) => entry.sidebarId === tab.key);
  if (!item) return null;
  const Icon = item.sidebarIcon;
  return (
    // Fills the drag overlay, which takes the size of the dragged tab
    <div className="flex h-7 w-full cursor-grabbing items-center gap-1.5 rounded-md border bg-background px-2.5 text-sm font-medium text-primary shadow-lg">
      {Icon && <Icon className="size-5" />}
      <span>{item.sidebarText}</span>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
