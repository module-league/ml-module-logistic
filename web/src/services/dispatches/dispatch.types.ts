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
