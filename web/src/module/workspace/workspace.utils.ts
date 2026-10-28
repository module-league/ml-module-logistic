import { useSyncExternalStore } from "react";
import type {
  DropTarget,
  IWorkspace,
  LayoutNode,
  PaneNode,
  SplitEdge,
} from "./workspace.types";

/** Splitting stops here so panes stay usable. */
export const MAX_PANES = 2;
/** Opening one more tab in a pane drops its oldest one. */
const MAX_TABS_PER_PANE = 8;

export function workspaceKey(moduleCode: string) {
  return `ml:${moduleCode}.workspace`;
}

// ---- Tree helpers (pure) ----
export function listPanes(node: LayoutNode): PaneNode[] {
  return node.type === "pane" ? [node] : node.children.flatMap(listPanes);
}

/**
 * The first pane in reading order. Every layout has one: splits are only made from panes,
 * collapse when emptied, and `isNode` rejects saved splits without children.
 * @throws Error when the layout breaks that rule.
 */
export function firstPane(node: LayoutNode): PaneNode {
  const [pane] = listPanes(node);
  if (!pane) throw new Error("Workspace layout has no panes.");
  return pane;
}

export function findPane(node: LayoutNode, id: string): PaneNode | undefined {
  return listPanes(node).find((pane) => pane.id === id);
}

/** The page the URL should show: the focused pane's active tab. */
export function focusedKey(workspace: IWorkspace): string | null {
  return findPane(workspace.root, workspace.currentViewerId)?.activeKey ?? null;
}

function newId(prefix: string) {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}

function replacePane(node: LayoutNode, id: string, pane: PaneNode): LayoutNode {
  if (node.type === "pane") return node.id === id ? pane : node;
  return {
    ...node,
    children: node.children.map((child) => replacePane(child, id, pane)),
  };
}

/** Removes a pane; a split left with one child is replaced by that child. Null if nothing remains. */
function removePane(node: LayoutNode, id: string): LayoutNode | null {
  if (node.type === "pane") return node.id === id ? null : node;
  const children = node.children
    .map((child) => removePane(child, id))
    .filter((child): child is LayoutNode => child !== null);
  const [only, ...others] = children;
  if (!only) return null;
  if (others.length === 0) return only;
  return { ...node, children };
}

/** Puts newPane on one edge of the target pane. Joins an existing split that runs the same way. */
function splitPane(
  node: LayoutNode,
  targetId: string,
  edge: SplitEdge,
  newPane: PaneNode,
): LayoutNode {
  const orientation =
    edge === "left" || edge === "right" ? "horizontal" : "vertical";
  const before = edge === "left" || edge === "top";

  if (node.type === "split") {
    const index = node.children.findIndex(
      (child) => child.type === "pane" && child.id === targetId,
    );
    if (index >= 0 && node.orientation === orientation) {
      const children = [...node.children];
      children.splice(before ? index : index + 1, 0, newPane);
      return { ...node, children };
    }
    return {
      ...node,
      children: node.children.map((child) =>
        splitPane(child, targetId, edge, newPane),
      ),
    };
  }
  if (node.id !== targetId) return node;
  return {
    type: "split",
    id: newId("s"),
    orientation,
    children: before ? [newPane, node] : [node, newPane],
  };
}

function withTab(pane: PaneNode, key: string): PaneNode {
  let tabs = pane.tabs.includes(key) ? pane.tabs : [...pane.tabs, key];
  if (tabs.length > MAX_TABS_PER_PANE) tabs = tabs.slice(-MAX_TABS_PER_PANE);
  return { ...pane, tabs, activeKey: key };
}

/** Removes a tab; if it was active, its neighbour (right, else left) becomes active, as browsers do. */
function withoutTab(pane: PaneNode, key: string): PaneNode {
  const index = pane.tabs.indexOf(key);
  if (index < 0) return pane;
  const tabs = pane.tabs.filter((tab) => tab !== key);
  const activeKey =
    pane.activeKey === key
      ? (tabs[index] ?? tabs[index - 1] ?? null)
      : pane.activeKey;
  return { ...pane, tabs, activeKey };
}

// ---- Store ----
const cache = new Map<string, IWorkspace>();
const listeners = new Set<() => void>();

function emptyWorkspace(tabs: string[] = []): IWorkspace {
  return {
    root: { type: "pane", id: "main", tabs, activeKey: tabs.at(-1) ?? null },
    currentViewerId: "main",
  };
}

function isNode(value: unknown): value is LayoutNode {
  if (typeof value !== "object" || value === null) return false;
  if (!("id" in value) || typeof value.id !== "string" || !("type" in value))
    return false;
  if (value.type === "pane")
    return "tabs" in value && Array.isArray(value.tabs);
  if (value.type === "split") {
    return (
      "children" in value &&
      Array.isArray(value.children) &&
      value.children.length > 0 &&
      value.children.every(isNode)
    );
  }
  return false;
}

function load(storageKey: string): IWorkspace {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(storageKey) ?? "null",
    );
    if (
      typeof saved === "object" &&
      saved !== null &&
      "root" in saved &&
      isNode(saved.root)
    ) {
      const workspace = saved as IWorkspace;
      const focusedExists = findPane(workspace.root, workspace.currentViewerId);
      return focusedExists
        ? workspace
        : { ...workspace, currentViewerId: firstPane(workspace.root).id };
    }
    // First run after the split feature: carry over the old single tab list
    const legacy: unknown = JSON.parse(
      localStorage.getItem(storageKey.replace(/:workspace$/, ":recent-tabs")) ??
        "null",
    );
    if (Array.isArray(legacy))
      return emptyWorkspace(
        legacy.filter((k): k is string => typeof k === "string"),
      );
  } catch {
    // storage blocked or corrupt: start fresh
  }
  return emptyWorkspace();
}

function read(storageKey: string): IWorkspace {
  let workspace = cache.get(storageKey);
  if (!workspace) {
    workspace = load(storageKey);
    cache.set(storageKey, workspace);
  }
  return workspace;
}

function write(storageKey: string, workspace: IWorkspace) {
  cache.set(storageKey, workspace);
  try {
    localStorage.setItem(storageKey, JSON.stringify(workspace));
  } catch {
    // storage blocked (private mode): the workspace still works for this session
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export function useWorkspace(storageKey: string): IWorkspace {
  return useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    () => read(storageKey),
  );
}

// ---- Actions ----

export function openTab(storageKey: string, key: string) {
  const workspace = read(storageKey);
  const isVisited = listPanes(workspace.root).find((pane) =>
    pane.tabs.includes(key),
  );

  if (isVisited) {
    if (
      isVisited.activeKey === key &&
      workspace.currentViewerId === isVisited.id
    )
      return;
    write(storageKey, {
      root: replacePane(workspace.root, isVisited.id, {
        ...isVisited,
        activeKey: key,
      }),
      currentViewerId: isVisited.id,
    });
    return;
  }
  const focused =
    findPane(workspace.root, workspace.currentViewerId) ??
    firstPane(workspace.root);
  write(storageKey, {
    root: replacePane(workspace.root, focused.id, withTab(focused, key)),
    currentViewerId: focused.id,
  });
}

export function closeTab(
  storageKey: string,
  paneId: string,
  key: string,
): IWorkspace {
  const workspace = read(storageKey);
  const pane = findPane(workspace.root, paneId);
  if (!pane) return workspace;

  const rest = withoutTab(pane, key);
  let next: IWorkspace;
  if (rest.tabs.length > 0) {
    next = { ...workspace, root: replacePane(workspace.root, paneId, rest) };
  } else {
    const root = removePane(workspace.root, paneId);
    if (!root) return workspace;
    const currentViewerId =
      paneId === workspace.currentViewerId
        ? firstPane(root).id
        : workspace.currentViewerId;
    next = { root, currentViewerId };
  }
  write(storageKey, next);
  return next;
}

/** Closes every tab in every pane; the workspace goes back to one pane showing only homeKey. */
export function closeAllTabs(storageKey: string, homeKey: string): IWorkspace {
  const next = emptyWorkspace([homeKey]);
  write(storageKey, next);
  return next;
}

export function canDrop(
  workspace: IWorkspace,
  fromPaneId: string,
  target: DropTarget,
): boolean {
  const from = findPane(workspace.root, fromPaneId);
  if (!from || !findPane(workspace.root, target.paneId)) return false;
  if (target.zone === "center") return target.paneId !== fromPaneId;
  // Splitting needs room for another pane, and must leave something behind in the source pane
  if (listPanes(workspace.root).length >= MAX_PANES) return false;
  return !(target.paneId === fromPaneId && from.tabs.length === 1);
}

/** Moves a tab to where overKey sits in the same pane, and makes it the active tab. */
export function reorderTab(
  storageKey: string,
  paneId: string,
  key: string,
  overKey: string,
): IWorkspace {
  const workspace = read(storageKey);
  const pane = findPane(workspace.root, paneId);
  const from = pane?.tabs.indexOf(key) ?? -1;
  const to = pane?.tabs.indexOf(overKey) ?? -1;
  if (!pane || from < 0 || to < 0) return workspace;

  const tabs = [...pane.tabs];
  tabs.splice(to, 0, ...tabs.splice(from, 1));
  const next = {
    root: replacePane(workspace.root, paneId, {
      ...pane,
      tabs,
      activeKey: key,
    }),
    currentViewerId: paneId,
  };
  write(storageKey, next);
  return next;
}

export function moveTab(
  storageKey: string,
  key: string,
  fromPaneId: string,
  target: DropTarget,
): IWorkspace {
  const workspace = read(storageKey);
  const from = findPane(workspace.root, fromPaneId);
  if (!from || !canDrop(workspace, fromPaneId, target)) return workspace;

  let root = replacePane(workspace.root, fromPaneId, withoutTab(from, key));
  let currentViewerId: string;

  if (target.zone === "center") {
    // canDrop checked the target pane exists, and a center drop never removes it
    const to = findPane(root, target.paneId);
    if (!to) return workspace;
    root = replacePane(root, target.paneId, withTab(to, key));
    currentViewerId = target.paneId;
  } else {
    const pane: PaneNode = {
      type: "pane",
      id: newId("p"),
      tabs: [key],
      activeKey: key,
    };
    root = splitPane(root, target.paneId, target.zone, pane);
    currentViewerId = pane.id;
  }

  // The source pane disappears if that was its last tab
  if (findPane(root, fromPaneId)?.tabs.length === 0)
    root = removePane(root, fromPaneId) ?? root;

  const next = { root, currentViewerId };
  write(storageKey, next);
  return next;
}

function mergePanes(
  node: LayoutNode,
  preferredActiveKey: string | null,
): PaneNode {
  const panes = listPanes(node);
  const tabs = [...new Set(panes.flatMap((pane) => pane.tabs))].slice(
    -MAX_TABS_PER_PANE,
  );
  const activeKey =
    preferredActiveKey != null &&
    preferredActiveKey !== "" &&
    tabs.includes(preferredActiveKey)
      ? preferredActiveKey
      : (tabs.at(-1) ?? null);
  return { type: "pane", id: firstPane(node).id, tabs, activeKey };
}

/** Puts the tab alone on one half of the workspace; everything else stays on the other half. */
export function snapTab(
  storageKey: string,
  key: string,
  fromPaneId: string,
  edge: SplitEdge,
): IWorkspace {
  const workspace = read(storageKey);
  const from = findPane(workspace.root, fromPaneId);
  if (from?.tabs.includes(key) !== true) return workspace;

  const remaining = withoutTab(from, key);
  let rest =
    remaining.tabs.length > 0
      ? replacePane(workspace.root, fromPaneId, remaining)
      : removePane(workspace.root, fromPaneId);
  if (!rest) return workspace;
  if (listPanes(rest).length >= MAX_PANES) {
    rest = mergePanes(
      rest,
      findPane(rest, workspace.currentViewerId)?.activeKey ?? null,
    );
  }

  const orientation =
    edge === "left" || edge === "right" ? "horizontal" : "vertical";
  const before = edge === "left" || edge === "top";
  const pane: PaneNode = {
    type: "pane",
    id: newId("p"),
    tabs: [key],
    activeKey: key,
  };
  const joinsRest = rest.type === "split" && rest.orientation === orientation;
  const others = joinsRest && rest.type === "split" ? rest.children : [rest];
  const root: LayoutNode = {
    type: "split",
    id: joinsRest ? rest.id : newId("s"),
    orientation,
    children: before ? [pane, ...others] : [...others, pane],
  };

  const next = { root, currentViewerId: pane.id };
  write(storageKey, next);
  return next;
}
