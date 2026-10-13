import { createBrowserRouter, redirect, type RouteObject } from "react-router";
import {
  applyModuleTheme,
  readModuleSettings,
  settingsKey,
} from "@/module/settings/moduleSettings.utils";
// import NotFound from "@/pages/NotFound";
import { ModuleLayout } from "./ModuleLayout";
import { flattenNavItems } from "./nav.utils";
import { openTab, workspaceKey } from "@/module/workspace/workspace.utils";
import type {
  IModuleConfig,
  INavItemConfig,
} from "./module.types";

const KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function validateConfig(items: INavItemConfig[], homeKey: string | undefined) {
  if (items?.length === 0)
    throw new Error("src/config/config.ts has no sidebar items.");
  if (homeKey && !items?.some((item) => item?.sidebarId === homeKey)) {
    throw new Error(
      `homeKey "${homeKey}" does not match any sidebarId in src/config/config.ts.`,
    );
  }

  const visited = new Set<string>();
  for (const item of items) {
    if (!KEY_PATTERN.test(item.sidebarId)) {
      throw new Error(
        `sidebarId "${item.sidebarId}" must be kebab-case, e.g. "awaiting-task".`,
      );
    }
    if (visited.has(item.sidebarId)) {
      throw new Error(
        `sidebarId "${item.sidebarId}" is used twice in src/config/config.ts.`,
      );
    }
    visited.add(item.sidebarId);
  }
}

export function createModuleRouter(config: IModuleConfig) {
  const items = flattenNavItems(config);
  validateConfig(items, config?.homeKey);
  const homeKey = config?.homeKey ?? items[0].sidebarId;
  const storageKey = workspaceKey(config?.code);
  applyModuleTheme(readModuleSettings(settingsKey(config?.code)));

  const pageRoutes: RouteObject[] = items?.map((item) => ({
    path: item?.sidebarId,
    loader: () => {
      openTab(storageKey, item?.sidebarId);
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
