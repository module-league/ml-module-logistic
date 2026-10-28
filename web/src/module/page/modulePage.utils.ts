import { formulaValue } from "@/lib/formulaHelper";

/** Shows when each record was created; filled from the record itself, not from a saved field. */
const CREATE_TIME_FIELD: ISidebarField = {
  objId: "ds_create_time",
  sidebarId: "",
  versionNo: 0,
  createTime: "",
  name: "Create time",
  type: "ds_create_time",
  isPrimaryField: false,
  isEditable: false,
  isSystemField: true,
  isSelectionField: false,
  isDateField: true,
  isUserField: false,
  isNumeric: false,
  isPlainField: false,
  dateFormat: "dd/MM/yyyy",
  displayTime: true,
  timeFormat: "hh:mm a",
  categoryId: "",
  displayOrder: Number.MAX_SAFE_INTEGER,
  dropDownValues: [],
};

/** Columns every sidebar has. They can be hidden or moved, but not added, edited or deleted. */
export const SYSTEM_FIELDS: ISidebarField[] = [CREATE_TIME_FIELD];

const SYSTEM_FIELD_VALUES: Partial<
  Record<IField["type"], (record?: ISidebarRecord) => string | undefined>
> = {
  ds_create_time: (record) => record?.createTime,
};

/** A record's value for a field: from the record itself for system fields, its link field's linked record ids for a lookup, worked out for a formula, from its values otherwise. */
export function recordFieldValue(
  field: ISidebarField,
  record?: ISidebarRecord,
) {
  if (field.isSystemField) return SYSTEM_FIELD_VALUES[field.type]?.(record);
  if (field.type === "lookup") {
    return record?.values?.[field.lookupSettings?.linkFieldId ?? ""];
  }
  if (field.type === "formula") return formulaValue(field, record?.values);
  return record?.values?.[field.objId];
}
