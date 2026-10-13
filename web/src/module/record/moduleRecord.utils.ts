/** The text a value shows in a cell: a select shows its option's label instead of the option id. */
export function toRecordText(field: IField, value?: string | null) {
  if (!value) return "";
  if (field?.type === "single_select") {
    return field?.dropDownValues?.find((option) => option?.id === value)?.value ?? "";
  }
  return value;
}

/** The field a card uses as its title: the primary field, else the first one. */
export function primaryFieldOf(fields: ISidebarField[]) {
  return fields?.find((field) => field?.isPrimaryField) ?? fields?.[0];
}
