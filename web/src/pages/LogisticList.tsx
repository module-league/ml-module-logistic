import { ModulePage } from "@/module/page/ModulePage";
import { useModuleData } from "@/module/page/useModuleData";
import type { ModuleDataApi } from "@/module/page/modulePage.types";
import { useCurrentNavItem } from "@/module/shell/navItem.context";
import {
  createLogisticField,
  getLogisticFields,
} from "@/services/fields/field.api";
import {
  createLogisticRecord,
  getLogisticRecord,
  getLogisticRecords,
  updateLogisticRecord,
} from "@/services/records/record.api";
import { getLogisticMembers } from "@/services/user/user.api";

const logisticListApi: ModuleDataApi = {
  getFields: getLogisticFields,
  getRecords: getLogisticRecords,
  getRecord: getLogisticRecord,
  createRecord: createLogisticRecord,
  updateRecord: updateLogisticRecord,
  createField: createLogisticField,
  getMembers: getLogisticMembers,
};

export default function LogisticList() {
  const sidebarId = useCurrentNavItem()?.sidebarId;
  const data = useModuleData(sidebarId, logisticListApi);
  return <ModulePage data={data} />;
}
