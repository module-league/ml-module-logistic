import { NavLink, useLocation, useNavigate } from "react-router";
import { X } from "lucide-react";
import { cn } from "@moduleleague/ui";
import { findActiveNav, flattenNavItems } from "./nav-util";
import { closeRecentTab, recentTabsKey, useRecentTabs } from "./recent-tabs";
import type { ModuleConfig, NavItemConfig } from "./type";

/**
 * Tab strip of recently viewed pages, like browser tabs: click to switch, × to close.
 * Visits are recorded by the router (see createModuleRouter); this only shows and closes them.
 */
export function ModuleTopActivity({ config }: { config: ModuleConfig }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const storageKey = recentTabsKey(config.code);
  const keys = useRecentTabs(storageKey);

  // Saved keys → sidebar entries; keys of pages since removed from config.ts are skipped
  const items = flattenNavItems(config);
  const tabs = keys
    .map((key) => items.find((item) => item.keyValue === key))
    .filter((item): item is NavItemConfig => item !== undefined);
  const activeKey = findActiveNav(config, pathname)?.item.keyValue;

  if (tabs.length === 0) return null;

  function close(key: string) {
    // Closing the open page moves to its neighbour (right, else left), as browsers do
    if (key === activeKey) {
      const index = tabs.findIndex((tab) => tab.keyValue === key);
      const next = tabs[index + 1] ?? tabs[index - 1];
      navigate(next ? `/${next.keyValue}` : "/");
    }
    closeRecentTab(storageKey, key);
  }

  return (
    <nav
      aria-label="Recently viewed"
      className="flex shrink-0 [scrollbar-width:none] items-center gap-1 overflow-x-auto border-b bg-background px-2 py-1.5"
    >
      {tabs.map((tab) => {
        const active = tab.keyValue === activeKey;
        const Icon = tab.icon;
        return (
          <div
            key={tab.keyValue}
            className={cn(
              "group flex h-8 shrink-0 items-center rounded-md text-sm transition-colors",
              active
                ? "bg-primary-10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <NavLink
              to={`/${tab.keyValue}`}
              title={tab.description}
              className="flex h-full items-center gap-1.5 pr-1 pl-2.5 font-medium"
            >
              {Icon && <Icon className="size-4" />}
              {tab.text}
            </NavLink>
            {/* Not closable when it is the only tab: there would be nothing to show */}
            {tabs.length > 1 && (
              <button
                type="button"
                onClick={() => close(tab.keyValue)}
                aria-label={`Close ${tab.text}`}
                title={`Close ${tab.text}`}
                className={cn(
                  "mr-1 flex size-5 items-center justify-center rounded hover:bg-foreground/10",
                  !active &&
                    "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                )}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
