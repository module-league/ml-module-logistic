import { addDays, format, set } from "date-fns";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import { tableFields } from "@/module/dashboard/moduleDashboard.utils";
import type { RecordLookups } from "@/lib/lookupHelper";
import {
  jobNumber,
  statusLabel,
  type DispatchResource,
  type DispatchShipment,
} from "../Dispatch/dispatchBoard.utils";
import { nonEmpty } from "@/lib/stringHelper";

export const EXCEPTION_TABS: { value: IExceptionStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "snoozed", label: "Snoozed" },
  { value: "resolved", label: "Resolved" },
];

export type ExceptionFilter = "all" | IExceptionSeverity | "mine";

export const EXCEPTION_FILTERS: { value: ExceptionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "mine", label: "Mine" },
];

export const SEVERITIES: { value: IExceptionSeverity; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const SEVERITY_CLASS: Record<IExceptionSeverity, string> = {
  high: TONE_CLASS.red,
  medium: TONE_CLASS.amber,
  low: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
};

export const ATTEMPT_REASONS: {
  value: IExceptionAttemptReason;
  label: string;
}[] = [
  { value: "receiver_closed", label: "Receiver closed" },
  { value: "refused", label: "Refused" },
  { value: "wrong_address", label: "Wrong address" },
  { value: "nobody_to_sign", label: "Nobody to sign" },
];

/** The ways to fix an exception; each rule offers its own. */
export type FixAction =
  | "update_due"
  | "notify_consignee"
  | "reassign"
  | "open_timeline"
  | "call_driver"
  | "link_destination"
  | "create_location"
  | "use_pickup_weight"
  | "keep_record_weight"
  | "wait_until_opening"
  | "call_receiver"
  | "reschedule"
  | "open_documents";

/** What any exception, including one raised by hand, can be fixed with. */
export const MANUAL_FIX_ACTIONS: FixAction[] = ["open_timeline"];

export const FIX_ACTIONS: Record<string, FixAction[]> = {
  delayed: ["update_due", "notify_consignee", "reassign", "open_timeline"],
  late_pickup: ["call_driver", "reassign", "open_timeline"],
  missing_destination: ["link_destination", "create_location"],
  missing_document: ["open_documents"],
  weight_mismatch: ["use_pickup_weight", "keep_record_weight"],
  arrived_before_opening: ["wait_until_opening", "call_receiver"],
  delivery_attempt_failed: ["reschedule", "call_receiver", "open_timeline"],
  pod_not_verified: ["open_documents"],
  manual: MANUAL_FIX_ACTIONS,
};

/** An exception with what it is about, as the list and the detail show it. */
export interface ExceptionRow {
  exception: IException;
  rule?: IExceptionRule;
  shipment?: DispatchShipment;
  dispatch?: IDispatch;
  driver?: DispatchResource;
  owner?: IUserInfo;
}

export const labelOf = <T extends string>(
  options: { value: T; label: string }[],
  value?: T,
) => options.find((option) => option.value === value)?.label ?? value ?? "";

/** "19 Oct, 16:00". */
export const stamp = (value?: string) =>
  value != null && value !== "" ? format(new Date(value), "d MMM, HH:mm") : "";

/** "2 d", "1 h 40 m", "5 m". */
export function span(ms: number) {
  const minutes = Math.max(1, Math.round(Math.abs(ms) / 60_000));
  const days = Math.floor(minutes / 1440);
  if (days !== 0) return `${days} d`;
  const hours = Math.floor(minutes / 60);
  return hours !== 0 ? `${hours} h ${minutes % 60} m` : `${minutes} m`;
}

export const isOverdue = (exception: IException, now: Date) =>
  exception.status === "open" && new Date(exception.respondBy) < now;

/** "Response overdue", "2 h 10 m left", "Until 14:00" or "Resolved 19 Oct, 18:00". */
export function slaText(exception: IException, now: Date) {
  if (exception.status === "snoozed")
    return `Until ${stamp(exception.snoozedUntil)}`;
  if (exception.status === "resolved")
    return `Resolved ${stamp(exception.resolvedAt)}`;
  const left = new Date(exception.respondBy).getTime() - now.getTime();
  return left < 0 ? "Response overdue" : `${span(left)} left`;
}

/** "Response overdue by 2 d" or "Respond within 1 h 40 m"; nothing once it isn't open. */
export function deadlineText(exception: IException, now: Date) {
  if (exception.status !== "open") return "";
  const left = new Date(exception.respondBy).getTime() - now.getTime();
  return left < 0
    ? `Response overdue by ${span(left)}`
    : `Respond within ${span(left)}`;
}

const statusText = (status?: IExceptionFacts["status"]) =>
  status === undefined
    ? ""
    : status === "not_dispatched"
      ? "Not dispatched"
      : statusLabel(status);

/** "the invoice", "A and B", "A, B and C". */
const listText = (items: string[] = []) =>
  items.length < 2
    ? (items[0] ?? "the papers")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/** One sentence on what tripped the rule, from the facts when it opened. */
export function whyText(exception: IException) {
  const { facts } = exception;
  const after = (from?: string) =>
    from != null && from !== ""
      ? span(new Date(exception.openedAt).getTime() - new Date(from).getTime())
      : "";
  switch (exception.ruleKey) {
    case "delayed":
      return `${facts.dueSource === "eta" ? "ETA" : "Delivery planned"} ${stamp(facts.due)}. Still ${statusText(facts.status).toLowerCase()} ${after(facts.due)} later.`;
    case "late_pickup":
      return `Pickup planned ${stamp(facts.plannedPickupAt)}. Not picked up ${after(facts.plannedPickupAt)} later.`;
    case "missing_destination":
      return "Booked with no destination, so it can't get a dispatch job.";
    case "weight_mismatch":
      return `Weighed ${facts.pickupWeight} kg at pickup; the record says ${facts.recordWeight} kg, ${facts.differencePercent}% off.`;
    case "arrived_before_opening":
      return `Arrived ${stamp(facts.arrivedAt)}, before the destination opens at ${stamp(facts.opensAt)}.`;
    case "missing_document":
      return `Dispatched before ${listText(facts.missing)} ${facts.missing?.length === 1 ? "was" : "were"} verified, so it can't be picked up.`;
    case "pod_not_verified":
      return `Delivered, but ${listText(facts.missing)} ${facts.missing?.length === 1 ? "isn't" : "aren't"} verified, so it can't be billed.`;
    case "delivery_attempt_failed":
      return `Delivery failed: ${nonEmpty(labelOf(ATTEMPT_REASONS, facts.reason).toLowerCase()) ?? "no reason given"}.`;
    default:
      return "Raised by hand.";
  }
}

/** The facts as cards: what triggered it, then the status, mode and last checkpoint when it opened. */
export function factCards(exception: IException) {
  const { facts } = exception;
  type Card = [string, string | undefined];
  const byRule: Record<string, Card[]> = {
    delayed: [
      [
        facts.dueSource === "eta" ? "ETA" : "Planned delivery",
        stamp(facts.due),
      ],
    ],
    late_pickup: [["Planned pickup", stamp(facts.plannedPickupAt)]],
    weight_mismatch: [
      ["Pickup weight", `${facts.pickupWeight} kg`],
      ["Record weight", `${facts.recordWeight} kg`],
      ["Difference", `${facts.differencePercent}%`],
    ],
    arrived_before_opening: [
      ["Arrived", stamp(facts.arrivedAt)],
      ["Opens", stamp(facts.opensAt)],
    ],
    missing_document: [["Not verified", facts.missing?.join(", ")]],
    pod_not_verified: [["Not verified", facts.missing?.join(", ")]],
    delivery_attempt_failed: [
      ["Reason", labelOf(ATTEMPT_REASONS, facts.reason)],
      ["Attempt", stamp(facts.attemptAt)],
    ],
  };
  const last = facts.lastCheckpoint;
  const cards: Card[] = [
    ...(byRule[exception.ruleKey] ?? []),
    ["Status", statusText(facts.status)],
    ["Mode", facts.mode ?? undefined],
    [
      "Last checkpoint",
      last
        ? [
            last.status !== undefined ? statusLabel(last.status) : last.note,
            stamp(last.at),
          ]
            .filter(Boolean)
            .join(" · ")
        : undefined,
    ],
  ];
  return cards.filter(
    (card): card is [string, string] => card[1] != null && card[1] !== "",
  );
}

const SEVERITY_RANK: Record<IExceptionSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Each exception with its rule, shipment, dispatch, driver and owner. */
export function buildRows(
  exceptions: IException[],
  rules: IExceptionRule[],
  shipments: DispatchShipment[],
  dispatches: IDispatch[],
  drivers: Map<string, DispatchResource>,
  members: IUserInfo[],
): ExceptionRow[] {
  const shipmentById = new Map(shipments.map((entry) => [entry.id, entry]));
  const dispatchById = new Map(dispatches.map((entry) => [entry.objId, entry]));
  return exceptions.map((exception) => {
    const dispatch = dispatchById.get(exception.dispatchId ?? "");
    return {
      exception,
      rule: rules.find((rule) => rule.ruleKey === exception.ruleKey),
      shipment: shipmentById.get(exception.shipmentId),
      dispatch,
      driver: drivers.get(dispatch?.driverId ?? ""),
      owner: members.find((member) => member.id === exception.ownerId),
    };
  });
}

/** The rows of a tab: open ones by deadline, overdue first, then severity; snoozed by wake time; resolved newest first. */
export function tabRows(
  rows: ExceptionRow[],
  tab: IExceptionStatus,
  filter: ExceptionFilter,
  meId: string,
) {
  const time = (value?: string) =>
    value != null && value !== "" ? new Date(value).getTime() : 0;
  const byDeadlineThenSeverity = (a: ExceptionRow, b: ExceptionRow) => {
    const byDeadline =
      time(a.exception.respondBy) - time(b.exception.respondBy);
    return byDeadline !== 0
      ? byDeadline
      : SEVERITY_RANK[a.exception.severity] -
          SEVERITY_RANK[b.exception.severity];
  };
  return rows
    .filter(
      ({ exception }) =>
        exception.status === tab &&
        (filter === "all" ||
          (filter === "mine"
            ? exception.ownerId === meId
            : exception.severity === filter)),
    )
    .sort((a, b) =>
      tab === "resolved"
        ? time(b.exception.resolvedAt) - time(a.exception.resolvedAt)
        : tab === "snoozed"
          ? time(a.exception.snoozedUntil) - time(b.exception.snoozedUntil)
          : byDeadlineThenSeverity(a, b),
    );
}

/** "Penang → Port Klang", with ? for a missing end. */
export const routeText = (shipment?: DispatchShipment) =>
  `${shipment?.origin?.title ?? "?"} → ${shipment?.destination?.title ?? "?"}`;

/** "EXC-1042 · opened 19 Oct, 18:00 · JOB-0121". */
export const openedLine = (row: ExceptionRow) =>
  [
    row.exception.exceptionNo,
    `opened ${stamp(row.exception.openedAt)}`,
    row.dispatch && jobNumber(row.dispatch),
  ]
    .filter(Boolean)
    .join(" · ");

/** One hour from now, then the next of 09:00, 14:00 or 18:00 at least an hour away (or the opening time for an early arrival). */
export function snoozeTimes(exception: IException, now: Date) {
  const hour = new Date(now.getTime() + 3_600_000);
  const opensAt = exception.facts?.opensAt;
  const later =
    opensAt != null && opensAt !== "" && new Date(opensAt) > hour
      ? new Date(opensAt)
      : ([9, 14, 18]
          .map((h) =>
            set(now, { hours: h, minutes: 0, seconds: 0, milliseconds: 0 }),
          )
          .find((at) => at > hour) ??
        set(addDays(now, 1), {
          hours: 9,
          minutes: 0,
          seconds: 0,
          milliseconds: 0,
        }));
  return [
    { label: "Snooze 1 h", until: hour },
    {
      label: `Snooze until ${format(later, later.getDate() === now.getDate() ? "HH:mm" : "EEE HH:mm")}`,
      until: later,
    },
  ];
}

/**
 * The body of a record update that sets one field: every current field's value, so values of fields deleted since aren't
 * sent back (the API rejects them), with fieldId set to value.
 */
export function recordUpdate(
  lookups: RecordLookups,
  sidebarId: string,
  recordId: string,
  fieldId: string,
  value: string | null,
): ISidebarRecordUpdate | undefined {
  const lookup = lookups[sidebarId];
  const record = lookup?.records.find((entry) => entry.objId === recordId);
  if (!record) return undefined;
  const values = Object.fromEntries(
    tableFields(lookup)
      .filter((field) => !field.isSystemField)
      .map((field) => [field.objId, record.values?.[field.objId] ?? null]),
  );
  return {
    values: { ...values, [fieldId]: value },
    versionNo: record.versionNo,
  };
}
