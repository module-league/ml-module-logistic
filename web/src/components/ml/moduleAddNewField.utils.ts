import type { Modifier } from "@dnd-kit/core";
import { FIELD_TYPE_ICONS } from "./fieldTypeIcon.utils";
import { presetColors } from "@/lib/colorUtils";
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
    fieldType: "single_select",
    label: "Select",
    description: "One choice from a list.",
    icon: FIELD_TYPE_ICONS.single_select,
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
    fieldType: "member",
    label: "Member",
    description: "One person or a list of people.",
    icon: FIELD_TYPE_ICONS.member,
  },
];

export const FIELD_DATE_FORMATS: IField["dateFormat"][] = [
  "dd/MM/yyyy",
  "MM/dd/yyyy",
  "dd MMM yyyy",
  "yyyy-MM-dd",
];

export const FIELD_TIME_FORMATS: { value: IField["timeFormat"]; label: string }[] = [
  { value: "hh:mm a", label: "12-hour" },
  { value: "HH:mm", label: "24-hour" },
];

export const DEFAULT_DATE_SETTINGS: ModuleFieldDateSettings = {
  dateFormat: "dd/MM/yyyy",
  displayTime: false,
  timeFormat: "hh:mm a",
};

/** Moves a dragged item up and down only, and never past the list that holds it, so the list can't grow while dragging. */
export const lockToVerticalAxis: Modifier = ({
  transform,
  draggingNodeRect,
  containerNodeRect,
}) => {
  if (!draggingNodeRect || !containerNodeRect) return { ...transform, x: 0 };
  return {
    ...transform,
    x: 0,
    y: Math.min(
      Math.max(transform.y, containerNodeRect.top - draggingNodeRect.top),
      containerNodeRect.bottom - draggingNodeRect.bottom,
    ),
  };
};

export function fieldTypeOption(type: IField["type"]) {
  return MODULE_FIELD_TYPES.find((option) => option.fieldType === type);
}

export function isFieldNameTaken(name: string, takenNames?: string[]) {
  const wanted = name.trim().toLowerCase();
  return (
    !!wanted && !!takenNames?.some((taken) => taken?.toLowerCase() === wanted)
  );
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

export function toField({
  type,
  name,
  dropDownValues,
  dateFormat = DEFAULT_DATE_SETTINGS.dateFormat,
  displayTime = DEFAULT_DATE_SETTINGS.displayTime,
  timeFormat = DEFAULT_DATE_SETTINGS.timeFormat,
  memberSettings,
}: Pick<IField, "type" | "name" | "dropDownValues"> &
  Partial<ModuleFieldDateSettings> &
  Pick<IField, "memberSettings">): IField {
  return {
    name,
    type,
    isPrimaryField: false,
    isEditable: true,
    isSystemField: false,
    isSelectionField: type === "single_select",
    isMultiSelectField: false,
    isDateField: type === "date",
    isUserField: type === "member",
    isNumeric: type === "number",
    isVirtualField: false,
    isForeignField: false,
    isPlainField: true,
    dateFormat,
    categoryId: "",
    displayOrder: 0,
    dropDownValues:
      type === "single_select" ? cleanDropDownValues(dropDownValues, name) : [],
    displayTime: type === "date" && displayTime,
    timeFormat,
    memberSettings:
      type === "member" ? { multiple: !!memberSettings?.multiple } : undefined,
  };
}
