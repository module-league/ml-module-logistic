import { createContext, useContext } from "react";
import type { IModuleConfig, INavPageConfig } from "@/module/shell/module.types";
import type { IWorkspace } from "./workspace.types";

/** The tab being dragged and the pane it came from. */
export interface DraggedTab {
  key: string;
  fromPaneId: string;
}

/** Shared by every pane and tab strip in the workspace (see WorkspaceView). */
export interface WorkspaceContextValue {
  config: IModuleConfig;
  storageKey: string;
  workspace: IWorkspace;
  items: INavPageConfig[];
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
