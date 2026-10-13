import type { ModuleAppViewProps } from "./moduleAppView.types";
import { GridView } from "./GridView/GridView";

export function ModuleAppView<T>({
  appView = "grid",
  ...view
}: ModuleAppViewProps<T>) {
  if (appView === "grid") return <GridView {...view} />;
  return null;
}
