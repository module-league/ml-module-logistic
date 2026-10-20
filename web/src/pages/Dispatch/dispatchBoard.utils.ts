import { format, isSameDay } from "date-fns";
import {
  recordTitle,
  tableFields,
  titleFieldOf,
  TONE_CLASS,
} from "@/module/dashboard/moduleDashboard.utils";
import { recordFieldValue } from "@/module/page/modulePage.utils";
import {
  linkCardFields,
  lookupDisplayField,
  parseRecordIds,
  previewableLookupFields,
  type RecordLookups,
} from "@/lib/lookupHelper";
import { toRecordText } from "@/lib/recordTextHelper";

export type DispatchStage =
  "unassigned" | "assigned" | "en_route" | "completed";
export type DispatchTone = "green" | "amber" | "red";

export const DISPATCH_STAGES: {
  value: DispatchStage;
  label: string;
  className: string;
}[] = [
  { value: "unassigned", label: "Unassigned", className: TONE_CLASS.amber },
  {
    value: "assigned",
    label: "Assigned",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  },
  {
    value: "en_route",
    label: "En route",
    className:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300",
  },
  { value: "completed", label: "Completed", className: TONE_CLASS.green },
];

export const TONE_TEXT_CLASS: Record<DispatchTone, string> = {
  green: "text-emerald-700 dark:text-emerald-400",
  amber: "text-amber-700 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
};

const STAGE_OF_STATUS: Record<IDispatchStatus, DispatchStage> = {
  planned: "assigned",
  dispatched: "en_route",
  in_transit: "en_route",
  delivered: "completed",
  cancelled: "unassigned",
};

export interface DispatchPlace {
  id: string;
  title: string;
  details: string[];
  /** "HH:mm", from the location's first time field. */
  opens?: string;
  opensText?: string;
}

export interface DispatchShipment {
  id: string;
  title: string;
  origin?: DispatchPlace;
  destination?: DispatchPlace;
  badge?: string;
  /** The text of each detail field that has a value, in order. */
  details: string[];
  weight?: number;
  /** Its latest dispatch that isn't cancelled. */
  dispatch?: IDispatch;
  stage: DispatchStage;
}

/** The shipment fields the card and assign panel read. */
export interface DispatchCardFields {
  title?: ISidebarField;
  origin?: ISidebarField;
  destination?: ISidebarField;
  badge?: ISidebarField;
  weight?: ISidebarField;
  details: ISidebarField[];
}

export type DispatchCardPicks = Omit<IDispatchSettingsInput, "versionNo">;

/** A driver or vehicle; trip is its open dispatch. */
export interface DispatchResource {
  id: string;
  title: string;
  initials: string;
  detail: string;
  capacity?: number;
  /** Drivers only: the vehicle their link field to the vehicle table picks. */
  vehicleId?: string;
  trip?: IDispatch;
}

const isOpen = (dispatch?: IDispatch) =>
  !!dispatch && !["delivered", "cancelled"].includes(dispatch.status);

const fieldsOf = (lookups: RecordLookups, sidebarId?: string) =>
  tableFields(lookups?.[sidebarId ?? ""]).filter(
    (field) => !field?.isSystemField,
  );

const linkTo = (fields: ISidebarField[], sidebarId?: string) =>
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

function firstBy<T>(items: T[], keyOf: (item: T) => string | undefined) {
  const byKey = new Map<string, T>();
  items.forEach((item) => {
    const key = keyOf(item);
    if (key && !byKey.has(key)) byKey.set(key, item);
  });
  return byKey;
}

/** Link fields of the shipment table a card can read its origin and destination from. */
export const locationLinks = linkTo;

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

/**
 * The board's shipments, drivers and vehicles from the dispatch tables' records. Shipments read the fields in picks (see cardFieldsOf);
 * a vehicle's first single select is its type and first number its capacity, and a location's first time field is when it opens.
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
  const numberOf = (
    field: ISidebarField | undefined,
    record: ISidebarRecord,
  ) => {
    const value = field && recordFieldValue(field, record);
    return value ? Number(value) : undefined;
  };

  const shipmentFields = fieldsOf(lookups, sources?.shipmentSidebarId);
  const card = cardFieldsOf(shipmentFields, picks);
  const originField = card.origin;
  const detailText = (field: ISidebarField, record: ISidebarRecord) => {
    const text = textOf(field, record);
    if (!text) return "";
    if (field.objId === card.weight?.objId) return `${text} kg`;
    return field.isDateField || field.type === "time"
      ? `${field.name} ${text}`
      : text;
  };

  const locationFields = fieldsOf(lookups, sources?.locationSidebarId);
  const placeTitleField = originField
    ? lookupDisplayField(originField, lookups)
    : titleFieldOf(locationFields);
  const placeDetailFields = originField
    ? linkCardFields(originField, lookups)
    : [];
  const opensField = locationFields.find((field) => field?.type === "time");
  const places = new Map(
    (lookups?.[sources?.locationSidebarId ?? ""]?.records ?? []).map(
      (record): [string, DispatchPlace] => [
        record.objId,
        {
          id: record.objId,
          title: recordTitle(record, placeTitleField, members, lookups),
          details: placeDetailFields
            .map((field) => textOf(field, record))
            .filter(Boolean),
          opens:
            opensField && (record?.values?.[opensField.objId] ?? undefined),
          opensText: textOf(opensField, record) || undefined,
        },
      ],
    ),
  );
  const placeOf = (field: ISidebarField | undefined, record: ISidebarRecord) =>
    places.get(parseRecordIds(record?.values?.[field?.objId ?? ""])?.[0] ?? "");

  const latest = firstBy(
    dispatches.filter((dispatch) => dispatch?.status !== "cancelled"),
    (dispatch) => dispatch?.shipmentId,
  );
  const shipments = [
    ...(lookups?.[sources?.shipmentSidebarId ?? ""]?.records ?? []),
  ]
    .sort((a, b) => (a?.docId ?? 0) - (b?.docId ?? 0))
    .map((record): DispatchShipment => {
      const dispatch = latest.get(record.objId);
      return {
        id: record.objId,
        title: recordTitle(record, card.title, members, lookups),
        origin: placeOf(card.origin, record),
        destination: placeOf(card.destination, record),
        badge: textOf(card.badge, record) || undefined,
        details: card.details
          .map((field) => detailText(field, record))
          .filter(Boolean),
        weight: numberOf(card.weight, record),
        dispatch,
        stage: dispatch ? STAGE_OF_STATUS[dispatch.status] : "unassigned",
      };
    });

  const openDispatches = dispatches.filter(isOpen);
  const driverTrips = firstBy(openDispatches, (dispatch) => dispatch?.driverId);
  const vehicleTrips = firstBy(
    openDispatches,
    (dispatch) => dispatch?.vehicleId,
  );

  const vehicleFields = fieldsOf(lookups, sources?.vehicleSidebarId);
  const vehicleTitleField = titleFieldOf(vehicleFields);
  const vehicleTypeField = vehicleFields.find(
    (field) => field?.type === "single_select",
  );
  const capacityField = vehicleFields.find((field) => field?.isNumeric);
  const vehicles = (
    lookups?.[sources?.vehicleSidebarId ?? ""]?.records ?? []
  ).map((record): DispatchResource => {
    const title = recordTitle(record, vehicleTitleField, members, lookups);
    const capacity = numberOf(capacityField, record);
    return {
      id: record.objId,
      title,
      initials: initialsOf(title),
      detail: [
        textOf(vehicleTypeField, record),
        title,
        capacity === undefined ? "" : `${textOf(capacityField, record)} kg`,
      ]
        .filter(Boolean)
        .join(" · "),
      capacity,
      trip: vehicleTrips.get(record.objId),
    };
  });
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));

  const driverFields = fieldsOf(lookups, sources?.driverSidebarId);
  const driverTitleField = titleFieldOf(driverFields);
  const [vehicleLinkField] = linkTo(driverFields, sources?.vehicleSidebarId);
  const driverDetailFields = previewableLookupFields(driverFields)
    .filter((field) => field?.objId !== driverTitleField?.objId)
    .slice(0, 2);
  const drivers = (
    lookups?.[sources?.driverSidebarId ?? ""]?.records ?? []
  ).map((record): DispatchResource => {
    const title = recordTitle(record, driverTitleField, members, lookups);
    const vehicleId = parseRecordIds(
      record?.values?.[vehicleLinkField?.objId ?? ""],
    )?.[0];
    const vehicle = vehicleById.get(vehicleId);
    return {
      id: record.objId,
      title,
      initials: initialsOf(title),
      detail:
        vehicle?.detail ??
        driverDetailFields
          .map((field) => textOf(field, record))
          .filter(Boolean)
          .join(" · "),
      capacity: vehicle?.capacity,
      vehicleId: vehicle?.id,
      trip: driverTrips.get(record.objId),
    };
  });

  return { shipments, drivers, vehicles, card, shipmentFields };
}

/** Whether a driver or vehicle can take a shipment of this weight now, and the short text its card shows. */
export function availability(
  resource: DispatchResource | undefined,
  weight: number | undefined,
  now: Date,
): { tone: DispatchTone; text: string; free: boolean } {
  if (
    resource?.capacity !== undefined &&
    weight !== undefined &&
    weight > resource.capacity
  ) {
    return { tone: "red", text: "Over capacity", free: false };
  }
  const trip = resource?.trip;
  if (trip?.status === "planned") {
    return {
      tone: "amber",
      text: `Booked · ${shortTime(trip.plannedPickupAt, now)}`,
      free: false,
    };
  }
  if (trip) {
    const freeAt = shortTime(trip.plannedDeliveryAt, now);
    return {
      tone: "amber",
      text: freeAt ? `On trip · free ${freeAt}` : "On trip",
      free: false,
    };
  }
  return { tone: "green", text: "Available", free: true };
}

/** When the origin next opens, from now; the next full hour when it has no opening time. */
export function nextPickup(opens: string | undefined, now: Date) {
  const at = new Date(now);
  const [hours, minutes] = opens?.split(":").map(Number) ?? [];
  if (Number.isFinite(hours) && Number.isFinite(minutes)) {
    at.setHours(hours, minutes, 0, 0);
    if (at <= now) at.setDate(at.getDate() + 1);
    return at;
  }
  at.setHours(at.getHours() + 1, 0, 0, 0);
  return at;
}

/** What the full assign dialog opens with for a shipment. */
export const shipmentDraft = (
  shipment?: DispatchShipment,
): Partial<IDispatchCreate> => ({
  shipmentId: shipment?.id,
  originId: shipment?.origin?.id,
  destinationId: shipment?.destination?.id,
});
