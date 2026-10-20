import { apiClient } from "@/lib/apiClient";

export const dispatchKeys = {
  all: ["dispatches"] as const,
  sources: () => [...dispatchKeys.all, "sources"] as const,
};

export async function getDispatchSources() {
  const { data } = await apiClient.get<IDispatchSources>("/dispatches/sources");
  return data;
}

/** A shipment with an open dispatch is rejected with 409. */
export async function createDispatch(body: IDispatchCreate) {
  const { data } = await apiClient.post<IDispatch>("/dispatches", body);
  return data;
}
