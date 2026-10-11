import { Suspense, useState, type CSSProperties } from "react";
import { Outlet } from "react-router";
import { Group, Panel, Separator, usePanelRef } from "react-resizable-panels";
import {
  SidebarInset,
  SidebarProvider,
  Skeleton,
  useIsMobile,
} from "@moduleleague/ui";
import { ModuleSidebar } from "./ModuleSidebar";
import { ModuleTopActivity } from "./ModuleViewerTab";
import { TopBarActions } from "./TopBarActions";
import type { ModuleBackground, ModuleConfig } from "./type";
import { useModuleTheme } from "./use-module-theme";

const BACKDROP_CLASS = "bg-cover bg-fixed bg-center";
/** Sidebar on the left; header and the current page on the right. */
export function ModuleLayout({ config }: { config: ModuleConfig }) {
  useModuleTheme(config.theme);
  const isMobile = useIsMobile();
  const sidebarPanel = usePanelRef();
  const [open, setOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>();
  const backdrop = backdropStyle(config.theme.background);

  // Phones get the sidebar as a slide-over sheet, so there is nothing to resize
  if (isMobile) {
    return (
      <SidebarProvider className={BACKDROP_CLASS} style={backdrop}>
        <ModuleSidebar config={config} />
        <ModuleMain config={config} />
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) sidebarPanel.current?.expand();
        else sidebarPanel.current?.collapse();
      }}
      className={BACKDROP_CLASS}
      style={
        {
          ...backdrop,
          ...(sidebarWidth && { "--sidebar-width": `${sidebarWidth}px` }),
        } as CSSProperties
      }
    >
      {/* Grab zone of at least 16px (28px on touch) centred on the separator */}
      <Group
        orientation="horizontal"
        style={{ height: "100svh" }}
        resizeTargetMinimumSize={{ fine: 16, coarse: 28 }}
      >
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
        <Separator className="z-20 w-1 shadow-sm bg-background bg-sidebar-accent hover:bg-primary" />
        <Panel id="content">
          <ModuleMain config={config} />
        </Panel>
      </Group>
    </SidebarProvider>
  );
}

function ModuleMain({ config }: { config: ModuleConfig }) {
  // const { pathname } = useLocation();
  // const active = findActiveNav(config, pathname);
  // const { isMobile: showTrigger } = useSidebar();

  return (
    <>
      <TopBarActions />

      <div className="flex min-h-full w-full flex-col pl-4">
        {/* Glass frame: a second, translucent border (top and left only) that blurs the backdrop behind it */}
        <div className="flex flex-1 flex-col rounded-tl-2xl border-t border-l border-white/50 bg-white/25 pt-1.5 pl-1.5 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-white/5">
          <SidebarInset className="flex-1 overflow-hidden rounded-tl-xl border-t border-l shadow-sm">
            <ModuleTopActivity config={config} />

            <div className="flex-1 bg-muted/40 p-4 md:p-6">
              <div className="max-w-[calc(100%-2rem)] mx-auto w-full">
                <Suspense fallback={<PageLoading />}>
                  <Outlet />
                </Suspense>
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>
    </>
  );
}

function backdropStyle(
  background: ModuleBackground | undefined,
): CSSProperties {
  return {
    backgroundColor: background?.color ?? "var(--sidebar)",
    backgroundImage: background?.image
      ? `url("${backgroundImageUrl(background.image)}")`
      : undefined,
  };
}

function backgroundImageUrl(image: string) {
  return image.includes("/")
    ? image
    : `${import.meta.env.BASE_URL}moduleLayoutBgImg/${image}`;
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
