import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import {
  ChartColumnBig,
  Hash,
  Kanban,
  List,
  MapPinned,
  PieChart,
  TriangleAlert,
} from "lucide-react";
import { fieldTypeOption } from "@/components/ml/moduleAddNewField.utils";
import { parseFieldDate } from "@/lib/dateHelper";
import { formatNumber } from "@/lib/numberHelper";
import { parseOptionIds } from "@/lib/selectHelper";
import {
  canShowInLookup,
  isLinkingField,
  linkCardFields,
  lookupDisplayField,
  lookupRecordsOf,
  parseRecordIds,
  type LookupSource,
  type RecordLookups,
} from "@/lib/lookupHelper";
import { linkedRecordLabel, toRecordText } from "@/lib/recordTextHelper";
import {
  recordFieldValue,
  SYSTEM_FIELDS,
} from "@/module/page/modulePage.utils";
import type {
  DashboardRecordGroup,
  DashboardWidgetType,
} from "./moduleDashboard.types";

export const DATE_RANGES: {
  value: IDashboardDateRange;
  label: string;
}[] = [
  { value: "today", label: "Today" },
  { value: "next_7_days", label: "Next 7 days" },
  { value: "next_30_days", label: "Next 30 days" },
];

export const PERIODS: { value: IDashboardPeriod; label: string }[] = [
  { value: "today", label: "today" },
  { value: "yesterday", label: "yesterday" },
  { value: "tomorrow", label: "tomorrow" },
  { value: "this_week", label: "this week" },
  { value: "this_month", label: "this month" },
  { value: "this_year", label: "this year" },
  { value: "last_7_days", label: "the last 7 days" },
  { value: "next_7_days", label: "the next 7 days" },
  { value: "last_30_days", label: "the last 30 days" },
  { value: "next_30_days", label: "the next 30 days" },
];

/** First and last moment of a period, counted from now; weeks start on Monday. */
export function periodRange(period: IDashboardPeriod, now: Date): [Date, Date] {
  const day = (offset: number) => addDays(now, offset);
  switch (period) {
    case "yesterday":
      return [startOfDay(day(-1)), endOfDay(day(-1))];
    case "tomorrow":
      return [startOfDay(day(1)), endOfDay(day(1))];
    case "this_week":
      return [
        startOfWeek(now, { weekStartsOn: 1 }),
        endOfWeek(now, { weekStartsOn: 1 }),
      ];
    case "this_month":
      return [startOfMonth(now), endOfMonth(now)];
    case "this_year":
      return [startOfYear(now), endOfYear(now)];
    case "last_7_days":
      return [startOfDay(day(-6)), endOfDay(now)];
    case "next_7_days":
      return [startOfDay(now), endOfDay(day(6))];
    case "last_30_days":
      return [startOfDay(day(-29)), endOfDay(now)];
    case "next_30_days":
      return [startOfDay(now), endOfDay(day(29))];
    default:
      return [startOfDay(now), endOfDay(now)];
  }
}

export const WIDGET_WIDTHS: { value: IDashboardWidgetWidth; label: string }[] =
  [
    { value: "s", label: "S" },
    { value: "m", label: "M" },
    { value: "l", label: "L" },
    { value: "full", label: "Full" },
  ];

/** Column spans of the 12-column widget grid; phones stack every widget. */
export const WIDTH_CLASS: Record<IDashboardWidgetWidth, string> = {
  s: "col-span-12 sm:col-span-6 xl:col-span-3",
  m: "col-span-12 lg:col-span-6 xl:col-span-4",
  l: "col-span-12 xl:col-span-8",
  full: "col-span-12",
};

export const CALCULATIONS: { value: IDashboardCalculation; label: string }[] = [
  { value: "count", label: "Count records" },
  { value: "sum", label: "Sum" },
  { value: "average", label: "Average" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
];

export const isNumberField = (field?: Pick<IField, "type">) =>
  field?.type === "number" ||
  field?.type === "currency" ||
  field?.type === "formula";

export const isDateField = (field?: Pick<IField, "type" | "isDateField">) =>
  !!field?.isDateField ||
  field?.type === "date" ||
  field?.type === "ds_create_time";

export const isSelectField = (field?: Pick<IField, "type">) =>
  field?.type === "single_select";

const GROUP_TYPES: IField["type"][] = [
  "single_select",
  "multi_select",
  "link_table",
  "member",
  "checkbox",
];

/** Fields a breakdown can split records by. */
export const isGroupField = (field?: Pick<IField, "type">) =>
  !!field && GROUP_TYPES.includes(field.type);

/** Fields a filter can test; lookups and computed fields have no value of their own. */
export const isFilterField = (field?: Pick<IField, "type">) =>
  !!field && !["lookup", "mirror", "templating"].includes(field.type);

/** A table's fields in display order, with the system columns every table has after them. */
export function tableFields(source?: Pick<LookupSource, "fields">) {
  return [
    ...[...(source?.fields ?? [])].sort(
      (a, b) => (a?.displayOrder ?? 0) - (b?.displayOrder ?? 0),
    ),
    ...SYSTEM_FIELDS,
  ];
}

/** A field's type as the Add field dialog names it, e.g. "Number". */
export const fieldTypeLabel = (field: ISidebarField) =>
  SHORT_TYPE_LABELS[field?.type] ??
  fieldTypeOption(field?.type)?.label ??
  (field?.isSystemField ? "Created time" : field?.type);

const SHORT_TYPE_LABELS: Partial<Record<IField["type"], string>> = {
  link_table: "Link",
  multi_select: "Multi-select",
};

/** Fields whose value reads as a short text, link fields included: their linked records' labels. */
export const isShowableField = (field?: ISidebarField) =>
  canShowInLookup(field) || field?.type === "link_table";

/** Options that mean the work is finished, so a board never marks their cards late. */
const DONE_OPTION = /deliver|done|complete|closed|cancel|finish/i;

/** "Status is none of Delivered": leaves out finished records, by the first single select that has a done option. */
function notDoneCondition(fields: ISidebarField[]): IDashboardCondition[] {
  const field = fields.find(
    (entry) =>
      isSelectField(entry) &&
      entry.dropDownValues?.some((option) =>
        DONE_OPTION.test(option?.value ?? ""),
      ),
  );
  const doneIds = field?.dropDownValues
    ?.filter((option) => DONE_OPTION.test(option?.value ?? ""))
    .map((option) => option.id);
  return field && doneIds?.length
    ? [
        {
          fieldId: field.objId,
          operator: "none_of",
          value: JSON.stringify(doneIds),
        },
      ]
    : [];
}

/** "New Shipment" from "Shipments": a table's name for one record, by dropping a plural s. */
export const singular = (text: string) =>
  /[^s]s$/i.test(text) ? text.slice(0, -1) : text;

/** The field a widget names its records by: the picked one, else the primary or first showable field. */
export function titleFieldOf(fields: ISidebarField[], fieldId?: string) {
  return (
    fields?.find((field) => field?.objId === fieldId) ??
    fields?.find((field) => field?.isPrimaryField && canShowInLookup(field)) ??
    fields?.find(canShowInLookup)
  );
}

export function recordTitle(
  record: ISidebarRecord,
  field: ISidebarField | undefined,
  members?: IUserInfo[],
  lookups?: RecordLookups,
) {
  return (
    (field &&
      toRecordText(field, recordFieldValue(field, record), members, lookups)) ||
    "Untitled record"
  );
}

interface OperatorOption {
  value: IDashboardOperator;
  label: string;
  input?: "text" | "number" | "options" | "members" | "period";
}

const BLANK_OPERATORS: OperatorOption[] = [
  { value: "empty", label: "is empty" },
  { value: "not_empty", label: "is not empty" },
];

/** What a condition can test for a field, and the value each test needs. */
export function operatorsFor(field?: ISidebarField): OperatorOption[] {
  switch (field?.type) {
    case "text":
    case "long_text":
      return [
        { value: "contains", label: "contains", input: "text" },
        { value: "not_contains", label: "does not contain", input: "text" },
        { value: "is", label: "is", input: "text" },
        { value: "is_not", label: "is not", input: "text" },
        ...BLANK_OPERATORS,
      ];
    case "number":
    case "currency":
      return [
        { value: "eq", label: "=", input: "number" },
        { value: "neq", label: "≠", input: "number" },
        { value: "gt", label: ">", input: "number" },
        { value: "gte", label: "≥", input: "number" },
        { value: "lt", label: "<", input: "number" },
        { value: "lte", label: "≤", input: "number" },
        ...BLANK_OPERATORS,
      ];
    case "single_select":
      return [
        { value: "any_of", label: "is any of", input: "options" },
        { value: "none_of", label: "is none of", input: "options" },
        ...BLANK_OPERATORS,
      ];
    case "multi_select":
      return [
        { value: "any_of", label: "has any of", input: "options" },
        { value: "all_of", label: "has all of", input: "options" },
        { value: "none_of", label: "has none of", input: "options" },
        ...BLANK_OPERATORS,
      ];
    case "member":
      return [
        { value: "any_of", label: "is any of", input: "members" },
        { value: "none_of", label: "is none of", input: "members" },
        ...BLANK_OPERATORS,
      ];
    case "checkbox":
      return [
        { value: "checked", label: "is ticked" },
        { value: "unchecked", label: "is not ticked" },
      ];
    default:
      return isDateField(field)
        ? [
            { value: "within", label: "is within", input: "period" },
            { value: "before", label: "is before", input: "period" },
            { value: "after", label: "is after", input: "period" },
            ...BLANK_OPERATORS,
          ]
        : BLANK_OPERATORS;
  }
}

/** A condition that tests the field with its first test and a value that suits it. */
export function newCondition(field: ISidebarField): IDashboardCondition {
  const [first] = operatorsFor(field);
  return {
    fieldId: field.objId,
    operator: first?.value ?? "not_empty",
    value: first?.input === "period" ? "today" : undefined,
  };
}

const isBlank = (field: ISidebarField, value: string) =>
  field?.type === "link_table"
    ? !parseRecordIds(value).length
    : !value.trim() || value.trim() === "[]";

function matchesCondition(
  field: ISidebarField,
  record: ISidebarRecord,
  condition: IDashboardCondition,
  now: Date,
) {
  const value = recordFieldValue(field, record) ?? "";
  const wanted = condition?.value ?? "";
  const text = value.trim().toLowerCase();
  const wantedText = wanted.trim().toLowerCase();
  const amount = value.trim() ? Number(value) : Number.NaN;
  const wantedAmount = wanted.trim() ? Number(wanted) : Number.NaN;
  const compare = (test: (a: number, b: number) => boolean) =>
    Number.isFinite(amount) &&
    Number.isFinite(wantedAmount) &&
    test(amount, wantedAmount);
  const picked = () => {
    const ids = parseOptionIds(value);
    return parseOptionIds(wanted).filter((id) => ids.includes(id));
  };
  const date = () => parseFieldDate(value);
  const range = () => periodRange((wanted || "today") as IDashboardPeriod, now);

  switch (condition?.operator) {
    case "empty":
      return isBlank(field, value);
    case "not_empty":
      return !isBlank(field, value);
    case "checked":
      return value === "true";
    case "unchecked":
      return value !== "true";
    case "contains":
      return text.includes(wantedText);
    case "not_contains":
      return !text.includes(wantedText);
    case "is":
      return text === wantedText;
    case "is_not":
      return text !== wantedText;
    case "eq":
      return compare((a, b) => a === b);
    case "neq":
      return compare((a, b) => a !== b);
    case "gt":
      return compare((a, b) => a > b);
    case "gte":
      return compare((a, b) => a >= b);
    case "lt":
      return compare((a, b) => a < b);
    case "lte":
      return compare((a, b) => a <= b);
    case "any_of":
      return picked().length > 0;
    case "none_of":
      return picked().length === 0;
    case "all_of":
      return picked().length === parseOptionIds(wanted).length;
    case "within": {
      const at = date();
      const [start, end] = range();
      return !!at && at >= start && at <= end;
    }
    case "before": {
      const at = date();
      return !!at && at < range()[0];
    }
    case "after": {
      const at = date();
      return !!at && at > range()[1];
    }
    default:
      return true;
  }
}

/** The records that pass the filter; conditions on deleted fields are left out. */
export function filterRecords(
  records: ISidebarRecord[],
  filter: IDashboardFilter | undefined,
  fieldById: Map<string, ISidebarField>,
  now: Date,
) {
  const conditions =
    filter?.conditions?.flatMap((condition) => {
      const field = fieldById.get(condition?.fieldId);
      return field ? [{ field, condition }] : [];
    }) ?? [];
  if (!conditions.length) return records;
  const test = (record: ISidebarRecord) =>
    filter?.match === "any"
      ? conditions.some(({ field, condition }) =>
          matchesCondition(field, record, condition, now),
        )
      : conditions.every(({ field, condition }) =>
          matchesCondition(field, record, condition, now),
        );
  return records.filter(test);
}

/** The condition as a sentence, e.g. "Shipment Mode is any of Air, Sea". */
export function describeCondition(
  condition: IDashboardCondition,
  field: ISidebarField | undefined,
  members?: IUserInfo[],
) {
  if (!field) return "a deleted field";
  const operator = operatorsFor(field).find(
    (option) => option.value === condition?.operator,
  );
  const value = (() => {
    switch (operator?.input) {
      case "options":
        return parseOptionIds(condition?.value)
          .map(
            (id) =>
              field?.dropDownValues?.find((option) => option?.id === id)?.value,
          )
          .filter(Boolean)
          .join(", ");
      case "members":
        return parseOptionIds(condition?.value)
          .map(
            (id) =>
              members?.find((member) => member?.id === id)?.displayName ??
              "someone",
          )
          .join(", ");
      case "period":
        return (
          PERIODS.find((period) => period.value === condition?.value)?.label ??
          "today"
        );
      case undefined:
        return "";
      default:
        return condition?.value?.trim() ? `“${condition.value.trim()}”` : "…";
    }
  })();
  return [field.name, operator?.label ?? "", value].filter(Boolean).join(" ");
}

export function describeFilter(
  filter: IDashboardFilter | undefined,
  fieldById: Map<string, ISidebarField>,
  members?: IUserInfo[],
) {
  return (
    filter?.conditions
      ?.map((condition) =>
        describeCondition(
          condition,
          fieldById.get(condition?.fieldId),
          members,
        ),
      )
      .join(filter?.match === "any" ? " or " : " · ") ?? ""
  );
}

/** The numbers of a number field across the records; empty values are left out. */
function numbersOf(records: ISidebarRecord[], field?: ISidebarField) {
  if (!field) return [];
  return records.flatMap((record) => {
    const value = recordFieldValue(field, record)?.trim();
    const amount = value ? Number(value) : Number.NaN;
    return Number.isFinite(amount) ? [amount] : [];
  });
}

/** Counts the records or works out their number field; undefined when there is nothing to work out. */
export function measureRecords(
  records: ISidebarRecord[],
  measure: IDashboardMeasure | undefined,
  field?: ISidebarField,
) {
  if (!measure || measure.calculation === "count") return records.length;
  const numbers = numbersOf(records, field);
  if (!field) return undefined;
  if (measure.calculation === "sum") {
    return numbers.reduce((total, amount) => total + amount, 0);
  }
  if (!numbers.length) return undefined;
  if (measure.calculation === "average") {
    return (
      numbers.reduce((total, amount) => total + amount, 0) / numbers.length
    );
  }
  return measure.calculation === "min"
    ? Math.min(...numbers)
    : Math.max(...numbers);
}

/** A count as a whole number, a calculated number with its field's symbol and decimals. */
export function formatMeasure(
  value: number | undefined,
  measure: IDashboardMeasure | undefined,
  field?: ISidebarField,
) {
  if (value === undefined) return "—";
  if (!measure || measure.calculation === "count") {
    return value.toLocaleString("en-US");
  }
  const settings = field?.numberSettings;
  return formatNumber(value, {
    ...settings,
    decimalPlaces:
      settings?.decimalPlaces ??
      (measure.calculation === "average" ? 1 : undefined),
  });
}

/** E.g. "Sum of Chargeable Weight", or "Count of Shipments". */
export function describeMeasure(
  measure: IDashboardMeasure | undefined,
  field: ISidebarField | undefined,
  tableText: string,
) {
  if (!measure || measure.calculation === "count")
    return `Count of ${tableText}`;
  const label = CALCULATIONS.find(
    (option) => option.value === measure.calculation,
  )?.label;
  return `${label} of ${field?.name ?? "a deleted field"}`;
}

/** A colour for the nth group without one of its own, from the fixed series order in moduleDashboard.css; past eight, groups share the last. Records without a value are grey. */
export const groupColor = (index: number, key?: string) =>
  key === ""
    ? "var(--muted-foreground)"
    : `var(--dash-series-${Math.min(index, 7) + 1})`;

/** Card colours of the metric and attention tones. */
export const TONE_CLASS: Record<"red" | "amber" | "green", string> = {
  red: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  amber:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  green:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
};

/**
 * The records split by a field, one group per option, person, linked record or tick.
 * A select keeps every option in order, even empty ones; a record with several values sits in each of their groups.
 */
export function groupRecords(
  records: ISidebarRecord[],
  field: ISidebarField | undefined,
  members?: IUserInfo[],
  lookups?: RecordLookups,
): DashboardRecordGroup[] {
  if (!field) return [];
  const groups = new Map<string, DashboardRecordGroup>();
  const add = (
    key: string,
    make: () => Omit<DashboardRecordGroup, "records">,
  ) =>
    (groups.get(key) ??
      groups
        .set(key, { ...make(), records: [] })
        .get(key)) as DashboardRecordGroup;

  if (field.type === "single_select" || field.type === "multi_select") {
    [...(field.dropDownValues ?? [])]
      .sort((a, b) => (a?.displayOrder ?? 0) - (b?.displayOrder ?? 0))
      .forEach((option) =>
        add(option.id, () => ({
          key: option.id,
          label: option.value,
          color: option.colorCode,
        })),
      );
  }
  const shown =
    field.type === "link_table"
      ? lookupDisplayField(field, lookups)
      : undefined;
  const linked =
    field.type === "link_table" ? lookupRecordsOf(field, lookups) : undefined;
  const linkedById = new Map(linked?.map((record) => [record?.objId, record]));
  const captionFields =
    field.type === "link_table"
      ? linkCardFields(field, lookups).slice(0, 2)
      : [];

  const keysOf = (record: ISidebarRecord) => {
    const value = recordFieldValue(field, record) ?? "";
    if (field.type === "checkbox") return [value === "true" ? "true" : "false"];
    if (field.type === "link_table") return parseRecordIds(value);
    return parseOptionIds(value);
  };
  const labelOf = (key: string): Omit<DashboardRecordGroup, "records"> => {
    if (field.type === "checkbox") {
      return { key, label: key === "true" ? "Ticked" : "Not ticked" };
    }
    if (field.type === "member") {
      return {
        key,
        label:
          members?.find((member) => member?.id === key)?.displayName ??
          "Unknown user",
      };
    }
    if (field.type === "link_table") {
      const record = linkedById.get(key);
      return {
        key,
        label: linkedRecordLabel(shown, record, members, !linked),
        caption: captionFields
          .map((captionField) =>
            toRecordText(
              captionField,
              record?.values?.[captionField.objId],
              members,
            ),
          )
          .filter(Boolean)
          .join(" · "),
      };
    }
    return { key, label: "Unknown option" };
  };

  const empty: ISidebarRecord[] = [];
  records.forEach((record) => {
    const keys = keysOf(record);
    if (!keys.length) empty.push(record);
    keys.forEach((key) => add(key, () => labelOf(key)).records.push(record));
  });
  const list = [...groups.values()];
  return empty.length
    ? [...list, { key: "", label: `No ${field.name}`, records: empty }]
    : list;
}

/** Each bucket of the trend, ending with the current one, with its measure. */
export function trendSeries(
  records: ISidebarRecord[],
  trend: IDashboardTrend,
  dateField: ISidebarField | undefined,
  valueField: ISidebarField | undefined,
  now: Date,
) {
  if (!dateField) return [];
  const startOf = (date: Date) =>
    trend.bucket === "month"
      ? startOfMonth(date)
      : trend.bucket === "week"
        ? startOfWeek(date, { weekStartsOn: 1 })
        : startOfDay(date);
  const step = (date: Date, count: number) =>
    trend.bucket === "month"
      ? addMonths(date, count)
      : trend.bucket === "week"
        ? addWeeks(date, count)
        : addDays(date, count);
  const span = Math.max(2, Math.min(trend.span || 12, 60));
  const current = startOf(now);
  const buckets = Array.from({ length: span }, (_, index) =>
    step(current, index - span + 1),
  );
  const byBucket = new Map<number, ISidebarRecord[]>(
    buckets.map((bucket) => [bucket.getTime(), []]),
  );
  records.forEach((record) => {
    const date = parseFieldDate(recordFieldValue(dateField, record));
    if (date) byBucket.get(startOf(date).getTime())?.push(record);
  });
  return buckets.map((bucket) => ({
    label: format(bucket, trend.bucket === "month" ? "MMM yy" : "dd MMM"),
    value:
      measureRecords(byBucket.get(bucket.getTime()) ?? [], trend, valueField) ??
      0,
  }));
}

/** Whole days since the date, or 0 when it hasn't passed. */
export function daysLate(date: Date | undefined, now: Date) {
  return date ? Math.max(0, differenceInCalendarDays(now, date)) : 0;
}

/** The first record whose date is still to come, e.g. "Next: SHP-001, 21 Oct". */
export function nextRecordCaption(
  records: ISidebarRecord[],
  dateField: ISidebarField | undefined,
  titleField: ISidebarField | undefined,
  now: Date,
  members?: IUserInfo[],
  lookups?: RecordLookups,
) {
  if (!dateField) return "";
  const start = startOfDay(now);
  const next = records
    .map((record) => ({
      record,
      date: parseFieldDate(recordFieldValue(dateField, record)),
    }))
    .filter(
      (entry): entry is { record: ISidebarRecord; date: Date } =>
        !!entry.date && entry.date >= start,
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  return next
    ? `Next: ${recordTitle(next.record, titleField, members, lookups)}, ${format(next.date, "dd MMM")}`
    : `Nothing coming up by ${dateField.name}`;
}

/** A record's latitude and longitude, from its own fields or the record its link field links to. */
export function pointOf(
  record: ISidebarRecord,
  point: IDashboardMapPoint | undefined,
  fieldById: Map<string, ISidebarField>,
  lookups?: RecordLookups,
): [number, number] | undefined {
  if (!point?.latFieldId || !point?.lngFieldId) return undefined;
  let values: ISidebarRecordValues | undefined = record?.values;
  if (point.linkFieldId) {
    const linkField = fieldById.get(point.linkFieldId);
    const [linkedId] = parseRecordIds(record?.values?.[point.linkFieldId]);
    values = lookupRecordsOf(linkField as IField, lookups)?.find(
      (linked) => linked?.objId === linkedId,
    )?.values;
  }
  const lat = Number(values?.[point.latFieldId]);
  const lng = Number(values?.[point.lngFieldId]);
  return values?.[point.latFieldId] &&
    values?.[point.lngFieldId] &&
    Math.abs(lat) <= 85 &&
    Math.abs(lng) <= 180
    ? [lat, lng]
    : undefined;
}

/** The fields a map point can use: the table's own number fields, or each link field's linked table's. */
export function pointSources(fields: ISidebarField[], sources: LookupSource[]) {
  const own = fields.filter(isNumberField);
  return [
    ...(own.length >= 2
      ? [{ linkFieldId: undefined, label: "This table", fields: own }]
      : []),
    ...fields
      .filter((field) => field?.type === "link_table")
      .flatMap((field) => {
        const linkedFields =
          sources
            ?.find(
              (source) =>
                source?.sidebarId === field?.lookupSettings?.categoryId,
            )
            ?.fields?.filter(isNumberField) ?? [];
        return linkedFields.length >= 2
          ? [
              {
                linkFieldId: field.objId,
                label: `Through ${field.name}`,
                fields: linkedFields,
              },
            ]
          : [];
      }),
  ];
}

const hasField = (
  source: LookupSource,
  test: (field: ISidebarField) => boolean,
) => tableFields(source).some(test);

/** The widgets the Add widget panel offers, what each needs and what it starts with. */
export const WIDGET_TYPES: DashboardWidgetType[] = [
  {
    type: "metric",
    label: "Metric",
    description: "One number: count, sum, average, min or max.",
    requirement: "Any table · number field for sums",
    icon: Hash,
    width: "s",
    accepts: (source) => !!source?.fields?.length,
  },
  {
    type: "board",
    label: "Board",
    description: "Records in columns you can drag between.",
    requirement: "Needs a single-select field",
    icon: Kanban,
    width: "full",
    accepts: (source) => hasField(source, isSelectField),
  },
  {
    type: "list",
    label: "List",
    description: "Top records, sorted and filtered.",
    requirement: "Any table",
    icon: List,
    width: "l",
    accepts: (source) => !!source?.fields?.length,
  },
  {
    type: "breakdown",
    label: "Breakdown",
    description: "Share of records by a category.",
    requirement: "Single-select or link field",
    icon: PieChart,
    width: "m",
    accepts: (source) => hasField(source, isGroupField),
  },
  {
    type: "trend",
    label: "Trend chart",
    description: "Counts or totals over time.",
    requirement: "Needs a date field",
    icon: ChartColumnBig,
    width: "m",
    accepts: (source) =>
      hasField(source, (field) => isDateField(field) && !field.isSystemField),
  },
  {
    type: "map",
    label: "Map",
    description: "Pins and routes between locations.",
    requirement: "Needs latitude and longitude fields",
    icon: MapPinned,
    width: "l",
    accepts: (source, sources) =>
      pointSources(tableFields(source), sources ?? []).length > 0,
  },
  {
    type: "attention",
    label: "Attention list",
    description: "Records that break a rule, flagged red or amber.",
    requirement: "Any table",
    icon: TriangleAlert,
    width: "m",
    accepts: (source) => !!source?.fields?.length,
  },
];

export const widgetTypeOf = (type?: IDashboardWidgetType) =>
  WIDGET_TYPES.find((entry) => entry.type === type) ?? WIDGET_TYPES[0];

const EMPTY_FILTER: IDashboardFilter = { match: "all", conditions: [] };

const firstId = (
  fields: ISidebarField[],
  test: (field: ISidebarField) => boolean,
) => fields.find(test)?.objId;

const ownDateField = (field: ISidebarField) =>
  isDateField(field) && !field.isSystemField;

/** Widgets that show records one by one start with the first 10; the rest use every record. */
const LISTS_RECORDS: IDashboardWidgetType[] = [
  "board",
  "list",
  "map",
  "attention",
];

/** The settings a widget of this type starts with on the table, using the first fields that suit it. */
export function defaultSettings(
  type: IDashboardWidgetType,
  source: LookupSource | undefined,
  sources: LookupSource[],
): Partial<IDashboardWidget> {
  const fields = tableFields(source);
  return {
    ...typeSettings(type, source, sources),
    sortFieldId: firstId(fields, ownDateField) ?? firstId(fields, isDateField),
    sortDirection: "asc",
    maxCount: LISTS_RECORDS.includes(type) ? 10 : undefined,
  };
}

function typeSettings(
  type: IDashboardWidgetType,
  source: LookupSource | undefined,
  sources: LookupSource[],
): Partial<IDashboardWidget> {
  const fields = tableFields(source);
  const title = titleFieldOf(fields);
  const tableText = source?.sidebarText ?? "records";
  const dateId = firstId(fields, ownDateField) ?? firstId(fields, isDateField);
  const groupField = fields.find(isSelectField) ?? fields.find(isGroupField);
  switch (type) {
    case "metric":
      return {
        label: `All ${tableText}`,
        metric: { calculation: "count", caption: "auto", tone: "none" },
      };
    case "board": {
      const others = [
        ...fields.filter((field) => field.type === "link_table"),
        ...fields.filter(
          (field) =>
            field.objId !== title?.objId &&
            canShowInLookup(field) &&
            !isSelectField(field) &&
            !isDateField(field),
        ),
      ];
      const groupBy = fields.find(isSelectField);
      return {
        label: `${tableText} pipeline`,
        board: {
          groupFieldId: firstId(fields, isSelectField),
          titleFieldId: title?.objId,
          subtitleFieldIds: others
            .slice(
              0,
              others[0]?.type === "link_table" &&
                others[1]?.type === "link_table"
                ? 2
                : 1,
            )
            .map((field) => field.objId),
          badgeFieldId: fields.filter(isSelectField)[1]?.objId,
          dateFieldId: firstId(fields, ownDateField),
          showLate: true,
          doneOptionIds:
            groupBy?.dropDownValues
              ?.filter((option) => DONE_OPTION.test(option?.value ?? ""))
              .map((option) => option.id) ?? [],
          cardsPerColumn: 3,
          draggable: true,
        },
      };
    }
    case "list":
      return {
        label: `Upcoming ${tableText}`,
        list: {
          columns: fields
            .filter(
              (field) =>
                isFilterField(field) &&
                !field.isSystemField &&
                field.type !== "attachment",
            )
            .slice(0, 5)
            .map((field) => ({ fieldId: field.objId })),
        },
      };
    case "breakdown":
      return {
        label: `${tableText} by ${groupField?.name ?? "category"}`,
        breakdown: {
          calculation: "count",
          groupFieldId: groupField?.objId,
          style: groupField?.type === "single_select" ? "stacked" : "bars",
          limit: 6,
        },
      };
    case "trend":
      return {
        label: `${tableText} over time`,
        trend: {
          calculation: "count",
          dateFieldId: dateId,
          bucket: "week",
          span: 12,
          chart: "bar",
        },
      };
    case "map": {
      const [point] = pointSources(fields, sources);
      const routeTo = pointSources(fields, sources).find(
        (entry) => entry.linkFieldId !== point?.linkFieldId,
      );
      const toPoint = (entry?: typeof point) =>
        entry && {
          linkFieldId: entry.linkFieldId,
          latFieldId: entry.fields[0]?.objId,
          lngFieldId: entry.fields[1]?.objId,
        };
      return {
        label: `${tableText} map`,
        map: {
          from: toPoint(point) ?? {},
          to: toPoint(routeTo),
          titleFieldId: title?.objId,
        },
      };
    }
    case "attention": {
      const rules: IDashboardAttentionRule[] = [];
      const dateField = fields.find(ownDateField);
      if (dateField) {
        rules.push({
          id: crypto.randomUUID(),
          name: `${dateField.name} passed`,
          tone: "red",
          filter: {
            match: "all",
            conditions: [
              { fieldId: dateField.objId, operator: "before", value: "today" },
              ...notDoneCondition(fields),
            ],
          },
        });
      }
      const required =
        fields.filter((field) => field.type === "link_table").at(-1) ??
        fields.find(
          (field) => isSelectField(field) && field.objId !== groupField?.objId,
        ) ??
        groupField;
      if (required) {
        rules.push({
          id: crypto.randomUUID(),
          name: `No ${required.name}`,
          tone: "amber",
          filter: {
            match: "all",
            conditions: [{ fieldId: required.objId, operator: "empty" }],
          },
          actionLabel: "Fix record",
        });
      }
      return {
        label: "Needs attention",
        attention: { titleFieldId: title?.objId, rules },
      };
    }
  }
}

/** A widget of the type on the first table that suits it. */
export function newWidget(
  type: IDashboardWidgetType,
  sources: LookupSource[],
  preferredSidebarId?: string,
): IDashboardWidget {
  const entry = widgetTypeOf(type);
  const source =
    sources.find(
      (candidate) =>
        candidate.sidebarId === preferredSidebarId &&
        entry.accepts(candidate, sources),
    ) ?? sources.find((candidate) => entry.accepts(candidate, sources));
  return {
    id: crypto.randomUUID(),
    type,
    width: entry.width,
    sidebarId: source?.sidebarId ?? "",
    label: entry.label,
    filter: EMPTY_FILTER,
    ...defaultSettings(type, source, sources),
  };
}

/** A starting overview built from the table with the most to show: headline numbers, a board, a list and breakdowns. */
export function suggestedLayout(
  layout: ISidebarDashboard,
  sources: LookupSource[],
): ISidebarDashboard {
  const main =
    sources.find((source) => WIDGET_TYPES[1].accepts(source, sources)) ??
    sources.find((source) => source.fields.length);
  if (!main) return layout;
  const fields = tableFields(main);
  const dateField = fields.find(ownDateField);
  const numberField = fields.find(isNumberField);
  const tableText = main.sidebarText;
  const make = (
    type: IDashboardWidgetType,
    patch?: Partial<IDashboardWidget>,
  ) => ({
    ...newWidget(type, sources, main.sidebarId),
    ...patch,
  });
  const widgets: IDashboardWidget[] = [
    make("metric"),
    ...(dateField
      ? [
          make("metric", {
            label: `${dateField.name} in range`,
            followsRange: true,
            metric: {
              calculation: "count",
              caption: "next",
              nextFieldId: dateField.objId,
              tone: "none",
            },
          }),
          make("metric", {
            label: `${dateField.name} passed`,
            filter: {
              match: "all",
              conditions: [
                {
                  fieldId: dateField.objId,
                  operator: "before",
                  value: "today",
                },
                ...notDoneCondition(fields),
              ],
            },
            metric: {
              calculation: "count",
              caption: "custom",
              captionText: notDoneCondition(fields).length
                ? `${dateField.name} passed, not finished`
                : `${dateField.name} has passed`,
              tone: "red",
            },
          }),
        ]
      : []),
    ...(numberField
      ? [
          make("metric", {
            label: `${numberField.name}, this month`,
            filter: {
              match: "all",
              conditions: [
                {
                  fieldId: "ds_create_time",
                  operator: "within",
                  value: "this_month",
                },
              ],
            },
            metric: {
              calculation: "sum",
              fieldId: numberField.objId,
              caption: "count",
              tone: "none",
            },
          }),
        ]
      : []),
    ...(fields.some(isSelectField) ? [make("board")] : []),
    make("list", { followsRange: !!dateField }),
    ...(fields.some(isGroupField) ? [make("breakdown")] : []),
    make("attention"),
    ...(dateField ? [make("trend", { width: "l" })] : []),
  ];
  return {
    ...layout,
    rangeSidebarId: dateField ? main.sidebarId : layout.rangeSidebarId,
    rangeFieldId: dateField?.objId ?? layout.rangeFieldId,
    newRecordSidebarId: layout.newRecordSidebarId ?? main.sidebarId,
    newRecordLabel: layout.newRecordLabel ?? `New ${singular(tableText)}`,
    widgets,
  };
}

/** The saved overview with every setting filled in; the API sends nulls for unset ones. */
export function normalizeDashboard(
  dashboard: ISidebarDashboard | undefined,
  sidebarId: string,
): ISidebarDashboard {
  return {
    sidebarId,
    objId: dashboard?.objId ?? undefined,
    title: dashboard?.title ?? undefined,
    description: dashboard?.description ?? undefined,
    dateRange: dashboard?.dateRange ?? "next_7_days",
    rangeSidebarId: dashboard?.rangeSidebarId ?? undefined,
    rangeFieldId: dashboard?.rangeFieldId ?? undefined,
    newRecordSidebarId: dashboard?.newRecordSidebarId ?? undefined,
    newRecordLabel: dashboard?.newRecordLabel ?? undefined,
    newRecordFormId: dashboard?.newRecordFormId ?? undefined,
    widgets: dashboard?.widgets?.map(withListSort) ?? [],
    versionNo: dashboard?.versionNo ?? 0,
    updateTime: dashboard?.updateTime ?? undefined,
  };
}

/** Lists saved before every widget could sort and limit kept their sort and row count in list. */
function withListSort(widget: IDashboardWidget): IDashboardWidget {
  const saved = widget?.list as
    | { sortFieldId?: string; sortDirection?: "asc" | "desc"; rows?: number }
    | undefined;
  if (!saved?.rows) return widget;
  return {
    ...widget,
    list: { columns: widget.list?.columns ?? [] },
    sortFieldId: saved.sortFieldId,
    sortDirection: saved.sortDirection,
    maxCount: saved.rows,
  };
}

/** A widget in a few words for its placeholder card, e.g. "Metric · Shipments · Sum of Chargeable Weight". */
export function describeWidget(
  widget: IDashboardWidget,
  source?: LookupSource,
) {
  const fields = tableFields(source);
  const name = (fieldId?: string) =>
    fields.find((field) => field.objId === fieldId)?.name;
  const detail = (() => {
    switch (widget?.type) {
      case "metric":
        return describeMeasure(
          widget.metric,
          fields.find((field) => field.objId === widget.metric?.fieldId),
          source?.sidebarText ?? "records",
        );
      case "board":
        return (
          name(widget.board?.groupFieldId) &&
          `Grouped by ${name(widget.board?.groupFieldId)}`
        );
      case "list":
        return (
          name(widget.sortFieldId) && `Sorted by ${name(widget.sortFieldId)}`
        );
      case "breakdown":
        return (
          name(widget.breakdown?.groupFieldId) &&
          `By ${name(widget.breakdown?.groupFieldId)}`
        );
      case "trend":
        return (
          name(widget.trend?.dateFieldId) &&
          `By ${name(widget.trend?.dateFieldId)}`
        );
      case "attention": {
        const count = widget.attention?.rules?.length ?? 0;
        return `${count} ${count === 1 ? "rule" : "rules"}`;
      }
      default:
        return undefined;
    }
  })();
  return [
    widgetTypeOf(widget?.type).label,
    source?.sidebarText ?? "No table",
    detail,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** What the API saves: the overview without its ids, with the versionNo last read. */
export function toDashboardInput(
  layout: ISidebarDashboard,
  versionNo: number,
): ISidebarDashboardInput {
  return {
    title: layout.title?.trim() || undefined,
    description: layout.description?.trim() || undefined,
    dateRange: layout.dateRange,
    rangeSidebarId: layout.rangeFieldId ? layout.rangeSidebarId : undefined,
    rangeFieldId: layout.rangeSidebarId ? layout.rangeFieldId : undefined,
    newRecordSidebarId: layout.newRecordSidebarId,
    newRecordLabel: layout.newRecordLabel?.trim() || undefined,
    newRecordFormId: layout.newRecordSidebarId
      ? layout.newRecordFormId
      : undefined,
    widgets: layout.widgets,
    versionNo,
  };
}

/** The sidebars the widgets read, the New button adds to, and the ones their link fields link to. */
export function sidebarsToLoad(
  layout: ISidebarDashboard,
  fieldsBySidebar: Map<string, ISidebarField[] | undefined>,
) {
  const ids = new Set(
    [
      ...layout.widgets.map((widget) => widget?.sidebarId),
      layout.newRecordSidebarId,
    ].filter((id): id is string => !!id),
  );
  [...ids].forEach((id) =>
    fieldsBySidebar
      .get(id)
      ?.filter(isLinkingField)
      .forEach((field) => {
        const linked = field?.lookupSettings?.categoryId;
        if (linked) ids.add(linked);
      }),
  );
  return [...ids].sort();
}

/** The records in order of a field: dates by time, numbers by amount, the rest by their text; empty values always last. */
export function sortRecords(
  records: ISidebarRecord[],
  field: ISidebarField | undefined,
  direction: "asc" | "desc",
  members?: IUserInfo[],
  lookups?: RecordLookups,
) {
  if (!field) return records;
  const keyOf = (record: ISidebarRecord): number | string | undefined => {
    const value = recordFieldValue(field, record) ?? "";
    if (!value.trim()) return undefined;
    if (isDateField(field)) return parseFieldDate(value)?.getTime();
    if (isNumberField(field)) {
      const amount = Number(value);
      return Number.isFinite(amount) ? amount : undefined;
    }
    return (
      toRecordText(field, value, members, lookups).toLowerCase() || undefined
    );
  };
  const sign = direction === "desc" ? -1 : 1;
  return records
    .map((record) => ({ record, key: keyOf(record) }))
    .sort((a, b) => {
      if (a.key === undefined || b.key === undefined) {
        return a.key === b.key ? 0 : a.key === undefined ? 1 : -1;
      }
      return (a.key < b.key ? -1 : a.key > b.key ? 1 : 0) * sign;
    })
    .map((entry) => entry.record);
}
