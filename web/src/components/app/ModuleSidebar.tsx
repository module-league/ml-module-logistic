import { useState } from "react";
import { NavLink, useMatch } from "react-router";
import { ChevronsUpDown, Settings2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@moduleleague/ui";
import { useCurrentUser } from "./current-user";
import type { ModuleConfig, NavItemConfig } from "./type";
 
/** Draws the whole sidebar from the module config. No page is hard-coded here. */
export function ModuleSidebar({ config }: { config: ModuleConfig }) {
  const [query, setQuery] = useState("");
  const user = useCurrentUser();
  const ModuleIcon = config.icon;
 
  // "Search pages" filters the entries by their label
  const term = query.trim().toLowerCase();
  const groups = config.groups
    .map((group) => ({
      ...group,
      items: term ? group.items.filter((item) => item.text.toLowerCase().includes(term)) : group.items,
    }))
    .filter((group) => group.items.length > 0);
 
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={`Module League · ${config.title}`}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-white">
                <ModuleIcon className="size-4" />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="text-xs text-muted-foreground">Module League</span>
                <span className="truncate font-semibold">{config.title}</span>
              </span>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarInput
          placeholder="Search pages"
          aria-label="Search pages"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="group-data-[collapsible=icon]:hidden"
        />
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
 
      <SidebarRail />
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
