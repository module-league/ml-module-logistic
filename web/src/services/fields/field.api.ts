import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { fieldKeys, putInLists, toOptionInputs } from "./field.utils";
import { apiClient } from "@/lib/apiClient";

async function getFields(sidebarId: string) {
  const { data } = await apiClient.get<ISidebarField[]>(
    `/sidebars/${encodeURIComponent(sidebarId)}/fields`,
  );
  return data;
}

async function getField(objId: string) {
  const { data } = await apiClient.get<ISidebarField>(
    `/fields/${encodeURIComponent(objId)}`,
  );
  return data;
}

/** The create body for a field built by ModuleAddNewFieldDialog; the server makes the ids. */
export function toFieldCreate(field: IField): ISidebarFieldCreate {
  return {
    name: field?.name,
    type: field?.type,
    description: field?.description,
    dropDownValues: toOptionInputs(field),
  };
}

/** The field set of one sidebar, in display order. */
export function useFields(sidebarId?: string) {
  return useQuery({
    queryKey: fieldKeys.list(sidebarId ?? ""),
    queryFn: () => getFields(sidebarId ?? ""),
    enabled: !!sidebarId,
  });
}

/** One field by its objId. */
export function useField(objId?: string) {
  return useQuery({
    queryKey: fieldKeys.detail(objId ?? ""),
    queryFn: () => getField(objId ?? ""),
    enabled: !!objId,
  });
}

export function useCreateField(sidebarId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ISidebarFieldCreate) => {
      const { data } = await apiClient.post<ISidebarField>(
        `/sidebars/${encodeURIComponent(sidebarId)}/fields`,
        body,
      );
      return data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData(fieldKeys.detail(created.objId), created);
      putInLists(queryClient, sidebarId, (fields) => [...fields, created]);
    },
  });
}

export function useUpdateField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      objId,
      body,
    }: {
      objId: string;
      body: ISidebarFieldUpdate;
    }) => {
      const { data } = await apiClient.put<ISidebarField>(
        `/fields/${encodeURIComponent(objId)}`,
        body,
      );
      return data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(fieldKeys.detail(updated.objId), updated);
      putInLists(queryClient, updated.sidebarId, (fields) =>
        fields.map((field) =>
          field.objId === updated.objId ? updated : field,
        ),
      );
    },
  });
}

export function useDeleteField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (field: Pick<ISidebarField, "objId" | "sidebarId">) => {
      await apiClient.delete(`/fields/${encodeURIComponent(field.objId)}`);
      return field;
    },
    onSuccess: (deleted) => {
      queryClient.removeQueries({ queryKey: fieldKeys.detail(deleted.objId) });
      putInLists(queryClient, deleted.sidebarId, (fields) =>
        fields.filter((field) => field.objId !== deleted.objId),
      );
    },
  });
}

export function useReorderFields(sidebarId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fieldIds: string[]) => {
      const { data } = await apiClient.put<ISidebarField[]>(
        `/sidebars/${encodeURIComponent(sidebarId)}/fields/order`,
        { fieldIds },
      );
      return data;
    },
    onSuccess: (fields) =>
      queryClient.setQueryData(fieldKeys.list(sidebarId), fields),
  });
}
