import { createContext, useContext } from "react";
import type { NavItemConfig } from  "./type";
 
/** Holds the config entry of the page currently shown. Set by the router. */
export const NavItemContext = createContext<NavItemConfig | null>(null);
 
/** The sidebar entry (text, description, ...) of the current page. */
export function useCurrentNavItem(): NavItemConfig {
  const item = useContext(NavItemContext);
  if (!item) {
    throw new Error("useCurrentNavItem must be used inside a page that is listed in src/config/config.ts.");
  }
  return item;
}
