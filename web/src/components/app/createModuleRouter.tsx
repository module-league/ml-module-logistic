import { createBrowserRouter, redirect, type RouteObject } from "react-router";
// import NotFound from "@/pages/NotFound";
import { ModuleLayout } from "./ModuleLayout";
import { flattenNavItems } from "./nav-util";
import { openTab, workspaceKey } from "./workspace-store";
import type { ModuleConfig, NavItemConfig } from "./type";

const KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function validateConfig(items: NavItemConfig[], homeKey: string | undefined) {
  if (items?.length === 0)
    throw new Error("src/config/config.ts has no sidebar items.");
  if (homeKey && !items?.some((item) => item?.keyValue === homeKey)) {
    throw new Error(
      `homeKey "${homeKey}" does not match any keyValue in src/config/config.ts.`,
    );
  }

  const visited = new Set<string>();
  for (const item of items) {
    if (!KEY_PATTERN.test(item.keyValue)) {
      throw new Error(
        `keyValue "${item.keyValue}" must be kebab-case, e.g. "awaiting-task".`,
      );
    }
    if (visited.has(item.keyValue)) {
      throw new Error(
        `keyValue "${item.keyValue}" is used twice in src/config/config.ts.`,
      );
    }
    visited.add(item.keyValue);
  }
}

export function createModuleRouter(config: ModuleConfig) {
  const items = flattenNavItems(config);
  validateConfig(items, config?.homeKey);
  const homeKey = config?.homeKey ?? items[0].keyValue;
  const storageKey = workspaceKey(config?.code);

  const pageRoutes: RouteObject[] = items?.map((item) => ({
    path: item?.keyValue,
    loader: () => {
      openTab(storageKey, item?.keyValue);
      return null;
    },
  }));

  return createBrowserRouter([
    {
      path: "/",
      element: <ModuleLayout config={config} />,
      children: [
        // "/" and unknown URLs open the home page (homeKey, or the first sidebar item)
        { index: true, loader: () => redirect(`/${homeKey}`) },
        ...pageRoutes,
        { path: "*", loader: () => redirect(`/${homeKey}`) },
      ],
    },
  ]);
}
