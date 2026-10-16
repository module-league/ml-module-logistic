import { formatFieldDate, formatFieldTime } from "./dateHelper";
import { memberNames } from "./memberHelper";
import { attachmentNames } from "./attachmentHelper";
import { formatFieldNumber } from "./numberHelper";
import { optionNames } from "./selectHelper";
import {
  isLinkingField,
  lookupDisplayField,
  lookupRecordsOf,
  parseRecordIds,
  type RecordLookups,
} from "./lookupHelper";

/** The text a value shows in a cell: a select shows its option's label, a member field the people's names, a link or lookup its records' labels. */
export function toRecordText(
  field: IField,
  value?: string | null,
  members?: IUserInfo[],
  lookups?: RecordLookups,
): string {
  if (!value || field?.type === "checkbox") return "";
  if (field?.type === "member") return memberNames(members, value);
  if (field?.type === "attachment") return attachmentNames(value);
  if (field?.isDateField) return formatFieldDate(field, value);
  if (field?.type === "time") return formatFieldTime(field, value);
  if (field?.isNumeric) {
    return formatFieldNumber(field, value);
  }
  if (field?.type === "single_select") {
    return (
      field?.dropDownValues?.find((option) => option?.id === value)?.value ?? ""
    );
  }
  if (field?.type === "multi_select") return optionNames(field, value);
  if (isLinkingField(field)) {
    return lookupLabels(field, value, members, lookups)
      .map((linked) => linked.label)
      .join(", ");
  }
  return value;
}

/** Each linked record of a link value with the text of the field shown for it, in order. A lookup's value is its link field's value. */
export function lookupLabels(
  field: IField,
  value?: string | null,
  members?: IUserInfo[],
  lookups?: RecordLookups,
) {
  const records = lookupRecordsOf(field, lookups);
  const shown = lookupDisplayField(field, lookups);
  const byId = new Map(records?.map((record) => [record?.objId, record]));
  return parseRecordIds(value).map((id) => ({
    id,
    label: linkedRecordLabel(shown, records && byId.get(id), members, !records),
  }));
}

/** A linked record's label: the shown field's text, "Untitled record" when it is empty. */
export function linkedRecordLabel(
  shown: ISidebarField | undefined,
  record: ISidebarRecord | undefined,
  members?: IUserInfo[],
  loading = false,
) {
  if (loading) return "…";
  if (!record) return "Unknown record";
  return (
    (shown && toRecordText(shown, record?.values?.[shown.objId], members)) ||
    "Untitled record"
  );
}
