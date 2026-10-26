declare global {
  type IExceptionSeverity = "low" | "medium" | "high";
  type IExceptionStatus = "open" | "snoozed" | "resolved";
  type IExceptionAttemptReason =
    "receiver_closed" | "refused" | "wrong_address" | "nobody_to_sign";

  /** The values that triggered an exception, plus what its shipment looked like when it opened; each rule fills its own. */
  type IExceptionFacts = {
    due?: string;
    dueSource?: "eta" | "planned_delivery";
    plannedPickupAt?: string;
    pickupWeight?: number;
    recordWeight?: number;
    differencePercent?: number;
    arrivedAt?: string;
    opensAt?: string;
    reason?: IExceptionAttemptReason;
    attemptAt?: string;
    /** The papers that weren't verified, by title. */
    missing?: string[];
    status?: IDispatchStatus | "not_dispatched";
    mode?: string | null;
    lastCheckpoint?: { at: string; status?: IDispatchStatus; note?: string };
  };

  /** One shipment problem (lg_shipment_exception), opened by a rule or by hand. Matches ExceptionResponse; times are UTC. */
  type IException = {
    objId: string;
    /** EXC-0001. */
    exceptionNo: string;
    shipmentId: string;
    dispatchId?: string;
    ruleKey: string;
    type: string;
    severity: IExceptionSeverity;
    status: IExceptionStatus;
    title: string;
    ownerId?: string;
    openedAt: string;
    /** The SLA deadline. */
    respondBy: string;
    snoozedUntil?: string;
    resolvedAt?: string;
    /** Left out when the rule closed it itself. */
    resolvedBy?: string;
    resolutionReason?: string;
    facts: IExceptionFacts;
    versionNo: number;
  };

  type IExceptionActivityKind =
    "opened" | "assigned" | "note" | "action" | "resolved" | "auto_closed";

  type IExceptionActivity = {
    objId: string;
    exceptionId: string;
    kind: IExceptionActivityKind;
    /** Left out for the rule engine; all zeros for a person until sign-in is wired up. */
    actorId?: string;
    body?: string;
    createdAt: string;
  };

  /** An exception after a change and the timeline entry the change posted. */
  type IExceptionChange = {
    exception: IException;
    activity: IExceptionActivity;
  };

  /** One rule from the API's workflow config ("ExceptionRules" in appsettings). */
  type IExceptionRule = {
    ruleKey: string;
    title: string;
    /** Its condition, e.g. "now > dueTime + grace AND status != delivered". */
    when: string;
    type: string;
    severity: IExceptionSeverity;
    slaMinutes: number;
    gracePeriodMinutes: number;
    autoClose: boolean;
    isActive: boolean;
    /** Raised by hand, never by the engine. */
    manual: boolean;
    /** False while it waits for data that doesn't exist yet, e.g. documents. */
    evaluated: boolean;
    tolerancePercent?: number;
    /** Offered when resolving, "False alarm" last. */
    reasons: string[];
  };

  /** Which fields the rules read (lg_exception_setting); versionNo 0 until first saved. */
  type IExceptionSettings = {
    /** Date field of the shipment table. */
    etaFieldId?: string;
    /** Number field of the shipment table, in kg. */
    chargeableWeightFieldId?: string;
    /** Single select field of the shipment table. */
    modeFieldId?: string;
    /** Time field of the location table. */
    openingHourFieldId?: string;
    /** Text field of the location table. */
    locationPhoneFieldId?: string;
    /** Text field of the driver table. */
    driverPhoneFieldId?: string;
    /** Where operating hours and date-only ETAs are read. */
    timeZone: string;
    versionNo: number;
  };

  type IExceptionSettingsInput = Omit<IExceptionSettings, "timeZone">;

  /** Raises one by hand under a manual rule; delivery_attempt_failed needs the reason. */
  type IExceptionCreate = Pick<
    IException,
    "shipmentId" | "dispatchId" | "ruleKey" | "ownerId"
  > & {
    severity?: IExceptionSeverity;
    title?: string;
    reason?: IExceptionAttemptReason;
    note?: string;
  };
}
