import { createBrowserRouter, redirect, type RouteObject } from "react-router";
import {
  applyModuleTheme,
  readModuleSettings,
  settingsKey,
} from "../../lib/moduleSettingsUtil";
// import NotFound from "@/pages/NotFound";
import { ModuleLayout } from "./ModuleLayout";
import { flattenNavItems } from "../../lib/navUtil";
import {
  openTab,
  workspaceKey,
} from "../../lib/workspaceUtil";
import type {
  IModuleConfig,
  INavItemConfig,
} from "../../services/module.types";

const KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function validateConfig(items: INavItemConfig[], homeKey: string | undefined) {
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

export function createModuleRouter(config: IModuleConfig) {
  const items = flattenNavItems(config);
  validateConfig(items, config?.homeKey);
  const homeKey = config?.homeKey ?? items[0].keyValue;
  const storageKey = workspaceKey(config?.code);
  applyModuleTheme(readModuleSettings(settingsKey(config?.code)));

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
