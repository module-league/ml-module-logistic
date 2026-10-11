import { useEffect, useRef, useState } from "react";
import { NavLink, useMatch } from "react-router";
import { ChevronDown, PanelLeftClose, Search, Settings2 } from "lucide-react";
import {
  Button,
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
  useSidebar,
} from "@moduleleague/ui";
import { useCurrentUser } from "./current-user";
import type { ModuleConfig, NavItemConfig } from "./type";

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

/** Draws the whole sidebar from the module config. No page is hard-coded here. */
export function ModuleSidebar({ config, className }: { config: ModuleConfig; className?: string }) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const focusWhenShown = useRef(false);
  const { isMobile, open, openMobile, setOpen, setOpenMobile, toggleSidebar } = useSidebar();
  const shown = isMobile ? openMobile : open;
  const user = useCurrentUser();
  const ModuleIcon = config.icon;

  // Ctrl/⌘+K anywhere, or "/" when not typing, jumps to "Search pages".
  // A collapsed sidebar hides the box, so open it first and focus once it is visible.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      const isShortcut =
        (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing);
      if (!isShortcut) return;

      e.preventDefault();
      if (shown) {
        searchRef.current?.focus();
      } else {
        focusWhenShown.current = true;
        if (isMobile) setOpenMobile(true);
        else setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shown, isMobile, setOpen, setOpenMobile]);

  useEffect(() => {
    if (!shown || !focusWhenShown.current) return;
    focusWhenShown.current = false;
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [shown]);

  // "Search pages" filters the entries by their label
  const term = query.trim().toLowerCase();
  const groups = config.groups
    .map((group) => ({
      ...group,
      items: term ? group.items.filter((item) => item.text.toLowerCase().includes(term)) : group.items,
    }))
    .filter((group) => group.items.length > 0);
 
  return (
    <Sidebar collapsible="icon" className={className}>
      <SidebarHeader className="gap-3">
        <div className="flex items-center gap-1">
          <SidebarMenu className="min-w-0 flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                tooltip={`${config.title} · Module League`}
                className="gap-2.5"
              >
                <ModuleIcon className="size-6! text-foreground group-data-[collapsible=icon]:size-4!" />
                <span className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="flex items-center gap-1 text-base font-semibold">
                    <span className="truncate">{config.title}</span>
                    <ChevronDown className="size-3.5! shrink-0" />
                  </span>
                  <span className="truncate text-sm text-muted-foreground">Module League</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="text-muted-foreground group-data-[collapsible=icon]:hidden"
          >
            <PanelLeftClose />
          </Button>
        </div>

        <InputGroup className="h-10 rounded-lg border-0 bg-muted group-data-[collapsible=icon]:hidden">
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
          <InputGroupAddon align="inline-end">
            <Kbd className="h-6 border bg-background px-1.5">{IS_MAC ? "⌘K" : "Ctrl K"}</Kbd>
            <Kbd className="h-6 border bg-background px-1.5">/</Kbd>
          </InputGroupAddon>
        </InputGroup>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarNavItem key={item.keyValue} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
        {groups.length === 0 && (
          <p className="px-4 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
            No page matches “{query}”.
          </p>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <Settings2 />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={user.name}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {user.initials}
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.role}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
 
const useNoBadge = () => undefined;
 
function SidebarNavItem({ item }: { item: NavItemConfig }) {
  const path = `/${item.keyValue}`;
  const isActive = useMatch({ path, end: false }) !== null;
  const useBadge = item.useBadge ?? useNoBadge;
  const badge = useBadge();
  const Icon = item.icon;
 
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.text} className={item.className}>
        <NavLink to={path} title={item.description}>
          {Icon && <Icon />}
          <span>{item.text}</span>
        </NavLink>
      </SidebarMenuButton>
      {badge ? (
        <SidebarMenuBadge className="rounded-full bg-amber-100 px-1.5 text-amber-900">{badge}</SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
}
