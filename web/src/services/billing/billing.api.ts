import { apiClient } from "@/lib/apiClient";

export const billingKeys = {
  all: ["billing"] as const,
  overview: () => [...billingKeys.all, "overview"] as const,
  rates: () => [...billingKeys.all, "rates"] as const,
  settings: () => [...billingKeys.all, "settings"] as const,
};

const path = (objId: string, action: string) =>
  `/billing/invoices/${encodeURIComponent(objId)}/${action}`;

/** Ready to bill with prices, held back with reasons, every invoice, the parties and the totals. */
export async function getBillingOverview() {
  const { data } = await apiClient.get<IBillingOverview>("/billing");
  return data;
}

export async function getBillingRates() {
  const { data } = await apiClient.get<IBillingRates>("/billing/rates");
  return data;
}

export async function getBillingSettings() {
  const { data } = await apiClient.get<IBillingSettings>("/billing/settings");
  return data;
}

/** Send the versionNo last read, 0 for the first save. */
export async function saveBillingSettings(body: IBillingSettingsInput) {
  const { data } = await apiClient.put<IBillingSettings>(
    "/billing/settings",
    body,
  );
  return data;
}

/** The invoice's PDF without saving it. */
export async function previewInvoice(body: IInvoiceCreate) {
  const { data } = await apiClient.post<Blob>("/billing/preview", body, {
    responseType: "blob",
  });
  return data;
}

/** Saves a draft; a shipment already on an invoice that isn't void is rejected with 409. */
export async function createInvoice(body: IInvoiceCreate) {
  const { data } = await apiClient.post<IInvoice>("/billing/invoices", body);
  return data;
}

/** Each change sends the versionNo last read; a stale one is rejected with 409. Sending posts the Billed checkpoint. */
export async function sendInvoice(objId: string, body: { versionNo: number }) {
  const { data } = await apiClient.put<IInvoice>(path(objId, "send"), body);
  return data;
}

export async function payInvoice(
  objId: string,
  body: { versionNo: number; method: string; reference?: string },
) {
  const { data } = await apiClient.put<IInvoice>(path(objId, "pay"), body);
  return data;
}

export async function voidInvoice(
  objId: string,
  body: { versionNo: number; reason: string },
) {
  const { data } = await apiClient.put<IInvoice>(path(objId, "void"), body);
  return data;
}

/** Where the invoice's PDF opens. */
export const invoicePdfUrl = (objId: string, download = false) =>
  `${apiClient.defaults.baseURL}${path(objId, "pdf")}${download ? "?download=true" : ""}`;
