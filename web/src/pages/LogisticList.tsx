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
  getLogisticRecords,
} from "@/services/records/record.api";

const logisticListApi: ModuleDataApi = {
  getFields: getLogisticFields,
  getRecords: getLogisticRecords,
  createRecord: createLogisticRecord,
  createField: createLogisticField,
};

export default function LogisticList() {
  const sidebarId = useCurrentNavItem()?.sidebarId;
  const data = useModuleData(sidebarId, logisticListApi);
  return <ModulePage data={data} />;
}
