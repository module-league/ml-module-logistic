import type { ModuleAppViewProps } from "./moduleAppView.types";
import { GridView } from "./GridView/GridView";

/** The records in the page's view; the grid is the only view so far. */
export function ModuleAppView<T>({
  appView: _appView,
  ...view
}: ModuleAppViewProps<T>) {
  return <GridView {...view} />;
}
