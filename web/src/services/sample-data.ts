import { useSyncExternalStore } from "react";
import type { Logistic } from "./types";
 
/**
 * Sample records for building the UI before the API exists.
 * Replaced by the TanStack Query hooks once LogisticsController is ready.
 */
const INITIAL: Logistic[] = [
  sample(128, "TRK-240918", "Port Klang", "Singapore", "InTransit", "2026-10-09T01:58:00"),
  sample(127, "TRK-240917", "Penang", "Bangkok", "Pending", "2026-10-09T01:42:00"),
  sample(126, "TRK-240916", "Johor Bahru", "Jakarta", "Delivered", "2026-10-08T23:10:00"),
  sample(125, "TRK-240915", "Kuantan", "Port Klang", "InTransit", "2026-10-08T21:30:00"),
  sample(124, "TRK-240914", "Port Klang", "Ho Chi Minh City", "Pending", "2026-10-08T19:05:00"),
  sample(123, "TRK-240913", "Kuching", "Kota Kinabalu", "Cancelled", "2026-10-08T03:20:00"),
  sample(122, "TRK-240912", "Singapore", "Penang", "Delivered", "2026-10-07T22:45:00"),
  sample(121, "TRK-240911", "Ipoh", "Port Klang", "Delivered", "2026-10-07T05:15:00"),
  sample(119, "TRK-240909", "Port Klang", "Surabaya", "Pending", "2026-10-07T01:00:00"),
  sample(129, "TRK-240919", "Melaka", "Singapore", "Pending", "2026-10-09T01:56:00"),
];
 
function sample(
  docId: number,
  trackingNo: string,
  origin: string,
  destination: string,
  status: Logistic["status"],
  createTime: string,
): Logistic {
  return {
    objId: `sample-${docId}`,
    docId,
    trackingNo,
    origin,
    destination,
    status,
    createTime,
    updateTime: null,
    versionNo: 1,
  };
}

// A tiny in-memory store so every page (and the sidebar badge) sees the same records
let records = [...INITIAL].sort((a, b) => b.docId - a.docId);
const listeners = new Set<() => void>();
 
function emit() {
  for (const listener of listeners) listener();
}
 
export const sampleStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => records,
  /** Pending → In transit. */
  dispatch(objId: string) {
    records = records.map((r) =>
      r.objId === objId ? { ...r, status: "InTransit", updateTime: new Date().toISOString(), versionNo: r.versionNo + 1 } : r,
    );
    emit();
  },
};
 
export function useSampleLogistics(): Logistic[] {
  return useSyncExternalStore(sampleStore.subscribe, sampleStore.getSnapshot);
}
 
/** Sidebar badge for Awaiting Task. */
export function usePendingCount(): number {
  return useSampleLogistics().filter((r) => r.status === "Pending").length;
}


export const SAMPLE_PEOPLE: IUserInfo[] = [
  person("u1", "Aisyah Rahman", "Logistic admin"),
  person("u2", "Daniel Tan", "Dispatcher"),
  person("u3", "Priya Nair", "Dispatcher"),
  person("u4", "Hafiz Ismail", "Driver"),
  person("u5", "Mei Ling Wong", "Warehouse lead"),
  person("u6", "Ravi Kumar", "Driver"),
  person("u7", "Siti Nurhaliza", "Customer service"),
  person("u8", "Jason Lim", "Finance"),
  person("u9", "Nurul Huda", "Driver"),
];

function person(id: string, displayName: string, userRole: string): IUserInfo {
  const [firstName, ...rest] = displayName.split(" ");
  const username = displayName.toLowerCase().replace(/\s+/g, ".");
  return {
    id,
    displayName,
    firstName,
    lastName: rest.join(" "),
    username,
    email: `${username}@example.com`,
    userRole,
    createdTime: "2026-09-01T00:00:00Z",
  };
}
