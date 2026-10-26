using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LogisticApi.Services
{
    /// <summary>
    /// Checks every active rule against the shipments, dispatches and locations, then opens an exception for each condition that
    /// holds and has none unresolved, auto-closes those whose condition cleared, and reopens snoozed ones whose time is up.
    /// A condition someone resolved with the same facts isn't reopened, so a false alarm stays closed until its values change.
    /// Runs every minute (ExceptionMonitor) and right after a dispatch or a document changes.
    /// </summary>
    public class ExceptionRuleEngine(
        ContextDb db,
        IOptions<ExceptionRuleOptions> ruleOptions,
        IOptions<DispatchOptions> dispatchOptions,
        DocumentChecklistService documents,
        ILogger<ExceptionRuleEngine> logger)
    {
        /// <summary>The rules with a coded condition; the rest are raised by hand or wait for data that doesn't exist yet.</summary>
        public static readonly string[] Evaluated =
            ["delayed", "late_pickup", "missing_destination", "missing_document", "weight_mismatch", "arrived_before_opening", "pod_not_verified"];

        private static readonly SemaphoreSlim Gate = new(1, 1);
        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
        private readonly ExceptionRuleOptions config = ruleOptions.Value;
        private readonly DispatchOptions sources = dispatchOptions.Value;

        private sealed record Candidate(string RuleKey, Guid ShipmentId, Guid? DispatchId, string Facts, string Key);

        public async Task EvaluateAsync(CancellationToken ct)
        {
            await Gate.WaitAsync(ct);
            try
            {
                await SyncAsync(await CandidatesAsync(DateTime.UtcNow, ct), DateTime.UtcNow, ct);
            }
            finally
            {
                Gate.Release();
            }
        }

        private async Task<List<Candidate>> CandidatesAsync(DateTime now, CancellationToken ct)
        {
            var zone = TimeZoneInfo.FindSystemTimeZoneById(config.TimeZone);
            var roles = await db.ExceptionSettings.AsNoTracking().FirstOrDefaultAsync(s => s.shipmentSidebarId == sources.ShipmentSidebarId, ct);
            var card = await db.DispatchSettings.AsNoTracking().FirstOrDefaultAsync(s => s.shipmentSidebarId == sources.ShipmentSidebarId, ct);
            var shipments = await RecordRow.LoadAsync(db, sources.ShipmentSidebarId, ct);
            var locations = (await RecordRow.LoadAsync(db, sources.LocationSidebarId, ct)).ToDictionary(r => r.Id);
            var dispatches = await db.Dispatches.AsNoTracking().OrderByDescending(d => d.DocId).ToListAsync(ct);
            var latest = dispatches
                .Where(d => d.status != Dispatch.Cancelled)
                .GroupBy(d => d.shipmentId)
                .ToDictionary(g => g.Key, g => g.First());
            var checkpoints = (await db.CheckpointLogs
                    .AsNoTracking()
                    .Select(l => new { l.dispatchId, l.DocId, l.status, l.note, l.CreateTime })
                    .ToListAsync(ct))
                .GroupBy(l => l.dispatchId)
                .ToDictionary(g => g.Key, g => g.MaxBy(l => l.DocId)!);
            var checklists = await documents.BuildAsync(ct);
            var modes = roles?.modeFieldId is { } modeField
                ? await db.SidebarFieldOptions.AsNoTracking().Where(o => o.fieldObjId == modeField).ToDictionaryAsync(o => o.ObjId.ToString(), o => o.value, ct)
                : [];

            List<Candidate> candidates = [];
            // The facts are what triggered it plus what the shipment looked like then; only the trigger is compared later
            void Add(string ruleKey, RecordRow shipment, Dispatch? dispatch, DateTime since, object trigger)
            {
                var rule = config.Find(ruleKey);
                if (rule is not { IsActive: true, Manual: false } || since.AddMinutes(rule.GracePeriodMinutes) > now) return;
                var facts = JsonSerializer.SerializeToNode(trigger, Json)!.AsObject();
                facts["status"] = dispatch?.status ?? "not_dispatched";
                facts["mode"] = modes.GetValueOrDefault(shipment.Value(roles?.modeFieldId) ?? "");
                if (dispatch is not null && checkpoints.GetValueOrDefault(dispatch.ObjId) is { } last)
                    facts["lastCheckpoint"] = new JsonObject { ["at"] = Iso(last.CreateTime), ["status"] = last.status, ["note"] = last.note };
                candidates.Add(new(ruleKey, shipment.Id, dispatch?.ObjId, facts.ToJsonString(Json), JsonSerializer.Serialize(trigger, Json)));
            }

            foreach (var shipment in shipments)
            {
                var dispatch = latest.GetValueOrDefault(shipment.Id);

                // Delayed: the planned delivery, else the ETA, has passed and it isn't delivered
                var due = dispatch?.plannedDeliveryAt is { } planned ? planned : DateOf(shipment, roles?.etaFieldId, zone);
                if (due is { } dueAt && dueAt <= now && dispatch?.status != Dispatch.Delivered)
                    Add("delayed", shipment, dispatch, dueAt, new { due = Iso(dueAt), dueSource = dispatch?.plannedDeliveryAt is null ? "eta" : "planned_delivery" });

                // Late pickup: planned, and the planned pickup has passed
                if (dispatch is { status: Dispatch.DefaultStatus } && dispatch.plannedPickupAt <= now)
                    Add("late_pickup", shipment, dispatch, dispatch.plannedPickupAt, new { plannedPickupAt = Iso(dispatch.plannedPickupAt) });

                // Missing destination: booked without one, so it can't be dispatched
                if (card?.destinationFieldId is { } destinationField && dispatch is null && shipment.Link(destinationField) is null)
                    Add("missing_destination", shipment, null, shipment.CreateTime, new { });

                // Missing document: dispatched, and papers that gate the pickup aren't verified
                var checklist = checklists.GetValueOrDefault(shipment.Id);
                if (dispatch is { status: Dispatch.DefaultStatus }
                    && checklist?.Blocking(Dispatch.DefaultStatus, Dispatch.PickedUp, now) is { Count: > 0 } papers)
                    Add("missing_document", shipment, dispatch, DateTime.SpecifyKind(dispatch.CreateTime, DateTimeKind.Utc), new { missing = papers.Select(p => p.Type.Title) });

                // POD not verified: delivered, and papers that gate billing aren't verified
                if (dispatch is { status: Dispatch.Delivered, actualDeliveryAt: { } deliveredAt }
                    && checklist?.Blocking(Dispatch.Delivered, DocumentSteps.Billed, now) is { Count: > 0 } proof)
                    Add("pod_not_verified", shipment, dispatch, deliveredAt, new { missing = proof.Select(p => p.Type.Title) });

                // Weight mismatch: the pickup weight differs from the chargeable weight by more than the tolerance
                if (dispatch is { pickupWeight: { } pickupWeight, actualPickupAt: { } pickedUpAt }
                    && NumberOf(shipment, roles?.chargeableWeightFieldId) is { } recordWeight and > 0)
                {
                    var difference = Math.Round(Math.Abs(pickupWeight - recordWeight) / recordWeight * 100, 1);
                    if (difference > (config.Find("weight_mismatch")?.TolerancePercent ?? 5))
                        Add("weight_mismatch", shipment, dispatch, pickedUpAt, new { pickupWeight, recordWeight, differencePercent = difference });
                }

                // Arrived before opening: marked arrived earlier than the destination's opening hour that day
                if (dispatch is { status: Dispatch.Arrived, actualArrivalAt: { } arrivedAt }
                    && locations.GetValueOrDefault(dispatch.destinationId) is { } destination
                    && TimeOf(destination, roles?.openingHourFieldId) is { } opening)
                {
                    var localArrival = TimeZoneInfo.ConvertTimeFromUtc(arrivedAt, zone);
                    var opensAt = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localArrival.Date + opening.ToTimeSpan(), DateTimeKind.Unspecified), zone);
                    if (arrivedAt < opensAt)
                        Add("arrived_before_opening", shipment, dispatch, arrivedAt, new { arrivedAt = Iso(arrivedAt), opensAt = Iso(opensAt) });
                }
            }
            return candidates;
        }

        private async Task SyncAsync(List<Candidate> candidates, DateTime now, CancellationToken ct)
        {
            var exceptions = await db.ExceptionCases.ToListAsync(ct);
            var unresolved = exceptions
                .Where(e => e.status != ExceptionCase.Resolved)
                .ToDictionary(e => (e.shipmentId, e.ruleKey));

            foreach (var exception in unresolved.Values.Where(e => e.status == ExceptionCase.Snoozed && e.snoozedUntil <= now))
            {
                exception.status = ExceptionCase.Open;
                exception.snoozedUntil = null;
                Log(exception, ExceptionActivity.Action, "Snooze ended; it's open again.");
            }

            foreach (var candidate in candidates)
            {
                if (unresolved.ContainsKey((candidate.ShipmentId, candidate.RuleKey))) continue;
                var dismissed = exceptions.Any(e =>
                    e.status == ExceptionCase.Resolved && e.shipmentId == candidate.ShipmentId && e.ruleKey == candidate.RuleKey
                    && e.dispatchId == candidate.DispatchId && e.factsKey == candidate.Key);
                if (dismissed) continue;

                var rule = config.Find(candidate.RuleKey)!;
                var opened = new ExceptionCase
                {
                    ObjId = Guid.CreateVersion7(),
                    shipmentId = candidate.ShipmentId,
                    dispatchId = candidate.DispatchId,
                    ruleKey = rule.RuleKey,
                    type = rule.Type,
                    severity = rule.Severity,
                    title = rule.Title,
                    status = ExceptionCase.Open,
                    respondBy = now.AddMinutes(rule.SlaMinutes),
                    facts = candidate.Facts,
                    factsKey = candidate.Key,
                };
                db.ExceptionCases.Add(opened);
                Log(opened, ExceptionActivity.Opened, $"Opened by rule \"{rule.RuleKey}\".");
            }

            var held = candidates.Select(c => (c.ShipmentId, c.RuleKey)).ToHashSet();
            foreach (var exception in unresolved.Values)
            {
                var rule = config.Find(exception.ruleKey);
                if (rule is not { IsActive: true, AutoClose: true, Manual: false } || !Evaluated.Contains(rule.RuleKey)) continue;
                if (held.Contains((exception.shipmentId, exception.ruleKey))) continue;
                exception.status = ExceptionCase.Resolved;
                exception.snoozedUntil = null;
                exception.resolvedAt = now;
                exception.resolvedBy = null;
                exception.resolutionReason = ExceptionCase.AutoClosedReason;
                Log(exception, ExceptionActivity.AutoClosed, "The condition cleared, so it closed itself.");
            }

            try
            {
                await db.SaveChangesAsync(ct);
            }
            // Someone changed an exception, or another run opened the same one, meanwhile: the next run picks it up
            catch (Exception ex) when (ex is DbUpdateConcurrencyException or DbUpdateException { InnerException: SqlException { Number: 2601 or 2627 } })
            {
                logger.LogInformation(ex, "Exception rules skipped a run that clashed with another change.");
                db.ChangeTracker.Clear();
            }
        }

        private void Log(ExceptionCase exception, string kind, string body) =>
            db.ExceptionActivities.Add(new ExceptionActivity
            {
                ObjId = Guid.CreateVersion7(),
                exceptionId = exception.ObjId,
                kind = kind,
                actorId = null,
                body = body,
            });

        /// <summary>A date-and-time value is UTC; a date-only one is midnight in the configured zone.</summary>
        private static DateTime? DateOf(RecordRow row, Guid? fieldId, TimeZoneInfo zone)
        {
            var text = row.Value(fieldId);
            if (text is null) return null;
            if (DateOnly.TryParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day))
                return TimeZoneInfo.ConvertTimeToUtc(day.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified), zone);
            return DateTimeOffset.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var at) ? at.UtcDateTime : null;
        }

        private static decimal? NumberOf(RecordRow row, Guid? fieldId) =>
            decimal.TryParse(row.Value(fieldId), NumberStyles.Number, CultureInfo.InvariantCulture, out var number) ? number : null;

        private static TimeOnly? TimeOf(RecordRow row, Guid? fieldId) =>
            TimeOnly.TryParseExact(row.Value(fieldId), ["HH:mm", "HH:mm:ss"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var time) ? time : null;

        private static string Iso(DateTime value) =>
            DateTime.SpecifyKind(value, DateTimeKind.Utc).ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture);
    }

    /// <summary>Runs the exception rules every minute, so timers like the late pickup fire without anyone opening a page.</summary>
    public class ExceptionMonitor(IServiceScopeFactory scopes, ILogger<ExceptionMonitor> logger) : BackgroundService
    {
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
            do
            {
                try
                {
                    using var scope = scopes.CreateScope();
                    await scope.ServiceProvider.GetRequiredService<ExceptionRuleEngine>().EvaluateAsync(stoppingToken);
                }
                // Errors while the app shuts down (disposed services) aren't worth reporting
                catch (Exception ex) when (ex is not OperationCanceledException && !stoppingToken.IsCancellationRequested)
                {
                    logger.LogError(ex, "Exception rules failed to run.");
                }
            } while (await timer.WaitForNextTickAsync(stoppingToken));
        }
    }
}
