import { parseOptionIds, toOptionsValue } from "./selectHelper";

/** A sidebar a lookup field can link to: one that has at least one field to show. */
export interface LookupSource {
  sidebarId: string;
  sidebarText: string;
  fields: ISidebarField[];
}

/** The fields and records of each looked-up sidebar, by sidebarId; a sidebar still loading is left out. */
export type RecordLookups = Record<
  string,
  { fields: ISidebarField[]; records: ISidebarRecord[] }
>;

/** A lookup value is a JSON array of record ids, stored like a multi select's option ids. */
export const parseRecordIds = parseOptionIds;
export const toRecordIdsValue = toOptionsValue;

const SHOWN_TYPES: IField["type"][] = [
  "text",
  "long_text",
  "number",
  "currency",
  "single_select",
  "multi_select",
  "date",
  "member",
];

/** Field types a lookup can show for each linked record; the API allows the same ones. */
export function canShowInLookup(field?: Pick<IField, "type">) {
  return !!field && SHOWN_TYPES.includes(field.type);
}

/** The fields of a source a lookup can show, primary field first. */
export function shownLookupFields(source?: LookupSource) {
  return (source?.fields?.filter(canShowInLookup) ?? []).sort(
    (a, b) => Number(b?.isPrimaryField) - Number(a?.isPrimaryField),
  );
}

/** objId of the Create time system column, which a lookup preview can show too. */
export const LOOKUP_CREATE_TIME_ID = "ds_create_time";

/** The fields of a looked-up sidebar a preview can show, in display order; lookup fields are left out. */
export function previewableLookupFields(fields?: ISidebarField[]) {
  return (fields ?? [])
    .filter((field) => field?.type !== "lookup")
    .sort((a, b) => (a?.displayOrder ?? 0) - (b?.displayOrder ?? 0));
}

/** The field a lookup shows; when it was deleted, the source's primary or first showable field instead. */
export function lookupDisplayField(field: IField, lookups?: RecordLookups) {
  const fields = lookups?.[field?.lookupSettings?.categoryId ?? ""]?.fields;
  return (
    fields?.find((f) => f?.objId === field?.lookupSettings?.lookupFieldId) ??
    fields?.find((f) => f?.isPrimaryField && canShowInLookup(f)) ??
    fields?.find(canShowInLookup)
  );
}

/** Undefined while the looked-up sidebar's records are still loading. */
export function lookupRecordsOf(field: IField, lookups?: RecordLookups) {
  return lookups?.[field?.lookupSettings?.categoryId ?? ""]?.records;
}
