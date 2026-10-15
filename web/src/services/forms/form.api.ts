import { apiClient } from "@/lib/apiClient";

export const formKeys = {
  all: ["forms"] as const,
  list: (sidebarId: string) => [...formKeys.all, "list", sidebarId] as const,
};

export async function getForms(sidebarId: string) {
  const { data } = await apiClient.get<ISidebarForm[]>(
    `/sidebars/${encodeURIComponent(sidebarId)}/forms`,
  );
  return data;
}

/** The sidebar's first form becomes its default. */
export async function createForm(sidebarId: string, body: ISidebarFormInput) {
  const { data } = await apiClient.post<ISidebarForm>(
    `/sidebars/${encodeURIComponent(sidebarId)}/forms`,
    body,
  );
  return data;
}

export async function updateForm(objId: string, body: ISidebarFormInput) {
  const { data } = await apiClient.put<ISidebarForm>(
    `/forms/${encodeURIComponent(objId)}`,
    body,
  );
  return data;
}

export async function deleteForm(objId: string) {
  await apiClient.delete(`/forms/${encodeURIComponent(objId)}`);
}

/** Every form of the sidebar exactly once, in the new order. */
export async function reorderForms(sidebarId: string, formIds: string[]) {
  const { data } = await apiClient.put<ISidebarForm[]>(
    `/sidebars/${encodeURIComponent(sidebarId)}/forms/order`,
    { formIds },
  );
  return data;
}
