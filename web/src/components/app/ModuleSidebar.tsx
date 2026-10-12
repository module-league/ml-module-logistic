import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { NavLink, useMatch } from "react-router";
import {
  ChevronDown,
  CircleQuestionMark,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
} from "lucide-react";
import {
  Button,
  cn,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Kbd,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@moduleleague/ui";
import { useCurrentUser } from "../../services/current.user";
import type {
  IModuleConfig,
  INavItemConfig,
} from "../../services/module.types";
import { UserAvatar } from "../custom/UserAvatar";
import { ModuleSettings } from "./ModuleSettings";

const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.userAgent);

/** Draws the whole sidebar from the module config. No page is hard-coded here. */
export function ModuleSidebar({
  config,
  className,
}: {
  config: IModuleConfig;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { isMobile, state, setOpen, setOpenMobile, toggleSidebar } =
    useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";

  // Ctrl/⌘+K anywhere, or "/" when not typing, jumps to "Search pages".
  // An effect is needed here: it is a window-wide shortcut, and React has no event for that.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      const isShortcut =
        (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" && !typing);
      if (!isShortcut) return;

      e.preventDefault();
      // A collapsed sidebar doesn't render the box; open it synchronously so it mounts and can take focus right away
      flushSync(() => (isMobile ? setOpenMobile(true) : setOpen(true)));
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobile, setOpen, setOpenMobile]);

  // "Search pages" filters the entries by their label
  const term = query.trim().toLowerCase();
  const groups = config.groups
    .map((group) => ({
      ...group,
      items: term
        ? group.items.filter((item) => item.text.toLowerCase().includes(term))
        : group.items,
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon" className={className}>
      <SidebarHeader className="gap-3">
        {/* Collapsed, the row stacks with the toggle on top, above the module icon */}
        <div
          className={cn(
            "flex items-center gap-1",
            collapsed && "flex-col-reverse",
          )}
        >
          <SidebarMenu className="min-w-0 flex-1">
            {/* {!collapsed && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  tooltip={`${config.title} · Module League`}
                  className="gap-2.5 justify-center"
                >
                  <ModuleIcon
                    className={cn(
                      "text-foreground",
                      collapsed ? "size-4!" : "size-6!",
                    )}
                  />

                  <span className="grid flex-1 text-left leading-tight">
                    <span className="flex items-center gap-1 text-base font-semibold">
                      <span className="truncate">{config.title}</span>
                    </span>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )} */}
          </SidebarMenu>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label={toggleLabel}
            title={toggleLabel}
            className="shrink-0 text-muted-foreground"
            startIcon={
              collapsed ? (
                <PanelLeftOpen size={13} />
              ) : (
                <PanelLeftClose size={13} />
              )
            }
          ></Button>
        </div>

        {!collapsed && (
          <InputGroup className="h-7 rounded-lg border-0 bg-muted">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchRef}
              placeholder="Search"
              aria-label="Search pages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <InputGroupAddon align="inline-end" className="gap-0">
              <Kbd className="h-auto border bg-background px-1.5 py-0.5 text-xs">
                {IS_MAC ? "⌘K" : "Ctrl K"}
              </Kbd>
              <Kbd className="h-auto border bg-background px-1.5 py-0.5 text-xs">
                /
              </Kbd>
            </InputGroupAddon>
          </InputGroup>
        )}
      </SidebarHeader>

      {!!collapsed && <SidebarSeparator className="border-b" />}

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu className="space-y-1">
              {group.items.map((item) => (
                <SidebarNavItem key={item.keyValue} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
        {groups.length === 0 && !collapsed && (
          <p className="px-4 text-sm text-muted-foreground">
            No page matches “{query}”.
          </p>
        )}
      </SidebarContent>

      {!!collapsed && <SidebarSeparator className="border-b" />}

      <SidebarFooter>
        <SidebarMenu>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarMenuItem>
            <ModuleSettings config={config}>
              <SidebarMenuButton tooltip="Settings">
                <Settings2 />
                <span>Settings</span>
              </SidebarMenuButton>
            </ModuleSettings>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <CircleQuestionMark />
              <span>Help Center</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

const useNoBadge = () => undefined;

function SidebarNavItem({ item }: { item: INavItemConfig }) {
  const path = `/${item.keyValue}`;
  const isActive = useMatch({ path, end: false }) !== null;
  const useBadge = item?.useBadge ?? useNoBadge;
  const badge = useBadge();
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.text}
        className={cn("relative", item?.className)}
      >
        <NavLink to={path} title={item.description}>
          {isActive && (
            <span className="absolute top-1/2 left-0 h-4 -translate-y-1/2 border-l-2 border-primary" />
          )}
          {Icon && <Icon />}
          <span>{item.text}</span>
        </NavLink>
      </SidebarMenuButton>
      {badge ? (
        <SidebarMenuBadge className="rounded-full bg-amber-100 px-1.5 text-amber-900">
          {badge}
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
}
