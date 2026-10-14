import { apiClient } from "@/lib/apiClient";

export const recordKeys = {
  all: ["records"] as const,
  list: (sidebarId: string) => [...recordKeys.all, "list", sidebarId] as const,
  detail: (sidebarId: string, objId: string) =>
    [...recordKeys.all, "detail", sidebarId, objId] as const,
};

export async function getRecords(sidebarId: string) {
  const { data } = await apiClient.get<ISidebarRecord[]>(
    `/sidebars/${encodeURIComponent(sidebarId)}/records`,
  );
  return data;
}

export async function getRecord(sidebarId: string, objId: string) {
  const { data } = await apiClient.get<ISidebarRecord>(
    `/sidebars/${encodeURIComponent(sidebarId)}/records/${encodeURIComponent(objId)}`,
  );
  return data;
}

export async function createRecord(
  sidebarId: string,
  values: ISidebarRecordValues,
) {
  const { data } = await apiClient.post<ISidebarRecord>(
    `/sidebars/${encodeURIComponent(sidebarId)}/records`,
    { values },
  );
  return data;
}

export async function updateRecord(
  sidebarId: string,
  objId: string,
  body: ISidebarRecordUpdate,
) {
  const { data } = await apiClient.put<ISidebarRecord>(
    `/sidebars/${encodeURIComponent(sidebarId)}/records/${encodeURIComponent(objId)}`,
    body,
  );
  return data;
}

/** Deletes the records, all or none; the API also takes them out of every link field that links to them. */
export async function deleteRecords(sidebarId: string, ids: string[]) {
  await apiClient.post(
    `/sidebars/${encodeURIComponent(sidebarId)}/records/delete`,
    { ids },
  );
}
