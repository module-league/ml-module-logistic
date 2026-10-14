import { createBrowserRouter, redirect, type RouteObject } from "react-router";
import {
  applyModuleTheme,
  readModuleSettings,
  settingsKey,
} from "@/module/settings/moduleSettings.utils";
// import NotFound from "@/pages/NotFound";
import { ModuleLayout } from "./ModuleLayout";
import { flattenNavItems, listNavItems } from "./nav.utils";
import { openTab, workspaceKey } from "@/module/workspace/workspace.utils";
import type {
  IModuleConfig,
  INavItemConfig,
  INavPageConfig,
} from "./module.types";

const KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function validateConfig(
  items: INavItemConfig[],
  pages: INavPageConfig[],
  homeKey: string | undefined,
) {
  if (pages?.length === 0)
    throw new Error("src/config/config.ts has no sidebar pages.");
  if (homeKey && !pages?.some((item) => item?.sidebarId === homeKey)) {
    throw new Error(
      `homeKey "${homeKey}" does not match any sidebarId with a page in src/config/config.ts.`,
    );
  }

  const visited = new Set<string>();
  for (const item of items) {
    if (!item?.page && !item?.sidebarItems?.length) {
      throw new Error(
        `sidebarId "${item?.sidebarId}" needs a page, sidebarItems, or both.`,
      );
    }
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
  const pages = flattenNavItems(config);
  validateConfig(listNavItems(config), pages, config?.homeKey);
  const homeKey = config?.homeKey ?? pages[0].sidebarId;
  const storageKey = workspaceKey(config?.code);
  applyModuleTheme(readModuleSettings(settingsKey(config?.code)));

  const pageRoutes: RouteObject[] = pages?.map((item) => ({
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
