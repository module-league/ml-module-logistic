import { lazy } from "react";
import { ChartColumn, FileText, LayoutDashboard, MapPin, Package, Receipt, TriangleAlert, Truck } from "lucide-react";
import type { IModuleConfig } from "@/module/shell/module.types";

export const moduleConfig: IModuleConfig = {
  code: "logistic",
  title: "Logistic",
  icon: Truck,
  homeKey: "logistic", // switch to "dashboard" once that page is built
  groups: [
    // {
    //   label: "Overview",
    //   sidebarItems: [
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
      sidebarItems: [
        {
          sidebarId: "logistic",
          sidebarText: "Logistic",
          sidebarDesc: "Track shipments from origin to destination.",
          sidebarIcon: Package,
          page: lazy(() => import("@/pages/Logistic/Logistic")),
          sidebarItems:[
            {
                sidebarId: "shipment",
                sidebarText: "Shipments",
                sidebarDesc: "Track shipments from origin to destination.",
                sidebarIcon: Package,
                page: lazy(() => import("@/pages/Logistic/Shipment")),
            },
            {
              sidebarId: "shipment-party",
              sidebarText: "Party",
              sidebarDesc: "Track shipments from origin to destination.",
              sidebarIcon: Package,
              page: lazy(() => import("@/pages/Logistic/ShipmentParty")),
            },
            {
              sidebarId: "shipment-package",
              sidebarText: "Package",
              sidebarDesc: "Track shipments from origin to destination.",
              sidebarIcon: Package,
              page: lazy(() => import("@/pages/Logistic/ShipmentPackage")),
            },
            {
              sidebarId: "shipment-tracking-event",
              sidebarText: "Tracking Event",
              sidebarDesc: "Track shipments from origin to destination.",
              sidebarIcon: Package,
              page: lazy(() => import("@/pages/Logistic/ShipmentTrackEvent")),
            },
            {
              sidebarId: "shipment-location",
              sidebarText: "Location",
              sidebarDesc: "Track shipments from origin to destination.",
              sidebarIcon: Package,
              page: lazy(() => import("@/pages/Logistic/ShipmentLocation")),
            },
            {
              sidebarId: "shipment-execption",
              sidebarText: "Shipment Execption",
              sidebarDesc: "Track shipments from origin to destination.",
              sidebarIcon: Package,
              page: lazy(() => import("@/pages/Logistic/ShipmentException")),
            },
             {
              sidebarId: "shipment-driver",
              sidebarText: "Driver",
              sidebarDesc: "Track shipments from origin to destination.",
              sidebarIcon: Package,
              page: lazy(() => import("@/pages/Logistic/Driver")),
            },
             {
              sidebarId: "shipment-vehicle",
              sidebarText: "Vehicle",
              sidebarDesc: "Track shipments from origin to destination.",
              sidebarIcon: Package,
              page: lazy(() => import("@/pages/Logistic/Vehicle")),
            },
          ]
        },
        {
          sidebarId: "dispatch",
          sidebarText: "Dispatch",
          sidebarDesc: "Pending shipments waiting to be dispatched.",
          sidebarIcon: Truck,
          // className: "text-amber-700",
          page: lazy(() => import("@/pages/Dispatch/Dispatch")),
        },
        {
          sidebarId: "exeptions",
          sidebarText: "Exceptions",
          sidebarDesc: "Late dispatches and problems being worked on.",
          sidebarIcon: TriangleAlert,
          hidePageSeparator: false,
          page: lazy(() => import("@/pages/Exception/Exception")),
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
    //   sidebarItems: [
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
