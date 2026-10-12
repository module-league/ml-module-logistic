import { lazy } from "react";
import { ChartColumn, ClipboardClock, LayoutDashboard, MapPin, PackageCheck, Truck } from "lucide-react";
import type { IModuleConfig } from "@/services/module.types";
import { usePendingCount } from "@/services/sample-data";

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
    //       keyValue: "dashboard",
    //       text: "Dashboard",
    //       description: "Today’s shipments at a glance.",
    //       icon: LayoutDashboard,
    //       page: ComingSoon,
    //     },
    //   ],
    // },
    {
      label: "Operations",
      items: [
        {
          keyValue: "logistics",
          text: "Logistics",
          description: "Track shipments from origin to destination.",
          icon: Truck,
          page: lazy(() => import("@/components/pages/LogisticList")),
        },
        {
          keyValue: "awaiting-task",
          text: "Awaiting Task",
          description: "Pending shipments waiting to be dispatched.",
          icon: ClipboardClock,
          className: "text-amber-700",
          useBadge: usePendingCount,
          page: lazy(() => import("@/components/pages/AwaitingTask")),
        },
        {
          keyValue: "record-test",
          text: "Record Test",
          description: "",
          icon: PackageCheck,
          hidePageSeparator: false,
          page: lazy(() => import("@/components/pages/RecordTest")),
        },
        // {
        //   keyValue: "routes",
        //   text: "Routes",
        //   description: "Origins, destinations and transit times.",
        //   icon: MapPin,
        //   page: ComingSoon,
        // },
      ],
    },
    // {
    //   label: "Insights",
    //   items: [
    //     {
    //       keyValue: "reports",
    //       text: "Reports",
    //       description: "Volumes and delivery times by route.",
    //       icon: ChartColumn,
    //       page: ComingSoon,
    //     },
    //   ],
    // },
  ],
};
