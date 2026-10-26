using ModuleLeague.Core.Entities;

namespace LogisticApi.Models
{
    /// <summary>
    /// One shipment problem (ShipmentException in the spec): opened by a rule in ExceptionRuleOptions or by hand, owned, worked to
    /// its respondBy deadline and resolved with a reason. A shipment has at most one unresolved exception per rule.
    /// </summary>
    public class ExceptionCase : MLEntityBase
    {
        public const string Open = "open";
        public const string Snoozed = "snoozed";
        public const string Resolved = "resolved";
        public static readonly string[] Statuses = [Open, Snoozed, Resolved];
        public static readonly string[] Severities = ["low", "medium", "high"];

        /// <summary>The reason the rule engine gives when the condition clears.</summary>
        public const string AutoClosedReason = "Condition cleared";
        /// <summary>Offered on every rule, so reports show which rules need a grace period.</summary>
        public const string FalseAlarmReason = "False alarm";

        public Guid shipmentId { get; set; }
        public Guid? dispatchId { get; set; }
        /// <summary>The ExceptionRule that opened it.</summary>
        public string ruleKey { get; set; } = string.Empty;
        /// <summary>The rule's type, kept so reports group by it even if the rule changes.</summary>
        public string type { get; set; } = string.Empty;
        public string severity { get; set; } = "medium";
        public string status { get; set; } = Open;
        public string title { get; set; } = string.Empty;
        public Guid? ownerId { get; set; }
        /// <summary>UTC SLA deadline: opened plus the rule's slaMinutes.</summary>
        public DateTime respondBy { get; set; }
        /// <summary>UTC; it reopens by itself after this.</summary>
        public DateTime? snoozedUntil { get; set; }
        public DateTime? resolvedAt { get; set; }
        /// <summary>Null when the rule engine closed it.</summary>
        public Guid? resolvedBy { get; set; }
        /// <summary>Why it was resolved, e.g. "New ETA agreed with carrier"; required once resolved.</summary>
        public string? resolutionReason { get; set; }
        /// <summary>JSON snapshot when it opened: the values that triggered it and what the shipment looked like, e.g. its status and mode.</summary>
        public string facts { get; set; } = "{}";
        /// <summary>Just the triggering values; a resolved exception with the same key isn't reopened.</summary>
        public string factsKey { get; set; } = string.Empty;
    }

    /// <summary>Something that happened to an exception, shown on its timeline.</summary>
    public class ExceptionActivity : MLEntityBase
    {
        public const string Opened = "opened";
        public const string Assigned = "assigned";
        public const string Note = "note";
        public const string Action = "action";
        public const string Resolved = "resolved";
        public const string AutoClosed = "auto_closed";
        public static readonly string[] Kinds = [Opened, Assigned, Note, Action, Resolved, AutoClosed];

        public Guid exceptionId { get; set; }
        /// <summary>One of Kinds.</summary>
        public string kind { get; set; } = Note;
        /// <summary>Null for the rule engine.</summary>
        public Guid? actorId { get; set; }
        public string? body { get; set; }
    }

    /// <summary>Which fields the exception rules read, beside the card settings' destination field (lg_exception_setting).</summary>
    public class ExceptionSetting : MLEntityBase
    {
        public string shipmentSidebarId { get; set; } = string.Empty;
        /// <summary>A date field of the shipment table.</summary>
        public Guid? etaFieldId { get; set; }
        /// <summary>A number field of the shipment table, in kg.</summary>
        public Guid? chargeableWeightFieldId { get; set; }
        /// <summary>A single select field of the shipment table, e.g. Sea or Air.</summary>
        public Guid? modeFieldId { get; set; }
        /// <summary>A time field of the location table.</summary>
        public Guid? openingHourFieldId { get; set; }
        /// <summary>A text field of the location table.</summary>
        public Guid? locationPhoneFieldId { get; set; }
        /// <summary>A text field of the driver table.</summary>
        public Guid? driverPhoneFieldId { get; set; }
    }
}
