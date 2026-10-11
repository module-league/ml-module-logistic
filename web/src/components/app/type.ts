import type { ComponentType } from "react";
 
type IconComponent = ComponentType<{ className?: string }>;
 
/** One sidebar entry = one page = one URL. */
export interface INavItemConfig {
  /** Unique key. Also the URL path, so use kebab-case: "awaiting-task" → /awaiting-task */
  keyValue: string;
  /** Sidebar label and page title. */
  text: string;
  /** Page subtitle and sidebar hover text. */
  description: string;
  /** The page component in src/pages. Use lazy() so each page loads on demand. */
  page: ComponentType;
  /** Sidebar icon; the only thing shown when the sidebar is collapsed. */
  icon?: IconComponent;
  /** Extra Tailwind classes for this one sidebar entry. */
  className?: string;
  /** Optional hook returning a count for the pill on the right, e.g. items waiting. */
  useBadge?: () => number | undefined;
}
 
/** A titled section of the sidebar, e.g. "Operations". */
export interface NavGroupConfig {
  label: string;
  items: INavItemConfig[];
}
 
/** The module's look. Colours (primary etc.) are fixed in src/styles/theme.css. */
export interface ModuleTheme {
  /** What shows around the main page. Defaults to the sidebar colour. */
  background?: ModuleBackground;
}

/** The backdrop behind the main page. The page itself sits on top as a rounded card. */
export interface ModuleBackground {
  /** Any CSS colour, e.g. "#eef1f6". Also shows while the image loads. */
  color?: string;
  /**
   * Image drawn over the colour, covering the area: an image URL, normally an import such as
   * `import { mdBgPic1 } from "@/assets/moduleLayoutBgImg"`. A full https:// URL works too.
   */
  image?: string;
}
 
/** Everything one module needs to build its sidebar, routes and look. */
export interface IModuleConfig {
  /** App code, the same as Module:AppCode in the API's appsettings.json. */
  code: string;
  /** Module name in the sidebar header and breadcrumb, e.g. "Logistic". */
  title: string;
  /** Module icon in the sidebar header. */
  icon: IconComponent;
  theme: ModuleTheme;
  /** keyValue of the page that "/" opens. Defaults to the first sidebar item. */
  homeKey?: string;
  groups: NavGroupConfig[];
}
