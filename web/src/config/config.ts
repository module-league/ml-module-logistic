import { lazy } from "react";
import { ChartColumn, ClipboardClock, LayoutDashboard, MapPin, PackageCheck, Truck } from "lucide-react";
import type { IModuleConfig } from "@/module/shell/module.types";

export const moduleConfig: IModuleConfig = {
  code: "logistic",
  title: "Logistic",
  icon: Truck,
  homeKey: "logistics", // switch to "dashboard" once that page is built
  groups: [
    // {
    //   label: "Overview",
    //   items: [
    //     {
    //       sidebarId: "dashboard",
    //       sidebarText: "Dashboard",
    //       sidebarDesc: "Today’s shipments at a glance.",
    //       sidebarIcon: LayoutDashboard,
    //       page: ComingSoon,
    //     },
    //   ],
    // },
    {
      label: "Operations",
      items: [
        {
          sidebarId: "logistics",
          sidebarText: "Logistics",
          sidebarDesc: "Track shipments from origin to destination.",
          sidebarIcon: Truck,
          page: lazy(() => import("@/pages/LogisticList")),
        },
        {
          sidebarId: "awaiting-task",
          sidebarText: "Awaiting Task",
          sidebarDesc: "Pending shipments waiting to be dispatched.",
          sidebarIcon: ClipboardClock,
          className: "text-amber-700",
          page: lazy(() => import("@/pages/AwaitingTask")),
        },
        {
          sidebarId: "record-test",
          sidebarText: "Record Test",
          sidebarDesc: "",
          sidebarIcon: PackageCheck,
          hidePageSeparator: false,
          page: lazy(() => import("@/pages/RecordTest")),
        },
        // {
        //   sidebarId: "routes",
        //   sidebarText: "Routes",
        //   sidebarDesc: "Origins, destinations and transit times.",
        //   sidebarIcon: MapPin,
        //   page: ComingSoon,
        // },
      ],
    },
    // {
    //   label: "Insights",
    //   items: [
    //     {
    //       sidebarId: "reports",
    //       sidebarText: "Reports",
    //       sidebarDesc: "Volumes and delivery times by route.",
    //       sidebarIcon: ChartColumn,
    //       page: ComingSoon,
    //     },
    //   ],
    // },
  ],
};
