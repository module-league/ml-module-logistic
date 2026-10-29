import { apiClient } from "@/lib/apiClient";

/** The refId of files uploaded straight onto a document; keep in step with DocumentService.RefId. */
export const DOCUMENT_REF_ID = "documents";

export const documentKeys = {
  all: ["documents"] as const,
  list: () => [...documentKeys.all, "list"] as const,
  rules: () => [...documentKeys.all, "rules"] as const,
  settings: () => [...documentKeys.all, "settings"] as const,
  activity: (objId: string) =>
    [...documentKeys.all, "activity", objId] as const,
};

const path = (objId: string, action: string) =>
  `/documents/${encodeURIComponent(objId)}/${action}`;

/** Every shipment's checklist and unclassified files. */
export async function getDocuments() {
  const { data } = await apiClient.get<IShipmentChecklist[]>("/documents");
  return data;
}

export async function getDocumentRules() {
  const { data } = await apiClient.get<IDocumentRules>("/documents/rules");
  return data;
}

export async function getDocumentSettings() {
  const { data } = await apiClient.get<IDocumentSettings>(
    "/documents/settings",
  );
  return data;
}

/** Send the versionNo last read, 0 for the first save. */
export async function saveDocumentSettings(body: IDocumentSettingsInput) {
  const { data } = await apiClient.put<IDocumentSettings>(
    "/documents/settings",
    body,
  );
  return data;
}

/** Makes the file the document's new version; returns the shipment's checklist. */
export async function fileDocument(body: IDocumentFile) {
  const { data } = await apiClient.post<IShipmentChecklist>(
    "/documents/files",
    body,
  );
  return data;
}

/** Fills a draft from the shipment and its locations as the document's new version. */
export async function generateDocument(body: {
  shipmentId: string;
  docType: string;
}) {
  const { data } = await apiClient.post<IShipmentChecklist>(
    "/documents/generate",
    body,
  );
  return data;
}

/** Each verify or reject sends the versionNo last read; a stale one is rejected with 409. */
export async function verifyDocument(
  objId: string,
  body: { versionNo: number; expiresAt?: string },
) {
  const { data } = await apiClient.put<IShipmentChecklist>(
    path(objId, "verify"),
    body,
  );
  return data;
}

export async function rejectDocument(
  objId: string,
  body: { versionNo: number; reason: string },
) {
  const { data } = await apiClient.put<IShipmentChecklist>(
    path(objId, "reject"),
    body,
  );
  return data;
}

/** Has the AI read one of the shipment's files and check it against the shipment; nothing is saved. Takes 5–30 s. */
export async function reviewDocument(body: {
  shipmentId: string;
  attachmentId: string;
}) {
  const { data } = await apiClient.post<IDocumentReview>(
    "/documents/review",
    body,
  );
  return data;
}

/** Its versions, verifies and rejects, oldest first. */
export async function getDocumentActivity(objId: string) {
  const { data } = await apiClient.get<IDocumentActivity[]>(
    path(objId, "activity"),
  );
  return data;
}
