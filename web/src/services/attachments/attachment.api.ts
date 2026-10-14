import { apiClient } from "@/lib/apiClient";

/** Largest file the API accepts; keep in step with AttachmentStorage:MaxBytes. */
export const ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;

/** Uploads one file for refId; a record only takes attachments whose refId is its sidebar id. */
export async function uploadAttachment(refId: string, file: File) {
  const body = new FormData();
  body.append("refId", refId);
  body.append("file", file);
  const { data } = await apiClient.post<IAttachment>(
    "/attachments",
    body,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

/** Where the file opens; images and PDFs show in the browser, other files download. */
export function attachmentUrl(id: string, download = false) {
  return `${apiClient.defaults.baseURL}/attachments/${encodeURIComponent(id)}${download ? "?download=true" : ""}`;
}
