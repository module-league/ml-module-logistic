import type { ModuleConfig, NavItemConfig } from "./type";
 
/** All items of all groups, in sidebar order. */
export function flattenNavItems(config: ModuleConfig): NavItemConfig[] {
  return config.groups.flatMap((group) => group.items);
}
 
/** The sidebar entry (and its group) that matches the current URL. */
export function findActiveNav(config: ModuleConfig, pathname: string) {
  for (const group of config.groups) {
    for (const item of group.items) {
      const path = `/${item.keyValue}`;
      if (pathname === path || pathname.startsWith(`${path}/`)) {
        return { item, groupLabel: group.label };
      }
    }
  }
  return undefined;
}
 
/** "awaiting-task" → "AwaitingTask": the expected page file name. */
export function toPageFileName(keyValue: string): string {
  return keyValue
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
