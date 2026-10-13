import type { IModuleConfig, INavItemConfig } from "./module.types";

export function flattenNavItems(config: IModuleConfig): INavItemConfig[] {
  return config?.groups?.flatMap((group) => group?.items);
}
