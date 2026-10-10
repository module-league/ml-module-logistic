import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { Bell } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Separator,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  Skeleton,
} from "@moduleleague/ui";
import { ModuleSidebar } from "./ModuleSidebar";
import { findActiveNav } from "./nav-util";
import type { ModuleConfig } from "./type";
import { useModuleTheme } from "./use-module-theme";
 
/** Sidebar on the left; header and the current page on the right. */
export function ModuleLayout({ config }: { config: ModuleConfig }) {
  useModuleTheme(config.theme);
  const { pathname } = useLocation();
  const active = findActiveNav(config, pathname);
 
  return (
    <SidebarProvider>
      <ModuleSidebar config={config} />
 
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
 
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:inline-flex">{config.title}</BreadcrumbItem>
              {active && (
                <>
                  <BreadcrumbSeparator className="hidden md:inline-flex" />
                  <BreadcrumbItem className="hidden md:inline-flex">{active.groupLabel}</BreadcrumbItem>
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
            {/* Pages are lazy-loaded; show a placeholder while one downloads */}
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
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
