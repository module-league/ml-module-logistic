import type {
  IModuleConfig,
  INavItemConfig,
  INavPageConfig,
} from "./module.types";

/** Every sidebar entry, sub-sidebars right after their parent. */
export function listNavItems(config: IModuleConfig): INavItemConfig[] {
  return config.groups.flatMap((group) =>
    group.sidebarItems.flatMap((item) => [item, ...(item.sidebarItems ?? [])]),
  );
}

/** The entries that have a page, in sidebar order: one route and one tab each. */
export function flattenNavItems(config: IModuleConfig): INavPageConfig[] {
  return listNavItems(config).filter(
    (item): item is INavPageConfig => !!item.page,
  );
}

/** The page an entry opens: its own, or its first sub-sidebar's when it is only a folder. */
export function navTargetKey(item: INavItemConfig) {
  return item.page ? item.sidebarId : item.sidebarItems?.[0]?.sidebarId;
}

/** Keeps the entries whose label matches; a matching parent keeps all its sub-sidebars, otherwise only the matching ones stay. */
export function filterNavItems(items: INavItemConfig[], term: string) {
  if (term === "") return items;
  return items.flatMap((item) => {
    if (item.sidebarText.toLowerCase().includes(term)) return [item];
    const sidebarItems = item.sidebarItems?.filter((child) =>
      child.sidebarText.toLowerCase().includes(term),
    );
    return sidebarItems !== undefined && sidebarItems.length > 0
      ? [{ ...item, sidebarItems }]
      : [];
  });
}
