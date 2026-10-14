import { lazy } from "react";
import { ChartColumn, FileText, LayoutDashboard, MapPin, Package, Receipt, TriangleAlert, Truck } from "lucide-react";
import type { IModuleConfig } from "@/module/shell/module.types";

export const moduleConfig: IModuleConfig = {
  code: "logistic",
  title: "Logistic",
  icon: Truck,
  homeKey: "shipment", // switch to "dashboard" once that page is built
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
          sidebarId: "shipment",
          sidebarText: "Shipments",
          sidebarDesc: "Track shipments from origin to destination.",
          sidebarIcon: Package,
          page: lazy(() => import("@/pages/Shipment")),
        },
        {
          sidebarId: "dispatch",
          sidebarText: "Dispatch",
          sidebarDesc: "Pending shipments waiting to be dispatched.",
          sidebarIcon: Truck,
          // className: "text-amber-700",
          page: lazy(() => import("@/pages/Dispatch")),
        },
        {
          sidebarId: "exeptions",
          sidebarText: "Exeptions",
          sidebarDesc: "",
          sidebarIcon: TriangleAlert,
          hidePageSeparator: false,
          page: lazy(() => import("@/pages/Exeption")),
        },
        {
          sidebarId: "documents",
          sidebarText: "Documents",
          sidebarDesc: "",
          sidebarIcon: FileText,
          hidePageSeparator: false,
          page: lazy(() => import("@/pages/Document")),
        },
        {
          sidebarId: "billing",
          sidebarText: "Billing",
          sidebarDesc: "",
          sidebarIcon: Receipt,
          hidePageSeparator: false,
          page: lazy(() => import("@/pages/Billing")),
        },
        //  {
        //   sidebarId: "master-data",
        //   sidebarText: "Master Data",
        //   sidebarDesc: "",
        //   sidebarIcon: Database,
        //   hidePageSeparator: false,
        //   page: lazy(() => import("@/pages/Shipment")),
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
