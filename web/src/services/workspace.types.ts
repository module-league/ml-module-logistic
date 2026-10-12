// split side by side ("horizontal") or one above the other ("vertical").
export interface PaneNode {
  type: "pane";
  id: string;
  /** keyValues of the pages in this pane, in tab order. */
  tabs: string[];
  activeKey: string | null;
}

export interface SplitNode {
  type: "split";
  id: string;
  orientation: "horizontal" | "vertical";
  children: LayoutNode[];
}

export type LayoutNode = PaneNode | SplitNode;

export interface IWorkspace {
  root: LayoutNode;
  /** The pane the URL follows; new pages open here. */
  currentViewerId: string;
}

export type SplitEdge = "left" | "right" | "top" | "bottom";
export type DropZone = SplitEdge | "center";
/** Where a dragged tab is dropped: an edge of a pane splits it, the center moves the tab into it. */
export interface DropTarget {
  paneId: string;
  zone: DropZone;
}

/** Where a dragged tab is dropped in the snap layout: that half of the whole workspace. */
export interface SnapTarget {
  snap: SplitEdge;
}
