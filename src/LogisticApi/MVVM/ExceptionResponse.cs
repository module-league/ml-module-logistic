using System.Text.Json;
using LogisticApi.Models;

namespace LogisticApi.MVVM
{
    /// <summary>Matches IException in web/src/services/exceptions/exception.types.ts. Times are UTC.</summary>
    public class ExceptionResponse
    {
        public Guid objId { get; set; }
        /// <summary>EXC-0001 from the running number.</summary>
        public string exceptionNo { get; set; } = string.Empty;
        public Guid shipmentId { get; set; }
        public Guid? dispatchId { get; set; }
        public string ruleKey { get; set; } = string.Empty;
        public string type { get; set; } = string.Empty;
        public string severity { get; set; } = string.Empty;
        public string status { get; set; } = string.Empty;
        public string title { get; set; } = string.Empty;
        public Guid? ownerId { get; set; }
        public DateTime openedAt { get; set; }
        public DateTime respondBy { get; set; }
        public DateTime? snoozedUntil { get; set; }
        public DateTime? resolvedAt { get; set; }
        public Guid? resolvedBy { get; set; }
        public string? resolutionReason { get; set; }
        /// <summary>The values that triggered it, as an object.</summary>
        public JsonElement facts { get; set; }
        public int versionNo { get; set; }

        public static ExceptionResponse From(ExceptionCase exception) => new()
        {
            objId = exception.ObjId,
            exceptionNo = $"EXC-{exception.DocId:0000}",
            shipmentId = exception.shipmentId,
            dispatchId = exception.dispatchId,
            ruleKey = exception.ruleKey,
            type = exception.type,
            severity = exception.severity,
            status = exception.status,
            title = exception.title,
            ownerId = exception.ownerId,
            openedAt = Utc(exception.CreateTime),
            respondBy = Utc(exception.respondBy),
            snoozedUntil = Utc(exception.snoozedUntil),
            resolvedAt = Utc(exception.resolvedAt),
            resolvedBy = exception.resolvedBy,
            resolutionReason = exception.resolutionReason,
            facts = JsonSerializer.Deserialize<JsonElement>(exception.facts),
            versionNo = exception.VersionNo,
        };

        // Saved as UTC but read back without a kind; mark it so it serializes with a Z
        internal static DateTime Utc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
        internal static DateTime? Utc(DateTime? value) => value is { } at ? Utc(at) : null;
    }

    /// <summary>Matches IExceptionActivity.</summary>
    public class ExceptionActivityResponse
    {
        public Guid objId { get; set; }
        public Guid exceptionId { get; set; }
        public string kind { get; set; } = string.Empty;
        /// <summary>Null for the rule engine; all zeros for a person until sign-in is wired up.</summary>
        public Guid? actorId { get; set; }
        public string? body { get; set; }
        public DateTime createdAt { get; set; }

        public static ExceptionActivityResponse From(ExceptionActivity activity) => new()
        {
            objId = activity.ObjId,
            exceptionId = activity.exceptionId,
            kind = activity.kind,
            actorId = activity.actorId,
            body = activity.body,
            createdAt = ExceptionResponse.Utc(activity.CreateTime),
        };
    }

    /// <summary>Matches IExceptionChange: the exception after a change and the timeline entry the change posted.</summary>
    public class ExceptionChangeResponse
    {
        public ExceptionResponse exception { get; set; } = new();
        public ExceptionActivityResponse activity { get; set; } = new();
    }

    /// <summary>Matches IExceptionRule: one rule from the workflow config.</summary>
    public class ExceptionRuleResponse
    {
        public string ruleKey { get; set; } = string.Empty;
        public string title { get; set; } = string.Empty;
        public string when { get; set; } = string.Empty;
        public string type { get; set; } = string.Empty;
        public string severity { get; set; } = string.Empty;
        public int slaMinutes { get; set; }
        public int gracePeriodMinutes { get; set; }
        public bool autoClose { get; set; }
        public bool isActive { get; set; }
        public bool manual { get; set; }
        /// <summary>Its condition is coded; false for a rule that waits for data that doesn't exist yet.</summary>
        public bool evaluated { get; set; }
        public decimal? tolerancePercent { get; set; }
        /// <summary>The reasons offered when resolving, False alarm last.</summary>
        public List<string> reasons { get; set; } = [];

        public static ExceptionRuleResponse From(ExceptionRule rule) => new()
        {
            reasons = [.. rule.Reasons.Where(r => r != ExceptionCase.FalseAlarmReason), ExceptionCase.FalseAlarmReason],
            ruleKey = rule.RuleKey,
            title = rule.Title,
            when = rule.When,
            type = rule.Type,
            severity = rule.Severity,
            slaMinutes = rule.SlaMinutes,
            gracePeriodMinutes = rule.GracePeriodMinutes,
            autoClose = rule.AutoClose,
            isActive = rule.IsActive,
            manual = rule.Manual,
            evaluated = rule.Manual || Services.ExceptionRuleEngine.Evaluated.Contains(rule.RuleKey),
            tolerancePercent = rule.TolerancePercent,
        };
    }

    /// <summary>Matches IExceptionSettings; versionNo 0 until first saved.</summary>
    public class ExceptionSettingsResponse
    {
        public Guid? etaFieldId { get; set; }
        public Guid? chargeableWeightFieldId { get; set; }
        public Guid? modeFieldId { get; set; }
        public Guid? openingHourFieldId { get; set; }
        public Guid? locationPhoneFieldId { get; set; }
        public Guid? driverPhoneFieldId { get; set; }
        public string timeZone { get; set; } = string.Empty;
        public int versionNo { get; set; }

        public static ExceptionSettingsResponse From(ExceptionSetting? setting, string timeZone) => new()
        {
            etaFieldId = setting?.etaFieldId,
            chargeableWeightFieldId = setting?.chargeableWeightFieldId,
            modeFieldId = setting?.modeFieldId,
            openingHourFieldId = setting?.openingHourFieldId,
            locationPhoneFieldId = setting?.locationPhoneFieldId,
            driverPhoneFieldId = setting?.driverPhoneFieldId,
            timeZone = timeZone,
            versionNo = setting?.VersionNo ?? 0,
        };
    }
}
