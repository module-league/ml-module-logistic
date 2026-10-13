import type { Modifier } from "@dnd-kit/core";
import { FIELD_TYPE_ICONS } from "./fieldTypeIcon.utils";
import { presetColors } from "@/lib/colorUtils";
import type { ModuleFieldTypeOption } from "./moduleAddNewField.types";

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
];

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
}: Pick<IField, "type" | "name" | "dropDownValues">): IField {
  return {
    name,
    type,
    isPrimaryField: false,
    isEditable: true,
    isSystemField: false,
    isSelectionField: type === "single_select",
    isMultiSelectField: false,
    isDateField: false,
    isUserField: false,
    isNumeric: type === "number",
    isVirtualField: false,
    isForeignField: false,
    isPlainField: true,
    dateFormat: "dd/MM/yyyy",
    categoryId: "",
    displayOrder: 0,
    dropDownValues:
      type === "single_select" ? cleanDropDownValues(dropDownValues, name) : [],
    displayTime: false,
    timeFormat: "hh:mm a",
  };
}
