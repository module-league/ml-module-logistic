import { ModulePage } from "@/module/page/ModulePage";
import { useModuleData } from "@/module/page/useModuleData";
import type { ModuleDataApi } from "@/module/page/modulePage.types";
import { useCurrentNavItem } from "@/module/shell/navItem.context";
import {
  createLogisticField,
  deleteLogisticField,
  getLogisticFields,
  updateLogisticField,
} from "@/services/fields/field.api";
import {
  createLogisticRecord,
  getLogisticRecord,
  getLogisticRecords,
  updateLogisticRecord,
} from "@/services/records/record.api";
import { getLogisticMembers } from "@/services/user/user.api";

const awaitingTaskApi: ModuleDataApi = {
  getFields: getLogisticFields,
  getRecords: getLogisticRecords,
  getRecord: getLogisticRecord,
  createRecord: createLogisticRecord,
  updateRecord: updateLogisticRecord,
  createField: createLogisticField,
  updateField: updateLogisticField,
  deleteField: deleteLogisticField,
  getMembers: getLogisticMembers,
};

export default function AwaitingTask() {
  const sidebarId = useCurrentNavItem()?.sidebarId;
  const data = useModuleData(sidebarId, awaitingTaskApi);
  return <ModulePage data={data} />;
}
