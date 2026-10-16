import { apiClient } from "@/lib/apiClient";

export const dashboardKeys = {
  all: ["dashboards"] as const,
  detail: (sidebarId: string) =>
    [...dashboardKeys.all, "detail", sidebarId] as const,
};

/** The sidebar's overview; versionNo 0 and no widgets until it is first saved. */
export async function getDashboard(sidebarId: string) {
  const { data } = await apiClient.get<ISidebarDashboard>(
    `/sidebars/${encodeURIComponent(sidebarId)}/dashboard`,
  );
  return data;
}

/** Send the versionNo last read, 0 for the first save; a stale one is rejected with 409. */
export async function saveDashboard(
  sidebarId: string,
  body: ISidebarDashboardInput,
) {
  const { data } = await apiClient.put<ISidebarDashboard>(
    `/sidebars/${encodeURIComponent(sidebarId)}/dashboard`,
    body,
  );
  return data;
}
