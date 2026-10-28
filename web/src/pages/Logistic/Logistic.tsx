import { ModuleDashboard } from "@/module/dashboard/ModuleDashboard";
import { useDashboardData } from "@/module/dashboard/useDashboardData";
import type { ModuleDashboardApi } from "@/module/dashboard/moduleDashboard.types";
import { useCurrentNavItem } from "@/module/shell/navItem.context";
import { getFields } from "@/services/fields/field.api";
import {
  createRecord,
  getRecords,
  updateRecord,
} from "@/services/records/record.api";
import {
  getDashboard,
  saveDashboard,
} from "@/services/dashboards/dashboard.api";
import { getForms } from "@/services/forms/form.api";
import { getMembers } from "@/services/user/user.api";
import { uploadAttachment } from "@/services/attachments/attachment.api";

const dashboardApi: ModuleDashboardApi = {
  getDashboard,
  saveDashboard,
  getFields,
  getRecords,
  getForms,
  createRecord,
  updateRecord,
  getMembers,
  uploadAttachment,
};

/** The Logistic overview: widgets over shipments, parties, locations and every other table of the module. */
export default function Logistic() {
  const sidebarId = useCurrentNavItem().sidebarId;
  const data = useDashboardData(sidebarId, dashboardApi);
  return <ModuleDashboard data={data} />;
}
