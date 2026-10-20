import { format, formatDistanceStrict, isSameDay } from "date-fns";
import {
  recordTitle,
  tableFields,
  titleFieldOf,
} from "@/module/dashboard/moduleDashboard.utils";
import { recordFieldValue } from "@/module/page/modulePage.utils";
import {
  lookupDisplayField,
  parseRecordIds,
  type RecordLookups,
} from "@/lib/lookupHelper";
import { toRecordText } from "@/lib/recordTextHelper";

export type DispatchStage =
  "unassigned" | "assigned" | "en_route" | "completed";

/** The board's columns, in order. Completed only keeps dispatches delivered today. */
export const DISPATCH_STAGES: {
  value: DispatchStage;
  label: string;
  hint: string;
}[] = [
  { value: "unassigned", label: "Unassigned", hint: "Needs a driver" },
  { value: "assigned", label: "Assigned", hint: "Waiting for pickup" },
  { value: "en_route", label: "En route", hint: "Picked up, not delivered" },
  {
    value: "completed",
    label: "Delivered today",
    hint: "Waiting for POD and billing",
  },
];

/** The steps a dispatch goes through; a card shows how many are done and names the next. */
export const DISPATCH_STEPS = [
  "Booked",
  "Assigned",
  "Picked up",
  "Out for delivery",
  "Arrived",
  "Delivered",
  "Billed",
];

const STAGE_OF_STATUS: Record<IDispatchStatus, DispatchStage> = {
  planned: "assigned",
  dispatched: "en_route",
  in_transit: "en_route",
  delivered: "completed",
  cancelled: "unassigned",
};

const STEPS_DONE: Record<IDispatchStatus, number> = {
  planned: 1,
  dispatched: 2,
  in_transit: 3,
  delivered: 4,
  cancelled: 0,
};

export interface DispatchPlace {
  id: string;
  title: string;
}

/** A driver or vehicle, named by its table's primary field. */
export interface DispatchResource {
  id: string;
  title: string;
  initials: string;
}

export interface DispatchShipment {
  id: string;
  title: string;
  /** The dispatch's stops once dispatched, else the shipment's origin and destination fields. */
  origin?: DispatchPlace;
  destination?: DispatchPlace;
  badge?: string;
  /** The weight in kg, then the text of each detail field that has a value. */
  details: string[];
  /** Its latest dispatch that isn't cancelled. */
  dispatch?: IDispatch;
  driver?: DispatchResource;
  vehicle?: DispatchResource;
  stage: DispatchStage;
  /** When the shipment record was created. */
  bookedAt: string;
}

/** The shipment fields a card reads. */
export interface DispatchCardFields {
  title?: ISidebarField;
  origin?: ISidebarField;
  destination?: ISidebarField;
  badge?: ISidebarField;
  weight?: ISidebarField;
  details: ISidebarField[];
}

export type DispatchCardPicks = Omit<IDispatchSettingsInput, "versionNo">;

const fieldsOf = (lookups: RecordLookups, sidebarId?: string) =>
  tableFields(lookups?.[sidebarId ?? ""]).filter(
    (field) => !field?.isSystemField,
  );

/** Link fields of the shipment table a card can read its origin and destination from. */
export const locationLinks = (fields: ISidebarField[], sidebarId?: string) =>
  fields.filter(
    (field) =>
      field?.type === "link_table" &&
      field?.lookupSettings?.categoryId === sidebarId,
  );

const initialsOf = (title: string) =>
  title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "?";

/** The shipment fields the board reads, as picked in the card settings; until they are saved, only the primary field as the title. */
export function cardFieldsOf(
  fields: ISidebarField[],
  picks?: DispatchCardPicks,
): DispatchCardFields {
  const byId = (id?: string) => fields.find((field) => field?.objId === id);
  return {
    title: titleFieldOf(fields, picks?.titleFieldId),
    origin: byId(picks?.originFieldId),
    destination: byId(picks?.destinationFieldId),
    badge: byId(picks?.badgeFieldId),
    weight: byId(picks?.weightFieldId),
    details: picks?.detailFieldIds?.flatMap((id) => byId(id) ?? []) ?? [],
  };
}

/** Just the picked field ids of saved settings; nothing picked when they aren't saved yet. */
export const toCardPicks = (saved?: DispatchCardPicks): DispatchCardPicks => ({
  titleFieldId: saved?.titleFieldId,
  originFieldId: saved?.originFieldId,
  destinationFieldId: saved?.destinationFieldId,
  badgeFieldId: saved?.badgeFieldId,
  weightFieldId: saved?.weightFieldId,
  detailFieldIds: saved?.detailFieldIds ?? [],
});

/** "3:00 PM" today, "22 Oct 3:00 PM" on another day. */
export function shortTime(value: string | undefined, now: Date) {
  if (!value) return "";
  const date = new Date(value);
  return format(date, isSameDay(date, now) ? "h:mm a" : "d MMM h:mm a");
}

/** "JOB-0042" from the dispatch's running number. */
export const jobNumber = (dispatch: IDispatch) =>
  `JOB-${String(dispatch?.docId ?? 0).padStart(4, "0")}`;

/** How many DISPATCH_STEPS are done. */
export const stepsDone = (dispatch?: IDispatch) =>
  dispatch ? STEPS_DONE[dispatch.status] : 0;

/** The time a card shows top right: the planned pickup, the ETA, or when it was delivered. */
export function cardTime(dispatch: IDispatch | undefined, now: Date) {
  if (dispatch?.status === "planned") {
    return `Pickup ${shortTime(dispatch.plannedPickupAt, now)}`;
  }
  if (dispatch?.status === "delivered") {
    return dispatch.actualDeliveryAt
      ? `Done ${shortTime(dispatch.actualDeliveryAt, now)}`
      : "";
  }
  return dispatch?.plannedDeliveryAt
    ? `ETA ${shortTime(dispatch.plannedDeliveryAt, now)}`
    : "";
}

/** "Pickup late 20 minutes" or "Late 2 hours" once the planned pickup or delivery has passed. */
export function lateText(dispatch: IDispatch | undefined, now: Date) {
  const due =
    dispatch?.status === "planned"
      ? dispatch.plannedPickupAt
      : dispatch?.status === "dispatched" || dispatch?.status === "in_transit"
        ? dispatch.plannedDeliveryAt
        : undefined;
  if (!due || new Date(due) >= now) return "";
  const late = formatDistanceStrict(new Date(due), now);
  return dispatch?.status === "planned"
    ? `Pickup late ${late}`
    : `Late ${late}`;
}

/**
 * The board's shipments, each with its latest dispatch, driver and vehicle, read through the card settings (see cardFieldsOf).
 * Locations are named by the origin field's shown field, else the location table's primary field.
 */
export function buildDispatchBoard(
  sources: IDispatchSources | undefined,
  lookups: RecordLookups,
  dispatches: IDispatch[],
  members: IUserInfo[],
  picks?: DispatchCardPicks,
) {
  const textOf = (field: ISidebarField | undefined, record: ISidebarRecord) =>
    field
      ? toRecordText(field, recordFieldValue(field, record), members, lookups)
      : "";

  const shipmentFields = fieldsOf(lookups, sources?.shipmentSidebarId);
  const card = cardFieldsOf(shipmentFields, picks);
  const detailFields =
    card.weight && !card.details.some((field) => field === card.weight)
      ? [card.weight, ...card.details]
      : card.details;
  const detailText = (field: ISidebarField, record: ISidebarRecord) => {
    const text = textOf(field, record);
    if (!text) return "";
    if (field.objId === card.weight?.objId) return `${text} kg`;
    return field.isDateField || field.type === "time"
      ? `${field.name} ${text}`
      : text;
  };

  const placeTitleField = card.origin
    ? lookupDisplayField(card.origin, lookups)
    : titleFieldOf(fieldsOf(lookups, sources?.locationSidebarId));
  const places = new Map(
    (lookups?.[sources?.locationSidebarId ?? ""]?.records ?? []).map(
      (record): [string, DispatchPlace] => [
        record.objId,
        {
          id: record.objId,
          title: recordTitle(record, placeTitleField, members, lookups),
        },
      ],
    ),
  );
  const linkedPlace = (
    field: ISidebarField | undefined,
    record: ISidebarRecord,
  ) =>
    places.get(parseRecordIds(record?.values?.[field?.objId ?? ""])?.[0] ?? "");

  const resourcesOf = (sidebarId?: string) => {
    const titleField = titleFieldOf(fieldsOf(lookups, sidebarId));
    return new Map(
      (lookups?.[sidebarId ?? ""]?.records ?? []).map(
        (record): [string, DispatchResource] => {
          const title = recordTitle(record, titleField, members, lookups);
          return [
            record.objId,
            { id: record.objId, title, initials: initialsOf(title) },
          ];
        },
      ),
    );
  };
  const drivers = resourcesOf(sources?.driverSidebarId);
  const vehicles = resourcesOf(sources?.vehicleSidebarId);

  const latest = new Map<string, IDispatch>();
  dispatches.forEach((dispatch) => {
    if (dispatch?.status !== "cancelled" && !latest.has(dispatch?.shipmentId)) {
      latest.set(dispatch.shipmentId, dispatch);
    }
  });

  const shipments = [
    ...(lookups?.[sources?.shipmentSidebarId ?? ""]?.records ?? []),
  ]
    .sort((a, b) => (a?.docId ?? 0) - (b?.docId ?? 0))
    .map((record): DispatchShipment => {
      const dispatch = latest.get(record.objId);
      return {
        id: record.objId,
        title: recordTitle(record, card.title, members, lookups),
        origin: dispatch
          ? places.get(dispatch.originId)
          : linkedPlace(card.origin, record),
        destination: dispatch
          ? places.get(dispatch.destinationId)
          : linkedPlace(card.destination, record),
        badge: textOf(card.badge, record) || undefined,
        details: detailFields
          .map((field) => detailText(field, record))
          .filter(Boolean),
        dispatch,
        driver: dispatch ? drivers.get(dispatch.driverId) : undefined,
        vehicle: dispatch ? vehicles.get(dispatch.vehicleId) : undefined,
        bookedAt: record.createTime,
        stage: dispatch ? STAGE_OF_STATUS[dispatch.status] : "unassigned",
      };
    });

  return { shipments, card, shipmentFields };
}

/** The shipments of each column; delivered ones only on the day they were delivered. */
export function boardColumns(shipments: DispatchShipment[], now: Date) {
  return DISPATCH_STAGES.map((stage) => ({
    ...stage,
    shipments: shipments.filter(
      (shipment) =>
        shipment?.stage === stage.value &&
        (stage.value !== "completed" ||
          (!!shipment?.dispatch?.actualDeliveryAt &&
            isSameDay(new Date(shipment.dispatch.actualDeliveryAt), now))),
    ),
  }));
}

/** What the full assign dialog opens with for a shipment. */
export const shipmentDraft = (
  shipment?: DispatchShipment,
): Partial<IDispatchCreate> => ({
  shipmentId: shipment?.id,
  originId: shipment?.origin?.id,
  destinationId: shipment?.destination?.id,
});
