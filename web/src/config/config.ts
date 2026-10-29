import { lazy } from "react";
import {
  FileText,
  Package,
  Receipt,
  Sparkles,
  TriangleAlert,
  Truck,
} from "lucide-react";
import type { IModuleConfig } from "@/module/shell/module.types";

export const moduleConfig: IModuleConfig = {
  code: "logistic",
  title: "Logistic",
  icon: Truck,
  homeKey: "logistic", // switch to "dashboard" once that page is built
  groups: [
    {
      label: "Operations",
      sidebarItems: [
        {
          sidebarId: "logistic",
          sidebarText: "Logistic",
          sidebarDesc: "Track shipments from origin to destination.",
          sidebarIcon: Package,
          page: lazy(() => import("@/pages/Logistic/Logistic")),
          sidebarItems: [
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
              sidebarText: "Tracking event",
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
              // NOTE: the misspelt id is the URL path and the key of saved tabs, so it stays as is.
              sidebarId: "shipment-execption",
              sidebarText: "Shipment exception",
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
          ],
        },
        {
          sidebarId: "dispatch",
          sidebarText: "Dispatch",
          sidebarDesc: "Pending shipments waiting to be dispatched.",
          sidebarIcon: Truck,
          page: lazy(() => import("@/pages/Dispatch/Dispatch")),
        },
        {
          // NOTE: the misspelt id is the URL path (linked from Billing) and the key of saved tabs, so it stays as is.
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
          sidebarDesc: "Papers each shipment needs, collected and verified.",
          sidebarIcon: FileText,
          hidePageSeparator: false,
          page: lazy(() => import("@/pages/Document/Document")),
        },
        {
          sidebarId: "billing",
          sidebarText: "Billing",
          sidebarDesc:
            "Delivered shipments priced from the rate card and invoiced.",
          sidebarIcon: Receipt,
          hidePageSeparator: false,
          page: lazy(() => import("@/pages/Billing/Billing")),
        },
        {
          // Prototype on dummy data; remove or wire up before release
          sidebarId: "ai-agents",
          sidebarText: "AI agents",
          sidebarDesc:
            "Prototype: the AI agents planned for the module, with a demo run of each.",
          sidebarIcon: Sparkles,
          hidePageSeparator: false,
          page: lazy(() => import("@/pages/Agents/Agents")),
        },
      ],
    },
  ],
};
