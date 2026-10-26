import { apiClient } from "@/lib/apiClient";

export const exceptionKeys = {
  all: ["exceptions"] as const,
  list: () => [...exceptionKeys.all, "list"] as const,
  rules: () => [...exceptionKeys.all, "rules"] as const,
  settings: () => [...exceptionKeys.all, "settings"] as const,
  activity: (objId: string) =>
    [...exceptionKeys.all, "activity", objId] as const,
};

const path = (objId: string, action: string) =>
  `/exceptions/${encodeURIComponent(objId)}/${action}`;

/** Newest first, resolved ones included. */
export async function getExceptions() {
  const { data } = await apiClient.get<IException[]>("/exceptions");
  return data;
}

export async function getExceptionRules() {
  const { data } = await apiClient.get<IExceptionRule[]>("/exceptions/rules");
  return data;
}

export async function getExceptionSettings() {
  const { data } = await apiClient.get<IExceptionSettings>(
    "/exceptions/settings",
  );
  return data;
}

/** Send the versionNo last read, 0 for the first save. */
export async function saveExceptionSettings(body: IExceptionSettingsInput) {
  const { data } = await apiClient.put<IExceptionSettings>(
    "/exceptions/settings",
    body,
  );
  return data;
}

/** Runs the rules now, e.g. right after a fix changed a shipment, so the exception closes itself without waiting a minute. */
export async function evaluateExceptions() {
  await apiClient.post("/exceptions/evaluate");
}

/** A shipment with an unresolved one for the same rule is rejected with 409. */
export async function createException(body: IExceptionCreate) {
  const { data } = await apiClient.post<IExceptionChange>("/exceptions", body);
  return data;
}

/** Oldest first. */
export async function getExceptionActivity(objId: string) {
  const { data } = await apiClient.get<IExceptionActivity[]>(
    path(objId, "activity"),
  );
  return data;
}

export async function addExceptionActivity(
  objId: string,
  body: { kind: "note" | "action"; body: string },
) {
  const { data } = await apiClient.post<IExceptionActivity>(
    path(objId, "activity"),
    body,
  );
  return data;
}

/** Each change sends the versionNo last read; a stale one is rejected with 409. */
export async function assignException(
  objId: string,
  body: { ownerId?: string; versionNo: number },
) {
  const { data } = await apiClient.put<IExceptionChange>(
    path(objId, "owner"),
    body,
  );
  return data;
}

export async function snoozeException(
  objId: string,
  body: { until: string; versionNo: number; note?: string },
) {
  const { data } = await apiClient.put<IExceptionChange>(
    path(objId, "snooze"),
    body,
  );
  return data;
}

export async function wakeException(
  objId: string,
  body: { versionNo: number },
) {
  const { data } = await apiClient.put<IExceptionChange>(
    path(objId, "wake"),
    body,
  );
  return data;
}

export async function resolveException(
  objId: string,
  body: { reason: string; note?: string; versionNo: number },
) {
  const { data } = await apiClient.put<IExceptionChange>(
    path(objId, "resolve"),
    body,
  );
  return data;
}
