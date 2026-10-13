/** Field values of one record, keyed by ModuleRecordField.key. A select stores the option id. */
export type ModuleRecordValues = Record<string, string>;

/** What ModuleOpenRecord shows: a blank record to add, or an existing row by its getKey value. */
export type ModuleOpenRecordTarget =
  | { mode: "new" }
  | { mode: "open"; recordKey: string };

/** A field with the key its column and record value use (objId for API fields). */
export interface ModuleRecordField {
  key: string;
  field: IField;
}

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

/** react-hook-form values of RecordForm: one entry per field, in field order (field keys can contain dots). */
export interface ModuleRecordFormValues {
  values: string[];
}
