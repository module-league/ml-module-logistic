import { ModulePage } from "@/module/page/ModulePage";
import { useModuleData } from "@/module/page/useModuleData";
import type { ModuleDataApi } from "@/module/page/modulePage.types";
import { useCurrentNavItem } from "@/module/shell/navItem.context";
import {
  createField,
  deleteField,
  getFields,
  updateField,
} from "@/services/fields/field.api";
import {
  createRecord,
  getRecord,
  getRecords,
  updateRecord,
} from "@/services/records/record.api";
import { getMembers } from "@/services/user/user.api";
import { uploadAttachment } from "@/services/attachments/attachment.api";

const pageApi: ModuleDataApi = {
  getFields,
  getRecords,
  getRecord,
  createRecord,
  updateRecord,
  createField,
  updateField,
  deleteField,
  getMembers,
  uploadAttachment,
};

export default function ShipmentException() {
  const sidebarId = useCurrentNavItem()?.sidebarId;
  const data = useModuleData(sidebarId, pageApi);
  return <ModulePage data={data} />;
}
