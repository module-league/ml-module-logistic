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
import { RecordLookupContext } from "@/components/custom/RecordLookup.context";
import { useMemo } from "react";

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

export default function Logistic() {
  const item = useCurrentNavItem();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="flex min-h-0 flex-1 flex-col"></main>
    </div>
  );
}
