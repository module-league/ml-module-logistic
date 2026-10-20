import { apiClient } from "@/lib/apiClient";

export const checkpointKeys = {
  all: ["checkpoints"] as const,
  list: (dispatchId: string) =>
    [...checkpointKeys.all, "list", dispatchId] as const,
};

/** Newest first. */
export async function getCheckpoints(dispatchId: string) {
  const { data } = await apiClient.get<ICheckpointLog[]>(
    `/dispatches/${encodeURIComponent(dispatchId)}/checkpoints`,
  );
  return data;
}

/** Sets the label of one file of a posted entry; blank clears it. Resolves with the whole entry. */
export async function updateCheckpointLabel(
  dispatchId: string,
  objId: string,
  attachmentId: string,
  label?: string,
) {
  const { data } = await apiClient.put<ICheckpointLog>(
    `/dispatches/${encodeURIComponent(dispatchId)}/checkpoints/${encodeURIComponent(objId)}/attachments/${encodeURIComponent(attachmentId)}/label`,
    { label },
  );
  return data;
}

export async function createCheckpoint(
  dispatchId: string,
  body: ICheckpointLogCreate,
) {
  const { data } = await apiClient.post<ICheckpointLog>(
    `/dispatches/${encodeURIComponent(dispatchId)}/checkpoints`,
    body,
  );
  return data;
}
