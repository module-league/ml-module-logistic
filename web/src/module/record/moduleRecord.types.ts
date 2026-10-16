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
  /** Answers a new record starts with, by field objId, e.g. a form's default values. */
  initialValues?: ISidebarRecordValues;
  /** Empty-input hints by field objId; the field type's hint for the rest. */
  placeholders?: Record<string, string>;
  saving?: boolean;
  /** Inputs are disabled. */
  readOnly?: boolean;
  submitLabel?: string;
  savingLabel?: string;
  /** "form" lays the fields out as cards with the buttons under them, for a form's own layout; "dialog" is label beside input with a dialog footer. */
  variant?: "dialog" | "form";
  /** The "form" variant's button that puts every answer back to how it started. */
  clearLabel?: string;
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

export interface ModuleLookupFormInputProps extends Pick<
  RecordInputControlProps,
  "field" | "members" | "onPreview" | "previewActive" | "className"
> {
  control: Control<ModuleRecordFormValues>;
  /** Form index of the lookup's link field; undefined when it isn't in the form. */
  linkIndex?: number;
}

export interface ModuleFormulaFormInputProps extends Pick<
  RecordInputControlProps,
  "field" | "className"
> {
  control: Control<ModuleRecordFormValues>;
  /** Every field of the form, in the order of its values. */
  fields: ISidebarField[];
}

export interface ModuleNewRecordProps
  extends ModuleQueryState, Pick<ModuleRecordFormProps, "onUploadAttachment"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** @default "New record" */
  title?: string;
  /** Shown under the title. */
  description?: string;
  fields: ISidebarField[];
  members?: IUserInfo[];
  /** Return a promise to keep the dialog open until it settles; a rejection shows its message and keeps the input. */
  onSave: (values: ISidebarRecordValues) => void | Promise<unknown>;
}

export interface ModuleNewRecordWithFormProps extends ModuleNewRecordProps {
  /** Its cover, logo, title, description, fields in order with their hints and defaults, and button texts; undefined while it loads. */
  form?: ISidebarForm;
}

export interface ModuleOpenRecordProps
  extends ModuleQueryState, Pick<ModuleRecordFormProps, "onUploadAttachment"> {
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
