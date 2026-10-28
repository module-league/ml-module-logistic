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
  deleteRecords,
} from "@/services/records/record.api";
import {
  createForm,
  deleteForm,
  getForms,
  reorderForms,
  updateForm,
} from "@/services/forms/form.api";
import { getMembers } from "@/services/user/user.api";
import { uploadAttachment } from "@/services/attachments/attachment.api";

const pageApi: ModuleDataApi = {
  getFields,
  getRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecords,
  createField,
  updateField,
  deleteField,
  getForms,
  createForm,
  updateForm,
  deleteForm,
  reorderForms,
  getMembers,
  uploadAttachment,
};

export default function ShipmentLocation() {
  const sidebarId = useCurrentNavItem().sidebarId;
  const data = useModuleData(sidebarId, pageApi);
  return <ModulePage data={data} />;
}
