using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using ModuleLeague.Core.Abstractions;
using System.Text.Json;

namespace LogisticApi.Services
{
    /// <summary>
    /// Shipment exceptions (lg_shipment_exception) and their timeline (lg_exception_activity): raising one by hand, giving it an
    /// owner, notes and fix steps, snoozing it and resolving it with a reason. Rules open and auto-close the rest (ExceptionRuleEngine).
    /// </summary>
    public class ExceptionCaseService(
        ContextDb db,
        ICurrentUser currentUser,
        ExceptionRuleEngine engine,
        IOptions<ExceptionRuleOptions> ruleOptions,
        IOptions<DispatchOptions> dispatchOptions)
    {
        public static readonly string[] AttemptReasons = ["receiver_closed", "refused", "wrong_address", "nobody_to_sign"];
        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
        private readonly ExceptionRuleOptions config = ruleOptions.Value;
        private readonly DispatchOptions sources = dispatchOptions.Value;

        /// <summary>Newest first, resolved ones included, so reports can count every cause.</summary>
        public async Task<List<ExceptionResponse>> ListAsync(CancellationToken ct)
        {
            var exceptions = await db.ExceptionCases.AsNoTracking().OrderByDescending(e => e.DocId).ToListAsync(ct);
            return exceptions.Select(ExceptionResponse.From).ToList();
        }

        public List<ExceptionRuleResponse> Rules() => config.Rules.Select(ExceptionRuleResponse.From).ToList();

        /// <summary>Runs the rules now instead of waiting for the next minute, e.g. right after a fix changed a shipment.</summary>
        public Task EvaluateAsync(CancellationToken ct) => engine.EvaluateAsync(ct);

        /// <summary>Oldest first.</summary>
        public async Task<List<ExceptionActivityResponse>> ActivityAsync(Guid objId, CancellationToken ct)
        {
            if (!await db.ExceptionCases.AnyAsync(e => e.ObjId == objId, ct))
                throw ApiProblemException.NotFound("Exception not found.");
            var activity = await db.ExceptionActivities
                .AsNoTracking()
                .Where(a => a.exceptionId == objId)
                .OrderBy(a => a.DocId)
                .ToListAsync(ct);
            return activity.Select(ExceptionActivityResponse.From).ToList();
        }

        /// <summary>Raises one under a manual rule; a shipment can't have two unresolved ones for the same rule.</summary>
        public async Task<ExceptionChangeResponse> CreateAsync(ExceptionCreateRequest request, CancellationToken ct)
        {
            var rule = config.Find(request.ruleKey!);
            if (rule is not { Manual: true, IsActive: true })
                throw ApiProblemException.BadRequest("Unknown rule.", $"Raise one of {string.Join(", ", config.Rules.Where(r => r.Manual && r.IsActive).Select(r => r.RuleKey))} by hand.");
            var severity = request.severity ?? rule.Severity;
            CheckSeverity(severity);
            var shipmentId = request.shipmentId!.Value;
            if (!await db.SidebarRecords.AnyAsync(r => r.ObjId == shipmentId && r.sidebarId == sources.ShipmentSidebarId, ct))
                throw ApiProblemException.BadRequest("Unknown shipment.", $"'{shipmentId}' isn't a record of '{sources.ShipmentSidebarId}'.");
            var status = "not_dispatched";
            if (request.dispatchId is { } dispatchId)
                status = await db.Dispatches
                    .Where(d => d.ObjId == dispatchId && d.shipmentId == shipmentId)
                    .Select(d => d.status)
                    .FirstOrDefaultAsync(ct)
                    ?? throw ApiProblemException.BadRequest("Unknown dispatch.", "The dispatch isn't one of this shipment's.");

            object facts = new { status };
            var title = Clean(request.title) ?? rule.Title;
            if (rule.RuleKey == "delivery_attempt_failed")
            {
                if (!AttemptReasons.Contains(request.reason))
                    throw ApiProblemException.BadRequest("Say why the delivery failed.", $"Use one of {string.Join(", ", AttemptReasons)}.");
                facts = new { reason = request.reason, attemptAt = DateTime.UtcNow, status };
            }

            var exception = new ExceptionCase
            {
                ObjId = Guid.CreateVersion7(),
                shipmentId = shipmentId,
                dispatchId = request.dispatchId,
                ruleKey = rule.RuleKey,
                type = rule.Type,
                severity = severity,
                title = title,
                status = ExceptionCase.Open,
                ownerId = request.ownerId,
                respondBy = DateTime.UtcNow.AddMinutes(rule.SlaMinutes),
                facts = JsonSerializer.Serialize(facts, Json),
                factsKey = JsonSerializer.Serialize(facts, Json),
            };
            db.ExceptionCases.Add(exception);
            var opened = Log(exception, ExceptionActivity.Opened, Clean(request.note) ?? $"Raised by hand: {title}");
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
            {
                throw ApiProblemException.Conflict("This shipment already has an open exception for that.", "Work on that one instead, or resolve it first.");
            }
            return Change(exception, opened);
        }

        public async Task<ExceptionActivityResponse> AddActivityAsync(Guid objId, ExceptionActivityRequest request, CancellationToken ct)
        {
            if (request.kind is not (ExceptionActivity.Note or ExceptionActivity.Action))
                throw ApiProblemException.BadRequest("Unknown kind.", "Post a note or an action.");
            var exception = await db.ExceptionCases.AsNoTracking().FirstOrDefaultAsync(e => e.ObjId == objId, ct)
                ?? throw ApiProblemException.NotFound("Exception not found.");
            var body = Clean(request.body) ?? throw ApiProblemException.BadRequest("Write something first.");
            var activity = Log(exception, request.kind, body);
            await db.SaveChangesAsync(ct);
            return ExceptionActivityResponse.From(activity);
        }

        public Task<ExceptionChangeResponse> AssignAsync(Guid objId, ExceptionAssignRequest request, CancellationToken ct) =>
            ChangeAsync(objId, request, exception =>
            {
                exception.ownerId = request.ownerId;
                return (ExceptionActivity.Assigned, request.ownerId is null ? "Took the owner off." : "Assigned an owner.");
            }, ct);

        public Task<ExceptionChangeResponse> SnoozeAsync(Guid objId, ExceptionSnoozeRequest request, CancellationToken ct) =>
            ChangeAsync(objId, request, exception =>
            {
                var until = request.until!.Value.UtcDateTime;
                if (until <= DateTime.UtcNow || until > DateTime.UtcNow.AddDays(30))
                    throw ApiProblemException.BadRequest("Pick a time in the next 30 days.");
                exception.status = ExceptionCase.Snoozed;
                exception.snoozedUntil = until;
                return (ExceptionActivity.Action, Join($"Snoozed until {until:yyyy-MM-dd HH:mm} UTC.", request.note));
            }, ct);

        public Task<ExceptionChangeResponse> WakeAsync(Guid objId, ExceptionVersionRequest request, CancellationToken ct) =>
            ChangeAsync(objId, request, exception =>
            {
                if (exception.status != ExceptionCase.Snoozed)
                    throw ApiProblemException.BadRequest("It isn't snoozed.");
                exception.status = ExceptionCase.Open;
                exception.snoozedUntil = null;
                return (ExceptionActivity.Action, "Woken up; it's open again.");
            }, ct);

        public Task<ExceptionChangeResponse> ResolveAsync(Guid objId, ExceptionResolveRequest request, CancellationToken ct) =>
            ChangeAsync(objId, request, exception =>
            {
                var reason = Clean(request.reason) ?? throw ApiProblemException.BadRequest("Pick a reason.", "Resolving always needs a reason.");
                var note = Clean(request.note);
                exception.status = ExceptionCase.Resolved;
                exception.snoozedUntil = null;
                exception.resolvedAt = DateTime.UtcNow;
                exception.resolvedBy = currentUser.UserId;
                exception.resolutionReason = reason;
                return (ExceptionActivity.Resolved, note is null ? $"Resolved: {reason}." : $"Resolved: {reason}. {note}");
            }, ct);

        public async Task<ExceptionSettingsResponse> GetSettingsAsync(CancellationToken ct)
        {
            var setting = await db.ExceptionSettings.AsNoTracking().FirstOrDefaultAsync(s => s.shipmentSidebarId == sources.ShipmentSidebarId, ct);
            return ExceptionSettingsResponse.From(setting, config.TimeZone);
        }

        /// <summary>Adds the setting on the first save (versionNo 0) and replaces it after that; each field must be of its table and type.</summary>
        public async Task<ExceptionSettingsResponse> SaveSettingsAsync(ExceptionSettingsRequest request, CancellationToken ct)
        {
            var sidebarIds = new[] { sources.ShipmentSidebarId, sources.LocationSidebarId, sources.DriverSidebarId };
            var fields = await db.SidebarFields.AsNoTracking().Where(f => sidebarIds.Contains(f.sidebarId)).ToDictionaryAsync(f => f.ObjId, ct);
            void Check(Guid? id, string role, string sidebarId, Func<string, bool> accepts, string kind)
            {
                if (id is not { } fieldId) return;
                if (fields.GetValueOrDefault(fieldId) is not { } field || field.sidebarId != sidebarId)
                    throw ApiProblemException.BadRequest($"Unknown {role} field.", $"'{sidebarId}' has no field '{fieldId}'.");
                if (!accepts(field.type))
                    throw ApiProblemException.BadRequest($"The {role} needs a {kind} field.", $"'{field.sidebarName}' is a {field.type} field.");
            }
            Check(request.etaFieldId, "ETA", sources.ShipmentSidebarId, type => type == "date", "date");
            Check(request.chargeableWeightFieldId, "chargeable weight", sources.ShipmentSidebarId, FieldTypes.IsFormulaInput, "number");
            Check(request.modeFieldId, "mode", sources.ShipmentSidebarId, FieldTypes.IsSelection, "single select");
            Check(request.openingHourFieldId, "opening hour", sources.LocationSidebarId, type => type == "time", "time");
            Check(request.locationPhoneFieldId, "location phone", sources.LocationSidebarId, type => type == "text", "text");
            Check(request.driverPhoneFieldId, "driver phone", sources.DriverSidebarId, type => type == "text", "text");

            var setting = await db.ExceptionSettings.FirstOrDefaultAsync(s => s.shipmentSidebarId == sources.ShipmentSidebarId, ct);
            if (setting is null)
            {
                if (request.versionNo != 0) throw StaleSettings();
                setting = new ExceptionSetting { ObjId = Guid.CreateVersion7(), shipmentSidebarId = sources.ShipmentSidebarId };
                db.ExceptionSettings.Add(setting);
            }
            else
            {
                if (setting.VersionNo != request.versionNo) throw StaleSettings();
                db.Entry(setting).Property(s => s.VersionNo).OriginalValue = request.versionNo!.Value;
            }
            setting.etaFieldId = request.etaFieldId;
            setting.chargeableWeightFieldId = request.chargeableWeightFieldId;
            setting.modeFieldId = request.modeFieldId;
            setting.openingHourFieldId = request.openingHourFieldId;
            setting.locationPhoneFieldId = request.locationPhoneFieldId;
            setting.driverPhoneFieldId = request.driverPhoneFieldId;
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex) when (ex is DbUpdateConcurrencyException or DbUpdateException { InnerException: SqlException { Number: 2601 or 2627 } })
            {
                throw StaleSettings();
            }
            await engine.EvaluateAsync(ct);
            return ExceptionSettingsResponse.From(setting, config.TimeZone);
        }

        /// <summary>Loads it, checks the version and that it's unresolved, applies the change and logs it.</summary>
        private async Task<ExceptionChangeResponse> ChangeAsync(
            Guid objId,
            ExceptionVersionRequest request,
            Func<ExceptionCase, (string kind, string? body)> apply,
            CancellationToken ct)
        {
            var exception = await db.ExceptionCases.FirstOrDefaultAsync(e => e.ObjId == objId, ct)
                ?? throw ApiProblemException.NotFound("Exception not found.");
            if (exception.VersionNo != request.versionNo) throw Stale();
            if (exception.status == ExceptionCase.Resolved)
                throw ApiProblemException.BadRequest("It's already resolved.");
            db.Entry(exception).Property(e => e.VersionNo).OriginalValue = request.versionNo!.Value;
            var (kind, body) = apply(exception);
            var activity = Log(exception, kind, body);
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                throw Stale();
            }
            return Change(exception, activity);
        }

        private ExceptionActivity Log(ExceptionCase exception, string kind, string? body)
        {
            var activity = new ExceptionActivity
            {
                ObjId = Guid.CreateVersion7(),
                exceptionId = exception.ObjId,
                kind = kind,
                actorId = currentUser.UserId,
                body = body,
            };
            db.ExceptionActivities.Add(activity);
            return activity;
        }

        private static ExceptionChangeResponse Change(ExceptionCase exception, ExceptionActivity activity) =>
            new() { exception = ExceptionResponse.From(exception), activity = ExceptionActivityResponse.From(activity) };

        private static void CheckSeverity(string severity)
        {
            if (!ExceptionCase.Severities.Contains(severity))
                throw ApiProblemException.BadRequest("Unknown severity.", $"Use one of {string.Join(", ", ExceptionCase.Severities)}.");
        }

        private static string? Clean(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

        private static string Join(string first, string? note) => Clean(note) is { } extra ? $"{first} {extra}" : first;

        private static ApiProblemException Stale() =>
            ApiProblemException.Conflict("The exception was changed by someone else.", "Reload it and try again.");

        private static ApiProblemException StaleSettings() =>
            ApiProblemException.Conflict("The rule settings were changed by someone else.", "Reload the page and change them again.");
    }
}
