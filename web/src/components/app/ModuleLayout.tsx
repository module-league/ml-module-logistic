import { Suspense, useState, type CSSProperties } from "react";
import { Outlet, useLocation } from "react-router";
import { Bell } from "lucide-react";
import { Group, Panel, Separator, usePanelRef } from "react-resizable-panels";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Separator as Divider,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  Skeleton,
  useIsMobile,
  useSidebar,
} from "@moduleleague/ui";
import { ModuleSidebar } from "./ModuleSidebar";
import { findActiveNav } from "./nav-util";
import type { ModuleConfig } from "./type";
import { useModuleTheme } from "./use-module-theme";

/** Sidebar on the left; header and the current page on the right. */
export function ModuleLayout({ config }: { config: ModuleConfig }) {
  useModuleTheme(config.theme);
  const isMobile = useIsMobile();
  const sidebarPanel = usePanelRef();
  const [open, setOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>();

  // Phones get the sidebar as a slide-over sheet, so there is nothing to resize
  if (isMobile) {
    return (
      <SidebarProvider>
        <ModuleSidebar config={config} />
        <ModuleMain config={config} />
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider
      open={open}
      onOpenChange={(next) =>
        next ? sidebarPanel.current?.expand() : sidebarPanel.current?.collapse()
      }
      style={
        sidebarWidth
          ? ({ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties)
          : undefined
      }
    >
      <Group orientation="horizontal" style={{ height: "100svh" }}>
        <Panel
          id="sidebar"
          panelRef={sidebarPanel}
          defaultSize={256}
          minSize={192}
          maxSize={384}
          collapsible
          collapsedSize={48}
          groupResizeBehavior="preserve-pixel-size"
          onResize={(size) => {
            const collapsed = sidebarPanel.current?.isCollapsed() ?? false;
            setOpen(!collapsed);
            if (!collapsed) setSidebarWidth(size.inPixels);
          }}
        >
          <ModuleSidebar
            config={config}
            className="transition-none group-data-[side=left]:border-r-0"
          />
        </Panel>
        <Separator className="z-20 w-1 bg-sidebar-border outline-none focus-visible:bg-sidebar-ring" />
        <Panel id="content">
          <ModuleMain config={config} />
        </Panel>
      </Group>
    </SidebarProvider>
  );
}

function ModuleMain({ config }: { config: ModuleConfig }) {
  const { pathname } = useLocation();
  const active = findActiveNav(config, pathname);
  const { isMobile, state } = useSidebar();
  const showTrigger = isMobile || state === "collapsed";

  return (
    <SidebarInset className="min-h-full">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
        {showTrigger && (
          <>
            <SidebarTrigger className="-ml-1" />
            <Divider orientation="vertical" className="mr-2 h-4" />
          </>
        )}

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:inline-flex">
              {config.title}
            </BreadcrumbItem>
            {active && (
              <>
                <BreadcrumbSeparator className="hidden md:inline-flex" />
                <BreadcrumbItem className="hidden md:inline-flex">
                  {active.groupLabel}
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:inline-flex" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{active.item.text}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto flex items-center gap-2">
          {import.meta.env.DEV && (
            <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-medium text-amber-900">
              DEV
            </span>
          )}
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell />
          </Button>
        </div>
      </header>

      <div className="flex-1 bg-muted/40 p-4 md:p-6">
        <div className="mx-auto w-full max-w-7xl">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </SidebarInset>
  );
}

function PageLoading() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
