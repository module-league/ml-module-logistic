import type { ModuleRecordField, ModuleRecordValues } from "./moduleRecord.types";

/** What ModuleOpenRecord shows: a blank record to add, or an existing row by its getKey value. */
export type ModuleOpenRecordTarget =
  | { mode: "new" }
  | { mode: "open"; recordKey: string };


export interface ModuleOpenRecordProps {
  /** The record to show; undefined keeps the dialog closed. */
  target?: ModuleOpenRecordTarget;
  onClose: () => void;
  fields: ModuleRecordField[];
  /** Starting values when opening an existing record. */
  values?: ModuleRecordValues;
  /** Without it the dialog is read-only. Return a promise to keep it open until the save settles; a rejection shows its message. */
  onSave?: (
    values: ModuleRecordValues,
    target: ModuleOpenRecordTarget,
  ) => void | Promise<unknown>;
}

export interface ModuleOpenRecordFormProps {
  target: ModuleOpenRecordTarget;
  fields: ModuleRecordField[];
  values?: ModuleRecordValues;
  saving: boolean;
  onCancel: () => void;
  onSave?: (values: ModuleRecordValues) => void;
}

