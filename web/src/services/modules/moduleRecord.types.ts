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
