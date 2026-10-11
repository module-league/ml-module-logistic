import { lazy } from "react";
import { ChartColumn, ClipboardClock, LayoutDashboard, MapPin, PackageCheck, Truck } from "lucide-react";
import { mdBgPic1 } from "@/assets/moduleLayoutBgImg";
import type { IModuleConfig } from "@/components/app/type";
import { usePendingCount } from "@/services/sample-data";

export const moduleConfig: IModuleConfig = {
  code: "logistic",
  title: "Logistic",
  icon: Truck,
  // Colours (primary etc.) live in src/styles/theme.css; only the backdrop is set per module
  theme: {
    background: { color: "#eef1f6", image: mdBgPic1 },
  },
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
        // {
        //   keyValue: "delivered",
        //   text: "Delivered",
        //   description: "Shipments that reached their destination.",
        //   icon: PackageCheck,
        //   page: ComingSoon,
        // },
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
