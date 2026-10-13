import { useCallback, useMemo } from "react";
import { NavLink, useNavigation } from "react-router";
import { useDroppable } from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { Columns2, GripVertical, Rows2 } from "lucide-react";
import {
  cn,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  Spinner,
} from "@moduleleague/ui";
import { XIcon } from "@/components/custom/XIcon";
import type { INavItemConfig } from "../../services/module.types";
import {
  useWorkspaceContext,
  type DraggedTab,
} from "../../context/workspace.context";
import {
  canDrop,
  closeTab,
  focusedKey,
  listPanes,
  moveTab,
} from "../../lib/workspaceUtil";
import type {
  DropTarget,
  PaneNode,
  SplitEdge,
} from "../../services/workspace.types";

export function ModuleViewerTab({
  pane,
  focused,
}: {
  pane: PaneNode;
  focused: boolean;
}) {
  const { workspace, items, dragging } = useWorkspaceContext();

  const tabs = useMemo(
    () =>
      pane.tabs
        .map((key) => items.find((item) => item.sidebarId === key))
        .filter((item): item is INavItemConfig => item !== undefined),
    [pane.tabs, items],
  );
  const totalTabs = useMemo(
    () =>
      listPanes(workspace.root).reduce(
        (count, entry) => count + entry.tabs.length,
        0,
      ),
    [workspace.root],
  );

  const tabIds = useMemo(
    () => tabs.map((tab) => `${pane.id}:${tab.sidebarId}`),
    [tabs, pane.id],
  );

  const strip: DropTarget = { paneId: pane.id, zone: "center" };
  const { setNodeRef, isOver } = useDroppable({
    id: `${pane.id}:strip`,
    data: strip,
    disabled: !dragging || dragging.fromPaneId === pane.id,
  });

  return (
    <nav
      ref={setNodeRef}
      aria-label="Open pages"
      className={cn(
        "flex min-h-11 shrink-0 items-center gap-1 overflow-x-auto border-b bg-background px-2 py-1.5 transition-colors [scrollbar-width:none]",
        isOver && "bg-primary-10",
      )}
    >
      <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
        {tabs.map((tab) => (
          <WorkspaceViewerTab
            key={tab.sidebarId}
            pane={pane}
            item={tab}
            active={tab.sidebarId === pane.activeKey}
            focused={focused}
            closable={totalTabs > 1}
            movable={totalTabs > 1}
          />
        ))}
      </SortableContext>
    </nav>
  );
}

function WorkspaceViewerTab({
  pane,
  item,
  active,
  focused,
  closable,
  movable,
}: {
  pane: PaneNode;
  item: INavItemConfig;
  active: boolean;
  focused: boolean;
  closable: boolean;
  /** False when a drag could not go anywhere (the only tab in the workspace). */
  movable: boolean;
}) {
  const { workspace, storageKey, canSplit, goTo } = useWorkspaceContext();
  const draggable = canSplit && movable;
  const tab: DraggedTab = { key: item.sidebarId, fromPaneId: pane.id };
  // setNodeRef: the whole tab (what moves and what other tabs are dropped on).
  // setActivatorNodeRef + listeners: the grip (the only place a drag can start).
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    isDragging,
    transform,
    transition,
  } = useSortable({
    id: `${pane.id}:${item.sidebarId}`,
    data: tab,
    disabled: !draggable,
  });
  const sortStyle = useMemo(
    () => ({
      transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
      transition,
    }),
    [transform, transition],
  );
  const Icon = item.sidebarIcon;
  const path = `/${item.sidebarId}`;
  // The router is still navigating to this tab's page (what NavLink calls isPending)
  const pending = useNavigation().location?.pathname === path;

  // Which splits the right-click menu offers; only changes when the layout does, not on hover or drag
  const canSplitTo = useMemo(() => {
    const allowed = (edge: SplitEdge) =>
      canSplit && canDrop(workspace, pane.id, { paneId: pane.id, zone: edge });
    return { right: allowed("right"), bottom: allowed("bottom") };
  }, [canSplit, workspace, pane.id]);

  const split = useCallback(
    (edge: SplitEdge) =>
      goTo(
        focusedKey(
          moveTab(storageKey, item.sidebarId, pane.id, {
            paneId: pane.id,
            zone: edge,
          }),
        ),
      ),
    [goTo, storageKey, item.sidebarId, pane.id],
  );
  const close = useCallback(
    () => goTo(focusedKey(closeTab(storageKey, pane.id, item.sidebarId))),
    [goTo, storageKey, pane.id, item.sidebarId],
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={sortStyle}
          className={cn(
            "group flex h-7 shrink-0 items-center rounded-md pl-1.5 text-sm transition-colors",
            active
              ? focused
                ? "bg-primary-10 text-primary"
                : "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            isDragging && "opacity-40",
          )}
        >
          <span className="flex size-5 shrink-0 items-center justify-center">
            {pending ? (
              <Spinner />
            ) : (
              <>
                {Icon && (
                  <Icon
                    className={cn(
                      "size-4",
                      draggable && "group-hover:hidden",
                      isDragging && "hidden",
                    )}
                  />
                )}
                {draggable && (
                  <button
                    ref={setActivatorNodeRef}
                    {...listeners}
                    type="button"
                    // Pointer only: the right-click menu offers the same moves from the keyboard
                    tabIndex={-1}
                    aria-label={`Drag ${item.sidebarText} to move or split`}
                    title="Drag to move or split"
                    className={cn(
                      "hidden size-5 cursor-grab items-center justify-center rounded hover:bg-foreground/10 active:cursor-grabbing group-hover:flex",
                      isDragging && "flex",
                    )}
                  >
                    <GripVertical className="size-3.5" />
                  </button>
                )}
              </>
            )}
          </span>

          <NavLink
            to={path}
            title={item.sidebarDesc}
            draggable={false}
            className="flex h-full items-center pr-1 pl-1 font-medium"
          >
            {item.sidebarText}
          </NavLink>

          <button
            type="button"
            onClick={close}
            className={cn(
              "mr-1 flex size-5 items-center justify-center rounded hover:bg-foreground/10",
              !closable && "opacity-0",
              !active &&
                "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
            )}
          >
            <XIcon className="size-3.5" />
          </button>

          {active && (
            <span
              className={cn(
                "pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full",
                focused
                  ? "bg-primary shadow-[0_2px_6px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
                  : "bg-foreground/25 shadow-[0_2px_4px_rgb(0_0_0/0.15)]",
              )}
            />
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          disabled={!canSplitTo.right}
          onSelect={() => split("right")}
        >
          <Columns2 />
          Split right
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canSplitTo.bottom}
          onSelect={() => split("bottom")}
        >
          <Rows2 />
          Split down
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          disabled={!closable}
          onSelect={close}
        >
          <XIcon />
          Close
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
