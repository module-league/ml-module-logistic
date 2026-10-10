export const LOGISTIC_STATUSES = ["Pending", "InTransit", "Delivered", "Cancelled"] as const;
 
export type LogisticStatus = (typeof LOGISTIC_STATUSES)[number];
 
export const STATUS_LABELS: Record<LogisticStatus, string> = {
  Pending: "Pending",
  InTransit: "In transit",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
};
 
/** Matches LogisticResponse from the API (camelCase JSON). */
export interface Logistic {
  objId: string;
  docId: number;
  trackingNo: string;
  origin: string;
  destination: string;
  status: LogisticStatus;
  createTime: string;
  updateTime: string | null;
  versionNo: number;
}
