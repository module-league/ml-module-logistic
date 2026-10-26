import { apiClient } from "@/lib/apiClient";

export const dispatchKeys = {
  all: ["dispatches"] as const,
  list: () => [...dispatchKeys.all, "list"] as const,
  sources: () => [...dispatchKeys.all, "sources"] as const,
  settings: () => [...dispatchKeys.all, "settings"] as const,
};

/** Newest first. */
export async function getDispatches() {
  const { data } = await apiClient.get<IDispatch[]>("/dispatches");
  return data;
}

export async function getDispatchSources() {
  const { data } = await apiClient.get<IDispatchSources>("/dispatches/sources");
  return data;
}

/** versionNo 0 until first saved. */
export async function getDispatchSettings() {
  const { data } = await apiClient.get<IDispatchSettings>(
    "/dispatches/settings",
  );
  return data;
}

/** Send the versionNo last read, 0 for the first save; a stale one is rejected with 409. */
export async function saveDispatchSettings(body: IDispatchSettingsInput) {
  const { data } = await apiClient.put<IDispatchSettings>(
    "/dispatches/settings",
    body,
  );
  return data;
}

/** Send the versionNo last read; a stale one is rejected with 409, a move backwards or on a closed dispatch with 400. */
export async function moveDispatch(objId: string, body: IDispatchMove) {
  const { data } = await apiClient.put<IDispatchMoveResult>(
    `/dispatches/${encodeURIComponent(objId)}/status`,
    body,
  );
  return data;
}

/** Reassigns an open dispatch or moves its planned times; logged on its checkpoint log. */
export async function planDispatch(objId: string, body: IDispatchPlan) {
  const { data } = await apiClient.put<IDispatch>(
    `/dispatches/${encodeURIComponent(objId)}/plan`,
    body,
  );
  return data;
}

/** A shipment with an open dispatch is rejected with 409. */
export async function createDispatch(body: IDispatchCreate) {
  const { data } = await apiClient.post<IDispatch>("/dispatches", body);
  return data;
}
