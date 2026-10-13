/** Field values of one record, keyed by ModuleRecordField.key. A select stores the option id. */
export type ModuleRecordValues = Record<string, string>;

/** A field with the key its column and record value use (objId for API fields). */
export interface ModuleRecordField {
  key: string;
  field: IField;
}

/** react-hook-form values: one entry per field, in field order (field keys can contain dots). */
export interface ModuleRecordFormValues {
  values: string[];
}

export interface ModuleNewRecordFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: ModuleRecordField[];
  /** The page is fetching the fields; the body shows the loader. */
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Return a promise to keep the dialog open until it settles; a rejection shows its message and keeps the input. */
  onSave: (values: ModuleRecordValues) => void | Promise<unknown>;
}

export interface ModuleNewRecordFieldsProps {
  fields: ModuleRecordField[];
  saving: boolean;
  onCancel: () => void;
  onSave: (values: ModuleRecordValues) => void;
}

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

