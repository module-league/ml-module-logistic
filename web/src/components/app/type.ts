import type { ComponentType } from "react";
 
type IconComponent = ComponentType<{ className?: string }>;
 
/** One sidebar entry = one page = one URL. */
export interface NavItemConfig {
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
  items: NavItemConfig[];
}
 
/** The module's accent colour. Applied to buttons, the active sidebar entry and focus rings. */
export interface ModuleTheme {
  /** Strong accent, e.g. "#1d4ed8". Must be readable as white text's background. */
  primary: string;
  /** Light tint of the same colour for the active sidebar entry, e.g. "#e8eefc". */
  primarySoft: string;
  /** Optional second brand colour, e.g. "#9333ea". Used as bg-brand-accent, bg-brand-accent-10 … 90. */
  accent?: string;
  /** What shows around the main page. Defaults to the sidebar colour. */
  background?: ModuleBackground;
}

/** The backdrop behind the main page. The page itself sits on top as a rounded card. */
export interface ModuleBackground {
  /** Any CSS colour, e.g. "#eef1f6". Also shows while the image loads. */
  color?: string;
  /**
   * Image drawn over the colour, covering the area. A file name is looked up in public/moduleLayoutBgImg,
   * e.g. "mdBgPic1.jpg"; anything with a "/" (a path or full URL) is used as given.
   */
  image?: string;
}
 
/** Everything one module needs to build its sidebar, routes and look. */
export interface ModuleConfig {
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
