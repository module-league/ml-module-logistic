import type { ModuleQueryState } from "@/module/shell/module.types";
import type { AttachmentUploadHandler } from "@/components/custom/RecordAttachmentInput.types";

/** react-hook-form values: one entry per field, in field order. */
export interface ModuleRecordFormValues {
  values: string[];
}

/** Where useAutoSave is: an edit waiting for the pause, a save running, the last save done or failed. */
export type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

/** The inputs and buttons shared by the new and the open record dialogs. */
export interface ModuleRecordFormProps {
  fields: ISidebarField[];
  /** People member fields can pick from. */
  members?: IUserInfo[];
  /** Uploads files for attachment fields. */
  onUploadAttachment?: AttachmentUploadHandler;
  /** Starting values of an existing record; Save then stays off until something changes. */
  values?: ISidebarRecordValues;
  saving?: boolean;
  /** Inputs are disabled. */
  readOnly?: boolean;
  submitLabel?: string;
  savingLabel?: string;
  onCancel?: () => void;
  /** Shows the Cancel and submit buttons. */
  onSave?: (values: ISidebarRecordValues) => void;
  /** Called with every value after each edit; used for auto-save. */
  onValuesChange?: (values: ISidebarRecordValues) => void;
}

export interface ModuleNewRecordFormProps
  extends ModuleQueryState,
    Pick<ModuleRecordFormProps, "onUploadAttachment"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: ISidebarField[];
  members?: IUserInfo[];
  /** Return a promise to keep the dialog open until it settles; a rejection shows its message and keeps the input. */
  onSave: (values: ISidebarRecordValues) => void | Promise<unknown>;
}

export interface ModuleOpenRecordProps
  extends ModuleQueryState,
    Pick<ModuleRecordFormProps, "onUploadAttachment"> {
  /** objId of the record to show; undefined keeps the dialog closed. */
  recordKey?: string;
  onClose: () => void;
  fields: ISidebarField[];
  members?: IUserInfo[];
  record?: ISidebarRecord;
  /** Called by auto-save after edits pause; without it the dialog is read-only. A rejection shows its message. */
  onSave?: (values: ISidebarRecordValues) => void | Promise<unknown>;
}

export interface ModuleAutoSaveStatusProps {
  status: AutoSaveStatus;
}
