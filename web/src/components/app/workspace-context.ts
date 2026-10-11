import { createContext, useContext } from "react";
import type { ModuleConfig, NavItemConfig } from "./type";
import type { Workspace } from "./workspace-store";

/** The tab being dragged and the pane it came from. */
export interface DraggedTab {
  key: string;
  fromPaneId: string;
}

/** Shared by every pane and tab strip in the workspace (see WorkspaceView). */
export interface WorkspaceContextValue {
  config: ModuleConfig;
  storageKey: string;
  workspace: Workspace;
  items: NavItemConfig[];
  dragging: DraggedTab | null;
  /** Desktop only: phones show a single pane and tabs cannot be dragged. */
  canSplit: boolean;
  /** Puts a page in the URL; the router then focuses the pane that shows it. */
  goTo: (key: string | null) => void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspaceContext(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspaceContext must be used inside WorkspaceView.");
  return value;
}
