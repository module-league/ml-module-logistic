import type { Control } from "react-hook-form";
import type { ModuleQueryState } from "@/module/shell/module.types";
import type { RecordInputControlProps } from "@/components/custom/RecordInputControl";
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
  /** Shows a preview button next to each lookup field whose preview is on. */
  onPreviewLookup?: (field: ISidebarField) => void;
  /** objId of the lookup field whose preview is showing. */
  previewFieldId?: string;
}

export interface ModuleLookupFormInputProps
  extends Pick<
    RecordInputControlProps,
    "field" | "members" | "onPreview" | "previewActive" | "className"
  > {
  control: Control<ModuleRecordFormValues>;
  /** Form index of the lookup's link field; undefined when it isn't in the form. */
  linkIndex?: number;
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
  /** objIds of the records before and after this one in the grid; undefined turns that arrow off. */
  previousKey?: string;
  nextKey?: string;
  /** Opens another record, after any unsaved edits are saved. */
  onNavigate?: (recordKey: string) => void;
  /** Called by auto-save after edits pause; without it the dialog is read-only. A rejection shows its message. */
  onSave?: (values: ISidebarRecordValues) => void | Promise<unknown>;
}

export interface ModuleLookupPreviewProps {
  field: IField;
  /** Its link field's current value, unsaved edits included: a JSON array of linked record ids. */
  value?: string | null;
  members?: IUserInfo[];
  onClose: () => void;
}

export interface ModuleLinkedRecordCardProps {
  label: string;
  /** Undefined while loading, or when the linked record no longer exists. */
  record?: ISidebarRecord;
  /** The looked-up sidebar's fields to list, in display order. */
  fields: ISidebarField[];
  /** Each field's value as text, in the order of fields; what the search matches. */
  texts: string[];
  /** The lower-cased search; matches are marked and the card stays open. */
  term: string;
  members?: IUserInfo[];
  defaultOpen?: boolean;
}

export interface ModuleAutoSaveStatusProps {
  status: AutoSaveStatus;
}
