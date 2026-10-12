import { useSyncExternalStore } from "react";
import type { Logistic } from "./types";
 
/**
 * Sample records for building the UI before the API exists.
 * Replaced by the TanStack Query hooks once LogisticsController is ready.
 */
const INITIAL: Logistic[] = [
  sample(159, "TRK-240949", "Port Klang", "Surabaya", "Pending", "2026-10-12T16:45:00"),
  sample(158, "TRK-240948", "Kuala Lumpur", "Singapore", "InTransit", "2026-10-12T15:30:00"),
  sample(157, "TRK-240947", "Penang", "Medan", "Delivered", "2026-10-12T14:20:00"),
  sample(156, "TRK-240946", "Johor Bahru", "Bangkok", "InTransit", "2026-10-12T13:10:00"),
  sample(155, "TRK-240945", "Kuantan", "Jakarta", "Pending", "2026-10-12T11:55:00"),
  sample(154, "TRK-240944", "Melaka", "Port Klang", "Delivered", "2026-10-12T10:40:00"),
  sample(153, "TRK-240943", "Kuching", "Singapore", "Cancelled", "2026-10-12T09:25:00"),
  sample(152, "TRK-240942", "Ipoh", "Penang", "InTransit", "2026-10-12T08:15:00"),
  sample(151, "TRK-240941", "Port Klang", "Manila", "Pending", "2026-10-12T07:00:00"),
  sample(150, "TRK-240940", "Kota Kinabalu", "Kuching", "Delivered", "2026-10-12T06:30:00"),

  sample(149, "TRK-240939", "Singapore", "Port Klang", "InTransit", "2026-10-11T22:50:00"),
  sample(148, "TRK-240938", "Penang", "Ho Chi Minh City", "Pending", "2026-10-11T21:35:00"),
  sample(147, "TRK-240937", "Johor Bahru", "Kuala Lumpur", "Delivered", "2026-10-11T20:10:00"),
  sample(146, "TRK-240936", "Port Klang", "Bangkok", "InTransit", "2026-10-11T18:45:00"),
  sample(145, "TRK-240935", "Kuantan", "Singapore", "Cancelled", "2026-10-11T17:20:00"),
  sample(144, "TRK-240934", "Melaka", "Jakarta", "Pending", "2026-10-11T16:05:00"),
  sample(143, "TRK-240933", "Ipoh", "Surabaya", "Delivered", "2026-10-11T14:50:00"),
  sample(142, "TRK-240932", "Kuching", "Kota Kinabalu", "InTransit", "2026-10-11T13:25:00"),
  sample(141, "TRK-240931", "Kuala Lumpur", "Manila", "Pending", "2026-10-11T12:10:00"),
  sample(140, "TRK-240930", "Port Klang", "Medan", "Delivered", "2026-10-11T10:55:00"),

  sample(139, "TRK-240929", "Penang", "Singapore", "Pending", "2026-10-10T23:40:00"),
  sample(138, "TRK-240928", "Johor Bahru", "Ho Chi Minh City", "InTransit", "2026-10-10T22:15:00"),
  sample(137, "TRK-240927", "Port Klang", "Jakarta", "Delivered", "2026-10-10T20:50:00"),
  sample(136, "TRK-240926", "Kuantan", "Bangkok", "Pending", "2026-10-10T19:35:00"),
  sample(135, "TRK-240925", "Melaka", "Penang", "InTransit", "2026-10-10T18:20:00"),
  sample(134, "TRK-240924", "Ipoh", "Singapore", "Cancelled", "2026-10-10T16:45:00"),
  sample(133, "TRK-240923", "Kuching", "Port Klang", "Delivered", "2026-10-10T15:30:00"),
  sample(132, "TRK-240922", "Kota Kinabalu", "Manila", "Pending", "2026-10-10T14:15:00"),
  sample(131, "TRK-240921", "Singapore", "Bangkok", "InTransit", "2026-10-10T12:50:00"),
  sample(130, "TRK-240920", "Port Klang", "Ho Chi Minh City", "Delivered", "2026-10-10T11:35:00"),

  sample(129, "TRK-240919", "Melaka", "Singapore", "Pending", "2026-10-09T01:56:00"),
  sample(128, "TRK-240918", "Port Klang", "Singapore", "InTransit", "2026-10-09T01:58:00"),
  sample(127, "TRK-240917", "Penang", "Bangkok", "Pending", "2026-10-09T01:42:00"),
  sample(126, "TRK-240916", "Johor Bahru", "Jakarta", "Delivered", "2026-10-08T23:10:00"),
  sample(125, "TRK-240915", "Kuantan", "Port Klang", "InTransit", "2026-10-08T21:30:00"),
  sample(124, "TRK-240914", "Port Klang", "Ho Chi Minh City", "Pending", "2026-10-08T19:05:00"),
  sample(123, "TRK-240913", "Kuching", "Kota Kinabalu", "Cancelled", "2026-10-08T03:20:00"),
  sample(122, "TRK-240912", "Singapore", "Penang", "Delivered", "2026-10-07T22:45:00"),
  sample(121, "TRK-240911", "Ipoh", "Port Klang", "Delivered", "2026-10-07T05:15:00"),
  sample(120, "TRK-240910", "Port Klang", "Surabaya", "Pending", "2026-10-07T02:30:00"),
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
