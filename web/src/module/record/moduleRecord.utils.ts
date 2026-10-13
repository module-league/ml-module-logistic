import { formatFieldDate } from "@/lib/dateHelper";

/** Size of the new and open record dialogs. */
export const RECORD_DIALOG_STYLE = {
  width: "100%",
  maxWidth: "60%",
  height: "80%",
  marginTop: "3%",
};

/** The text a value shows in a cell: a select shows its option's label instead of the option id. */
export function toRecordText(field: IField, value?: string | null) {
  if (!value || field?.type === "checkbox") return "";
  if (field?.type === "date") return formatFieldDate(field, value);
  if (field?.type === "single_select") {
    return field?.dropDownValues?.find((option) => option?.id === value)?.value ?? "";
  }
  return value;
}
