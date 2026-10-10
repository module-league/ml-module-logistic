import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
// import NotFound from "@/pages/NotFound";
import { ModuleLayout } from "./ModuleLayout";
import { NavItemContext } from "./nav-item-context";
import { flattenNavItems } from "./nav-util";
import type { ModuleConfig, NavItemConfig } from "./type";
 
const KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
 
/** Catches config mistakes at startup instead of as broken links later. */
function validateConfig(items: NavItemConfig[], homeKey: string | undefined) {
  if (items.length === 0) throw new Error("src/config/config.ts has no sidebar items.");
  if (homeKey && !items.some((item) => item.keyValue === homeKey)) {
    throw new Error(`homeKey "${homeKey}" does not match any keyValue in src/config/config.ts.`);
  }
 
  const seen = new Set<string>();
  for (const item of items) {
    if (!KEY_PATTERN.test(item.keyValue)) {
      throw new Error(`keyValue "${item.keyValue}" must be kebab-case, e.g. "awaiting-task".`);
    }
    if (seen.has(item.keyValue)) {
      throw new Error(`keyValue "${item.keyValue}" is used twice in src/config/config.ts.`);
    }
    seen.add(item.keyValue);
  }
}
 
/** One route per sidebar item, all inside the module layout. */
export function createModuleRouter(config: ModuleConfig) {
  const items = flattenNavItems(config);
  validateConfig(items, config.homeKey);
  const homeKey = config.homeKey ?? items[0].keyValue;
 
  const pageRoutes: RouteObject[] = items.map((item) => ({
    path: item.keyValue,
    element: (
      <NavItemContext.Provider value={item}>
        <item.page />
      </NavItemContext.Provider>
    ),
  }));
 
  return createBrowserRouter([
    {
      path: "/",
      element: <ModuleLayout config={config} />,
      children: [
        // "/" opens the home page (homeKey, or the first sidebar item)
        { index: true, element: <Navigate to={`/${homeKey}`} replace /> },
        ...pageRoutes,
        { path: "*", element: <div/> },
      ],
    },
  ]);
}
