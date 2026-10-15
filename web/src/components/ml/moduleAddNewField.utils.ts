import { z } from "zod";
import { FIELD_TYPE_ICONS } from "./fieldTypeIcon.utils";
import { presetColors } from "@/lib/colorUtils";
import {
  DEFAULT_NUMBER_SETTINGS,
  type NumberSettings,
} from "@/lib/numberHelper";
import type {
  ModuleFieldDateSettings,
  ModuleFieldTypeOption,
} from "./moduleAddNewField.types";

export const MODULE_FIELD_TYPES: ModuleFieldTypeOption[] = [
  {
    fieldType: "text",
    label: "Text",
    description: "Names, notes, references.",
    icon: FIELD_TYPE_ICONS.text,
  },
  {
    fieldType: "number",
    label: "Number",
    description: "Quantities, weights, prices.",
    icon: FIELD_TYPE_ICONS.number,
  },
  {
    fieldType: "currency",
    label: "Currency",
    description: "Freight costs, fees, invoices.",
    icon: FIELD_TYPE_ICONS.currency,
  },
  {
    fieldType: "single_select",
    label: "Select",
    description: "One choice from a list.",
    icon: FIELD_TYPE_ICONS.single_select,
  },
  {
    fieldType: "multi_select",
    label: "Multiple select",
    description: "Several choices from a list.",
    icon: FIELD_TYPE_ICONS.multi_select,
  },
  {
    fieldType: "checkbox",
    label: "Checkbox",
    description: "A tick for yes or no.",
    icon: FIELD_TYPE_ICONS.checkbox,
  },
  {
    fieldType: "date",
    label: "Date",
    description: "Pickups, deadlines, deliveries.",
    icon: FIELD_TYPE_ICONS.date,
  },
  {
    fieldType: "time",
    label: "Time",
    description: "Opening hours, cut-offs, slots.",
    icon: FIELD_TYPE_ICONS.time,
  },
  {
    fieldType: "member",
    label: "Member",
    description: "One person or a list of people.",
    icon: FIELD_TYPE_ICONS.member,
  },
  {
    fieldType: "link_table",
    label: "Link to another record",
    description: "Link to records of any sidebar, this one too.",
    icon: FIELD_TYPE_ICONS.link_table,
  },
  {
    fieldType: "lookup",
    label: "Lookup",
    description: "Show a field of the records a link field links to.",
    icon: FIELD_TYPE_ICONS.lookup,
  },
  {
    fieldType: "attachment",
    label: "Attachment",
    description: "Documents, photos, proof of delivery.",
    icon: FIELD_TYPE_ICONS.attachment,
  },
];

export const FIELD_DATE_FORMATS: IField["dateFormat"][] = [
  "dd/MM/yyyy",
  "MM/dd/yyyy",
  "dd MMM yyyy",
  "yyyy-MM-dd",
];

export const FIELD_TIME_FORMATS: {
  value: IField["timeFormat"];
  label: string;
}[] = [
  { value: "hh:mm a", label: "12-hour" },
  { value: "HH:mm", label: "24-hour" },
];

export const DEFAULT_DATE_SETTINGS: ModuleFieldDateSettings = {
  dateFormat: "dd/MM/yyyy",
  displayTime: false,
  timeFormat: "hh:mm a",
};

/** Each preset is shown by formatting its sample with the preset's settings and the chosen symbol. */
export const NUMBER_PRESETS: {
  sample: number;
  settings: Omit<NumberSettings, "symbol">;
}[] = [
  { sample: 23.23, settings: { decimalPlaces: 2, abbreviation: "none" } },
  { sample: 2323, settings: { decimalPlaces: 0, abbreviation: "none" } },
  {
    sample: 34_000_000,
    settings: { decimalPlaces: 1, abbreviation: "million" },
  },
];

export const NUMBER_DECIMAL_PLACES = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export function fieldTypeOption(type: IField["type"]) {
  return MODULE_FIELD_TYPES.find((option) => option.fieldType === type);
}

export function hasFieldOptions(type?: IField["type"] | null) {
  return type === "single_select" || type === "multi_select";
}

export function isFieldNameTaken(name: string, takenNames?: string[]) {
  const wanted = name.trim().toLowerCase();
  return (
    !!wanted && !!takenNames?.some((taken) => taken?.toLowerCase() === wanted)
  );
}

/**
 * What the field dialog checks before saving, matching the API's rules.
 * @example
 * zodErrors(fieldDraftSchema(takenNames), { type, name, options, numberSettings, lookupSettings })
 */
export function fieldDraftSchema(takenNames?: string[]) {
  return z
    .object({
      type: z.string(),
      name: z
        .string()
        .trim()
        .min(1, "Name the field.")
        .max(40, "Use up to 40 characters."),
      options: z.array(z.object({ value: z.string() })),
      numberSettings: z.object({
        symbol: z.string().max(5, "Use up to 5 characters.").nullish(),
      }),
      lookupSettings: z.object({
        categoryId: z.string().nullish(),
        linkFieldId: z.string().nullish(),
        lookupFieldId: z.string().nullish(),
      }),
    })
    .superRefine(({ type, name, options, lookupSettings }, ctx) => {
      const issue = (path: string[], message: string) =>
        ctx.addIssue({ code: "custom", path, message });
      if (isFieldNameTaken(name, takenNames))
        issue(["name"], `A field named “${name}” already exists.`);
      if (hasFieldOptions(type as IField["type"])) {
        const values = options
          ?.map((option) => option?.value?.trim())
          .filter(Boolean);
        const duplicate = values?.find(
          (value, index) =>
            values.findIndex(
              (other) => other.toLowerCase() === value.toLowerCase(),
            ) !== index,
        );
        if (!values?.length) issue(["options"], "Add at least one option.");
        else if (duplicate)
          issue(["options"], `“${duplicate}” is listed more than once.`);
      }
      if (type === "link_table" && !lookupSettings?.categoryId)
        issue(["lookupSettings", "categoryId"], "Pick the sidebar to link to.");
      if (type === "lookup") {
        if (!lookupSettings?.linkFieldId)
          issue(["lookupSettings", "linkFieldId"], "Pick a link field.");
        else if (!lookupSettings?.lookupFieldId)
          issue(["lookupSettings", "lookupFieldId"], "Pick the field to show.");
      }
    });
}

export function createDropDownValue(
  displayOrder: number,
  value = `Option ${displayOrder + 1}`,
): IFieldDropDownValue {
  return {
    id: window.crypto.randomUUID(),
    value,
    fieldId: "",
    colorCode: presetColors.at(displayOrder % presetColors.length),
    createDate: new Date().toISOString(),
    displayOrder,
  };
}

export function nextOptionValue(options: IFieldDropDownValue[]) {
  const taken = new Set(
    options?.map((option) => option?.value?.trim().toLowerCase()),
  );
  let next = (options?.length ?? 0) + 1;
  while (taken.has(`option ${next}`)) next++;
  return `Option ${next}`;
}

export function cleanDropDownValues(
  values: IFieldDropDownValue[],
  fieldId: string,
) {
  const seen = new Set<string>();
  return (values ?? [])
    .flatMap((option) => {
      const value = option?.value?.trim();
      if (!value || seen.has(value.toLowerCase())) return [];
      seen.add(value.toLowerCase());
      return [{ ...option, value, fieldId }];
    })
    .map((option, index) => ({ ...option, displayOrder: index }));
}

/** The date settings the dialog starts with: the field's own, or the defaults. */
export function fieldDateDraft(field?: IField): ModuleFieldDateSettings {
  return {
    dateFormat: field?.dateFormat ?? DEFAULT_DATE_SETTINGS.dateFormat,
    displayTime: field?.displayTime ?? DEFAULT_DATE_SETTINGS.displayTime,
    timeFormat: field?.timeFormat ?? DEFAULT_DATE_SETTINGS.timeFormat,
  };
}

/** The number settings the dialog starts with; a saved field without decimal places keeps showing decimals as typed. */
export function fieldNumberDraft(field?: IField): NumberSettings {
  const settings = field?.numberSettings;
  if (!settings) return DEFAULT_NUMBER_SETTINGS;
  return {
    symbol: settings?.symbol ?? DEFAULT_NUMBER_SETTINGS.symbol,
    decimalPlaces: settings?.decimalPlaces ?? undefined,
    abbreviation:
      settings?.abbreviation ?? DEFAULT_NUMBER_SETTINGS.abbreviation,
  };
}

function toNumberSettings(type: IField["type"], settings: NumberSettings) {
  if (type === "currency") {
    return { ...settings, symbol: settings?.symbol?.trim() ?? "" };
  }
  if (type === "number") {
    return {
      decimalPlaces: settings?.decimalPlaces,
      abbreviation: settings?.abbreviation,
    };
  }
  return undefined;
}

function toLookupSettings(
  type: IField["type"],
  settings: IField["lookupSettings"],
): IField["lookupSettings"] {
  if (type === "link_table") {
    return {
      categoryId: settings?.categoryId,
      lookupFieldId: settings?.lookupFieldId,
      multiple: settings?.multiple ?? true,
      previewFieldIds: settings?.previewFieldIds,
    };
  }
  if (type === "lookup") {
    return {
      linkFieldId: settings?.linkFieldId,
      categoryId: settings?.categoryId,
      lookupFieldId: settings?.lookupFieldId,
      previewEnabled: settings?.previewEnabled ?? true,
      previewFieldIds: settings?.previewFieldIds,
    };
  }
  return undefined;
}

export function toField({
  type,
  name,
  dropDownValues,
  dateFormat = DEFAULT_DATE_SETTINGS.dateFormat,
  displayTime = DEFAULT_DATE_SETTINGS.displayTime,
  timeFormat = DEFAULT_DATE_SETTINGS.timeFormat,
  memberSettings,
  numberSettings = DEFAULT_NUMBER_SETTINGS,
  lookupSettings,
}: Pick<IField, "type" | "name" | "dropDownValues"> &
  Partial<ModuleFieldDateSettings> &
  Pick<
    IField,
    "memberSettings" | "numberSettings" | "lookupSettings"
  >): IField {
  return {
    name,
    type,
    isPrimaryField: false,
    isEditable: true,
    isSystemField: false,
    isSelectionField: type === "single_select",
    isMultiSelectField: type === "multi_select",
    isDateField: type === "date",
    isUserField: type === "member",
    isNumeric: type === "number" || type === "currency",
    isVirtualField: type === "lookup",
    isForeignField: type === "lookup" || type === "link_table",
    isPlainField: type !== "lookup" && type !== "link_table",
    dateFormat,
    categoryId: "",
    displayOrder: 0,
    dropDownValues: hasFieldOptions(type)
      ? cleanDropDownValues(dropDownValues, name)
      : [],
    displayTime: type === "date" && displayTime,
    timeFormat,
    memberSettings:
      type === "member" ? { multiple: !!memberSettings?.multiple } : undefined,
    numberSettings: toNumberSettings(type, numberSettings),
    lookupSettings: toLookupSettings(type, lookupSettings),
  };
}
