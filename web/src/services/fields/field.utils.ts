
import {
  type QueryClient,
} from "@tanstack/react-query";

export const fieldKeys = {
  all: ["fields"] as const,
  lists: () => [...fieldKeys.all, "list"] as const,
  list: (sidebarId: string) => [...fieldKeys.lists(), sidebarId] as const,
  detail: (objId: string) => [...fieldKeys.all, "detail", objId] as const,
};

export function toOptionInputs(field: Pick<IField, "type" | "dropDownValues">) {
  if (field?.type !== "single_select" && field?.type !== "multi_select") {
    return undefined;
  }
  return field?.dropDownValues?.map((option, index) => ({
    value: option?.value,
    colorCode: option?.colorCode,
    displayOrder: option?.displayOrder ?? index,
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
