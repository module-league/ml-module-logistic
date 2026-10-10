import { useEffect } from "react";
import type { ModuleTheme } from "./type";
 
/**
 * Applies the module's accent to the shadcn theme variables.
 * Set on <html> so dialogs, the mobile drawer and toasts (rendered outside the layout) get it too.
 */
export function useModuleTheme({ primary, primarySoft }: ModuleTheme) {
  useEffect(() => {
    const vars: Record<string, string> = {
      "--primary": primary,
      "--ring": primary,
      "--sidebar-primary": primary,
      "--sidebar-ring": primary,
      "--sidebar-accent": primarySoft,
      "--sidebar-accent-foreground": primary,
    };
    const root = document.documentElement;
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
    return () => {
      for (const name of Object.keys(vars)) root.style.removeProperty(name);
    };
  }, [primary, primarySoft]);
}
