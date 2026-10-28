/** The option ids in a multi select value: a JSON array of ids, or one id. */
export function parseOptionIds(value?: string | null): string[] {
  if (value == null || value === "") return [];
  if (!value.startsWith("[")) return [value];
  try {
    const ids: unknown = JSON.parse(value);
    return Array.isArray(ids)
      ? ids.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

/** What a multi select field stores: a JSON array of option ids, or nothing when none are picked. */
export function toOptionsValue(ids: string[]) {
  return ids.length > 0 ? JSON.stringify(ids) : "";
}

/** The picked options in the order they were picked; ids of deleted options are left out. */
export function selectedOptions(
  field: Pick<IField, "dropDownValues"> | undefined,
  value?: string | null,
) {
  const byId = new Map(
    field?.dropDownValues?.map((option) => [option.id, option]),
  );
  return parseOptionIds(value).flatMap((id) => {
    const option = byId.get(id);
    return option ? [option] : [];
  });
}

export function optionNames(
  field: Pick<IField, "dropDownValues"> | undefined,
  value?: string | null,
) {
  return selectedOptions(field, value)
    .map((option) => option.value)
    .join(", ");
}
