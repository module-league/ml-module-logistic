import { type QueryClient } from "@tanstack/react-query";

export const fieldKeys = {
  all: ["fields"] as const,
  lists: () => [...fieldKeys.all, "list"] as const,
  list: (sidebarId: string) => [...fieldKeys.lists(), sidebarId] as const,
  detail: (objId: string) => [...fieldKeys.all, "detail", objId] as const,
};

/** The options to send; an option whose id is in existingIds keeps it, so the server updates it instead of adding a new one. */
export function toOptionInputs(
  field: Pick<IField, "type" | "dropDownValues">,
  existingIds?: Set<string>,
) {
  if (!["single_select", "multi_select", "attachment"].includes(field.type)) {
    return undefined;
  }
  return field.dropDownValues.map((option) => ({
    ...(existingIds?.has(option.id) === true ? { id: option.id } : {}),
    value: option.value,
    colorCode: option.colorCode,
    displayOrder: option.displayOrder,
  }));
}

export function putInLists(
  queryClient: QueryClient,
  sidebarId: string,
  update: (fields: ISidebarField[]) => ISidebarField[],
) {
  queryClient.setQueryData<ISidebarField[]>(
    fieldKeys.list(sidebarId),
    (current) => (current ? update(current) : current),
  );
}
