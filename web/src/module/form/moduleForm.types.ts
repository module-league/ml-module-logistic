import type { ModuleQueryState } from "@/module/shell/module.types";
import type { ModuleData } from "@/module/page/modulePage.types";

export interface ModuleFormDialogProps
  extends
    ModuleQueryState,
    Pick<
      ModuleData,
      | "forms"
      | "onAddForm"
      | "onUpdateForm"
      | "onDeleteForm"
      | "onReorderForms"
      | "onUploadAttachment"
      | "members"
    > {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The sidebar's name, e.g. "Dispatch". */
  title: string;
  /** The sidebar's fields; the ones people fill in can go on a form. */
  fields: ISidebarField[];
}

export interface ModuleFormEditorProps extends Pick<
  ModuleFormDialogProps,
  "onUpdateForm" | "onUploadAttachment" | "members"
> {
  form: ISidebarForm;
  /** The fields that can go on a form, in display order. */
  fillableFields: ISidebarField[];
  onDelete: () => void;
}
