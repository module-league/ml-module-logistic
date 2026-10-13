import type { ModuleQueryState } from "@/module/shell/module.types";

/** react-hook-form values: one entry per field, in field order. */
export interface ModuleRecordFormValues {
  values: string[];
}

/** The inputs and buttons shared by the new and the open record dialogs. */
export interface ModuleRecordFormProps {
  fields: ISidebarField[];
  /** Starting values when opening an existing record. */
  values?: ISidebarRecordValues;
  saving: boolean;
  onCancel: () => void;
  onSave: (values: ISidebarRecordValues) => void;
}

export interface ModuleNewRecordFormProps extends ModuleQueryState {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: ISidebarField[];
  /** Return a promise to keep the dialog open until it settles; a rejection shows its message and keeps the input. */
  onSave: (values: ISidebarRecordValues) => void | Promise<unknown>;
}

export interface ModuleOpenRecordProps extends ModuleQueryState {
  /** objId of the record to show; undefined keeps the dialog closed. */
  recordKey?: string;
  onClose: () => void;
  fields: ISidebarField[];
  values?: ISidebarRecordValues;
  /** Without it the dialog is read-only. */
  onSave?: (values: ISidebarRecordValues) => void | Promise<unknown>;
}
