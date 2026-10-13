/** The text a value shows in a cell: a select shows its option's label instead of the option id. */
export function toRecordText(field: IField, value?: string | null) {
  if (!value) return "";
  if (field?.type === "single_select") {
    return field?.dropDownValues?.find((option) => option?.id === value)?.value ?? "";
  }
  return value;
}
