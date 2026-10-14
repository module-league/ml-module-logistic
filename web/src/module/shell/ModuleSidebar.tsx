import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { NavLink, useLocation } from "react-router";
import {
  ChevronDown,
  ChevronRight,
  CircleQuestionMark,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
} from "lucide-react";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
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
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@moduleleague/ui";
import { useCurrentUser } from "@/services/user/current.user";
import type {
  IModuleConfig,
  INavItemConfig,
  INavSubItemConfig,
} from "./module.types";
import { UserAvatar } from "@/components/custom/UserAvatar";
import { ModuleSettings } from "@/module/settings/ModuleSettings";
import { filterNavItems, navTargetKey } from "./nav.utils";

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

  // "Search pages" filters the entries, sub-sidebars included, by their label
  const term = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      config.groups
        .map((group) => ({
          ...group,
          sidebarItems: filterNavItems(group.sidebarItems, term),
        }))
        .filter((group) => group.sidebarItems.length > 0),
    [config.groups, term],
  );

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
              {group.sidebarItems.map((item) => (
                <SidebarNavItem
                  key={item.sidebarId}
                  item={item}
                  collapsed={collapsed}
                  searching={!!term}
                />
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

/** The sidebarId in the URL, e.g. "shipment" for /shipment. */
function useCurrentKey() {
  return useLocation().pathname.split("/")[1] ?? "";
}

/**
 * A sidebar entry and its sub-sidebar. It opens by itself while one of its sub-sidebar pages is shown,
 * until the user opens or closes it. Collapsed to icons, it goes straight to its page (or its first sub-sidebar's).
 */
function SidebarNavItem({
  item,
  collapsed,
  searching,
}: {
  item: INavItemConfig;
  collapsed: boolean;
  searching: boolean;
}) {
  const currentKey = useCurrentKey();
  const [userOpen, setUserOpen] = useState<boolean>();
  const useBadge = item?.useBadge ?? useNoBadge;
  const badge = useBadge();
  const Icon = item.sidebarIcon;
  const itemChildren = item?.sidebarItems;
  const children = useMemo(() => itemChildren ?? [], [itemChildren]);
  const childActive = useMemo(
    () => children.some((child) => child?.sidebarId === currentKey),
    [children, currentKey],
  );
  const open = searching || (userOpen ?? childActive);
  const isActive =
    currentKey === item.sidebarId || (childActive && (!open || collapsed));
  const targetKey = navTargetKey(item);

  const content = (
    <>
      {isActive && (
        <span className="absolute top-1/2 left-0 h-4 -translate-y-1/2 border-l-2 border-primary" />
      )}
      {Icon && <Icon />}
      <span>{item.sidebarText}</span>
    </>
  );
  const badgeNode = badge ? (
    <SidebarMenuBadge
      className={cn(
        "rounded-full bg-amber-100 px-1.5 text-amber-900",
        children.length > 0 && "right-7",
      )}
    >
      {badge}
    </SidebarMenuBadge>
  ) : null;

  if (!children.length) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={item.sidebarText}
          className={cn("relative", item?.className)}
        >
          <NavLink to={`/${item.sidebarId}`} title={item.sidebarDesc}>
            {content}
          </NavLink>
        </SidebarMenuButton>
        {badgeNode}
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible asChild open={open} onOpenChange={setUserOpen}>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={item.sidebarText}
          className={cn("relative pr-8", item?.className)}
        >
          {item?.page || collapsed ? (
            <NavLink to={`/${targetKey}`} title={item.sidebarDesc}>
              {content}
            </NavLink>
          ) : (
            <CollapsibleTrigger title={item.sidebarDesc}>
              {content}
            </CollapsibleTrigger>
          )}
        </SidebarMenuButton>
        <CollapsibleTrigger asChild>
          <SidebarMenuAction
            aria-label={`${open ? "Close" : "Open"} ${item.sidebarText}`}
            className="transition-transform data-[state=open]:rotate-90"
          >
            <ChevronRight />
          </SidebarMenuAction>
        </CollapsibleTrigger>
        {badgeNode}
        <CollapsibleContent>
          <SidebarMenuSub className="mt-1">
            {children.map((child) => (
              <SidebarNavSubItem key={child.sidebarId} item={child} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function SidebarNavSubItem({ item }: { item: INavSubItemConfig }) {
  const isActive = useCurrentKey() === item.sidebarId;
  const useBadge = item?.useBadge ?? useNoBadge;
  const badge = useBadge();
  const Icon = item.sidebarIcon;

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        asChild
        isActive={isActive}
        className={item?.className}
      >
        <NavLink to={`/${item.sidebarId}`} title={item.sidebarDesc}>
          {Icon && <Icon />}
          <span className="min-w-0 flex-1 truncate">{item.sidebarText}</span>
          {badge ? (
            <span className="ml-auto rounded-full bg-amber-100 px-1.5 text-xs text-amber-900 tabular-nums">
              {badge}
            </span>
          ) : null}
        </NavLink>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}
