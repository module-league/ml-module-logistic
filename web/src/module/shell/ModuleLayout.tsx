import { useState, type CSSProperties } from "react";
import { Group, Panel, usePanelRef } from "react-resizable-panels";
import { SidebarInset, SidebarProvider, useIsMobile } from "@moduleleague/ui";
import { ResizeSeparator } from "@/components/custom/ResizeSeparator";
import { ModuleSidebar } from "./ModuleSidebar";
import { TopBarActions } from "./TopBarActions";
import { WorkspaceView } from "@/module/workspace/WorkspaceView";
import type { IModuleConfig } from "./module.types";

const BACKDROP_CLASS = "bg-sidebar bg-(image:--module-backdrop) bg-fixed";

export function ModuleLayout({ config }: { config: IModuleConfig }) {
  const isMobile = useIsMobile();
  const sidebarPanel = usePanelRef();
  const [open, setOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>();

  // Phones get the sidebar as a slide-over sheet, so there is nothing to resize
  if (isMobile) {
    return (
      <SidebarProvider className={BACKDROP_CLASS}>
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
        sidebarWidth
          ? ({ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties)
          : undefined
      }
    >
      <Group
        orientation="horizontal"
        style={{ height: "100svh" }}
        resizeTargetMinimumSize={{ fine: 16, coarse: 28 }}
        disableCursor
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
        <ResizeSeparator
          orientation="horizontal"
          className="z-20 shadow-sm bg-background bg-sidebar-accent data-[separator=active]:bg-primary data-[separator=hover]:bg-primary"
        />
        <Panel id="content">
          <ModuleMain config={config} />
        </Panel>
      </Group>
    </SidebarProvider>
  );
}

function ModuleMain({ config }: { config: IModuleConfig }) {
  // const { isMobile: showTrigger } = useSidebar();

  return (
    <div className="flex h-svh w-full flex-col">
      <TopBarActions />

      <div className="flex min-h-0 w-full flex-1 flex-col pl-4">
        {/* Glass frame: a second, translucent border (top and left only) that blurs the backdrop behind it */}
        <div className="flex min-h-0 flex-1 flex-col rounded-tl-2xl border-t border-l border-white/50 bg-white/25 pt-1.5 pl-1.5 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-white/5">
          <SidebarInset className="min-h-0 flex-1 overflow-hidden rounded-tl-xl border-t border-l shadow-sm">
            <WorkspaceView config={config} />
          </SidebarInset>
        </div>
      </div>
    </div>
  );
}
