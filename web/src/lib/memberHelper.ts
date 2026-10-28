/** The user ids in a member value: one id, or a JSON array of ids. */
export function parseMemberIds(value?: string | null): string[] {
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

/** What a member field stores: one id, or a JSON array when several people are allowed. */
export function toMemberValue(
  field: Pick<IField, "memberSettings"> | undefined,
  ids: string[],
) {
  const [first] = ids;
  if (first == null || first === "") return "";
  return field?.memberSettings?.multiple === true ? JSON.stringify(ids) : first;
}

export function findMember(members: IUserInfo[] | undefined, id: string) {
  return members?.find((member) => member.id === id);
}

export function memberNames(
  members: IUserInfo[] | undefined,
  value?: string | null,
) {
  return parseMemberIds(value)
    .map((id) => findMember(members, id)?.displayName ?? "Unknown user")
    .join(", ");
}
