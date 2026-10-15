import { parseOptionIds, toOptionsValue } from "./selectHelper";

/** A sidebar a link field can link to; every sidebar of the module, the field's own included. */
export interface LookupSource {
  sidebarId: string;
  sidebarText: string;
  fields: ISidebarField[];
}

/** The fields and records of each linked sidebar, by sidebarId; a sidebar still loading is left out. */
export type RecordLookups = Record<
  string,
  { fields: ISidebarField[]; records: ISidebarRecord[] }
>;

/** A link value is a JSON array of record ids, stored like a multi select's option ids. */
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
  "time",
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

/** Link and lookup fields hold links, which the preview and a lookup can't show for a linked record. */
export function isLinkingField(field?: Pick<IField, "type">) {
  return field?.type === "link_table" || field?.type === "lookup";
}

/** The fields of a linked sidebar a preview can show, in display order; link and lookup fields are left out. */
export function previewableLookupFields(fields?: ISidebarField[]) {
  return (fields ?? [])
    .filter((field) => !isLinkingField(field))
    .sort((a, b) => (a?.displayOrder ?? 0) - (b?.displayOrder ?? 0));
}

/** The field a lookup shows, or what labels a link's records: the primary or first showable field when none was picked or it was deleted. */
export function lookupDisplayField(field: IField, lookups?: RecordLookups) {
  const fields = lookups?.[field?.lookupSettings?.categoryId ?? ""]?.fields;
  return (
    fields?.find((f) => f?.objId === field?.lookupSettings?.lookupFieldId) ??
    fields?.find((f) => f?.isPrimaryField && canShowInLookup(f)) ??
    fields?.find(canShowInLookup)
  );
}

/** Undefined while the linked sidebar's records are still loading. */
export function lookupRecordsOf(field: IField, lookups?: RecordLookups) {
  return lookups?.[field?.lookupSettings?.categoryId ?? ""]?.records;
}
