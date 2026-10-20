declare global {
  type IDispatchStatus =
    "planned" | "dispatched" | "in_transit" | "delivered" | "cancelled";

  /** The sidebars a dispatch picks its records from, set in the API's appsettings ("Dispatch"). */
  type IDispatchSources = {
    shipmentSidebarId: string;
    driverSidebarId: string;
    vehicleSidebarId: string;
    /** Origin and destination are both records of this sidebar. */
    locationSidebarId: string;
  };

  /** One dispatch as the API returns it (lg_dispatch). Each id is a record of its sidebar in IDispatchSources; times are UTC ISO strings. */
  type IDispatch = {
    objId: string;
    docId: number;
    shipmentId: string;
    driverId: string;
    vehicleId: string;
    originId: string;
    destinationId: string;
    plannedPickupAt: string;
    plannedDeliveryAt?: string;
    actualPickupAt?: string;
    actualDeliveryAt?: string;
    status: IDispatchStatus;
    notes?: string;
    versionNo: number;
    createTime: string;
  };

  /** Which shipment fields the Dispatch board reads (lg_dispatch_setting); ids are fields of IDispatchSources.shipmentSidebarId. */
  type IDispatchSettings = {
    /** Left out until first saved. */
    objId?: string;
    shipmentSidebarId: string;
    /** Left out, the primary field. */
    titleFieldId?: string;
    /** A link field to the location table. */
    originFieldId?: string;
    destinationFieldId?: string;
    badgeFieldId?: string;
    /** A number field, shown on the card in kg. */
    weightFieldId?: string;
    /** An attachment field whose labels the checkpoint log's files can take. */
    attachmentLabelFieldId?: string;
    /** Up to 4, in display order. */
    detailFieldIds: string[];
    /** 0 until first saved; the board then picks the fields itself. */
    versionNo: number;
  };

  type IDispatchSettingsInput = Omit<
    IDispatchSettings,
    "objId" | "shipmentSidebarId"
  >;

  /** A new dispatch starts as "planned". */
  type IDispatchCreate = Pick<
    IDispatch,
    | "shipmentId"
    | "driverId"
    | "vehicleId"
    | "originId"
    | "destinationId"
    | "plannedPickupAt"
    | "plannedDeliveryAt"
    | "notes"
  >;
}
