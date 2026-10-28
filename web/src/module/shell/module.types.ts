import type { ComponentType } from "react";

type IconComponent = ComponentType<{ className?: string }>;

interface INavEntryConfig {
  /** Unique across the whole config, sub-sidebars included. Also the URL path, so use kebab-case: "awaiting-task" → /awaiting-task */
  sidebarId: string;
  /** Sidebar label and page title. */
  sidebarText: string;
  /** Page subtitle and sidebar hover text. */
  sidebarDesc: string;
  /** Sidebar icon; the only thing shown when the sidebar is collapsed. */
  sidebarIcon?: IconComponent;
  /** Extra Tailwind classes for this one sidebar entry. */
  className?: string;
  /** Optional hook returning a count for the pill on the right, e.g. items waiting. */
  useBadge?: () => number | undefined;
  hidePageSeparator?: boolean;
}

/** A sub-sidebar entry: one page = one URL, shown indented under its parent. */
export interface INavSubItemConfig extends INavEntryConfig {
  /** The page component in src/pages. Use lazy() so each page loads on demand. */
  page: ComponentType;
}

/** One sidebar entry. It is a page, a folder of sub-sidebar pages, or both. */
export interface INavItemConfig extends INavEntryConfig {
  /** The page component in src/pages. Use lazy() so each page loads on demand. Leave out for a folder that only opens and closes. */
  page?: ComponentType;
  /** Sub-sidebar pages, one level deep. A folder without a page of its own opens the first of these when the sidebar is collapsed. */
  sidebarItems?: INavSubItemConfig[];
}

/** A sidebar entry that has a page; the only kind that becomes a route and a tab. */
export type INavPageConfig = INavItemConfig & { page: ComponentType };

/** A titled section of the sidebar, e.g. "Operations". */
export interface INavGroupConfig {
  label: string;
  sidebarItems: INavItemConfig[];
}

/** Everything one module needs to build its sidebar, routes and look. */
export interface IModuleConfig {
  /** App code, the same as Module:AppCode in the API's appsettings.json. */
  code: string;
  /** Module name in the sidebar header and breadcrumb, e.g. "Logistic". */
  title: string;
  /** Module icon in the sidebar header. */
  icon: IconComponent;
  /** sidebarId of the page that "/" opens. Defaults to the first sidebar item. */
  homeKey?: string;
  groups: INavGroupConfig[];
}

/** A page's query state handed to a module part; the part shows the loader or the error with Try again. */
export interface ModuleQueryState {
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}
