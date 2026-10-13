import type { IModuleConfig, INavItemConfig } from "../services/module.types";
 
export function flattenNavItems(config: IModuleConfig): INavItemConfig[] {
  return config?.groups?.flatMap((group) => group?.items);
}
 
export function findActiveNav(config: IModuleConfig, pathname: string) {
  for (const group of config.groups) {
    for (const item of group.items) {
      const path = `/${item.sidebarId}`;
      if (pathname === path || pathname.startsWith(`${path}/`)) {
        return { item, groupLabel: group.label };
      }
    }
  }
  return undefined;
}
 
export function toPageFileName(sidebarId: string): string {
  return sidebarId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
