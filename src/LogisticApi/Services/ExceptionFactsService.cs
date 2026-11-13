using System.Globalization;
using System.Text;
using System.Text.Json;
using LogisticApi.Context;
using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LogisticApi.Services
{
    /// <summary>
    /// What the system knows about an exception, written out for the AI: the exception and its timeline, the shipment, its dispatch
    /// and checkpoints, and the people and places on it. Shared by the co-pilot and the customer updates.
    /// </summary>
    public class ExceptionFactsService(ContextDb db, RecordTextService texts, IOptions<ExceptionRuleOptions> ruleOptions, IOptions<DispatchOptions> dispatchOptions)
    {
        private readonly ExceptionRuleOptions rules = ruleOptions.Value;
        private readonly DispatchOptions sources = dispatchOptions.Value;

        /// <summary>The exception the text is about, its dispatch (its own, else the shipment's latest) and the text.</summary>
        public sealed record Facts(ExceptionCase Exception, ExceptionRule? Rule, Dispatch? Dispatch, string Text);

        /// <summary>
        /// Loads the exception and writes out its facts. forCustomer leaves out internal checkpoints and the driver and vehicle, and
        /// marks the team's own timeline as background, so nothing internal ends up in a message to the customer.
        /// </summary>
        public async Task<Facts> DescribeAsync(Guid exceptionId, int maxCheckpoints, bool forCustomer, CancellationToken ct)
        {
            var exception = await db.ExceptionCases.AsNoTracking().FirstOrDefaultAsync(e => e.ObjId == exceptionId, ct)
                ?? throw ApiProblemException.NotFound("Exception not found.");
            var rule = rules.Find(exception.ruleKey);

            var text = new StringBuilder();
            text.AppendLine($"Now: {Local(DateTime.UtcNow)} ({texts.ZoneName}). All times below are in this zone.");
            text.AppendLine();
            text.AppendLine("## Exception");
            text.AppendLine($"Title: {exception.title}");
            text.AppendLine($"Rule: {rule?.Title ?? exception.ruleKey} — opens when {rule?.When ?? "raised by hand"}");
            text.AppendLine($"Severity: {exception.severity}; status: {exception.status}");
            text.AppendLine($"Opened: {Local(exception.CreateTime)}; respond by: {Local(exception.respondBy)}");
            if (exception.snoozedUntil is { } snoozed) text.AppendLine($"Snoozed until: {Local(snoozed)}");
            text.AppendLine($"Facts when it opened: {exception.facts}");

            var activity = await db.ExceptionActivities.AsNoTracking()
                .Where(a => a.exceptionId == exception.ObjId)
                .OrderBy(a => a.DocId)
                .ToListAsync(ct);
            text.AppendLine();
            text.AppendLine(forCustomer
                ? "## The team's own timeline, oldest first (background only: never quote or mention it)"
                : "## Exception timeline, oldest first");
            foreach (var entry in activity)
                text.AppendLine($"- {Local(entry.CreateTime)} · {entry.kind} by {(entry.actorId is null ? "the system" : "a team member")}: {entry.body}");

            await AppendRecordAsync(text, "Shipment", sources.ShipmentSidebarId, exception.shipmentId, ct);

            // An exception raised before dispatch has none of its own; the shipment's latest dispatch still tells where it stands
            var dispatch = exception.dispatchId is { } dispatchId
                ? await db.Dispatches.AsNoTracking().FirstOrDefaultAsync(d => d.ObjId == dispatchId, ct)
                : await db.Dispatches.AsNoTracking().Where(d => d.shipmentId == exception.shipmentId).OrderByDescending(d => d.DocId).FirstOrDefaultAsync(ct);
            if (dispatch is null)
            {
                text.AppendLine();
                text.AppendLine("## Dispatch");
                text.AppendLine("Not dispatched yet.");
                return new Facts(exception, rule, null, text.ToString());
            }

            text.AppendLine();
            text.AppendLine("## Dispatch");
            text.AppendLine($"Status: {dispatch.status}");
            text.AppendLine($"Planned pickup: {Local(dispatch.plannedPickupAt)}");
            if (dispatch.plannedDeliveryAt is { } plannedDelivery) text.AppendLine($"Planned delivery: {Local(plannedDelivery)}");
            if (dispatch.actualPickupAt is { } pickedUp) text.AppendLine($"Picked up: {Local(pickedUp)}");
            if (dispatch.actualArrivalAt is { } arrived) text.AppendLine($"Arrived: {Local(arrived)}");
            if (dispatch.actualDeliveryAt is { } delivered) text.AppendLine($"Delivered: {Local(delivered)}");
            if (!forCustomer && dispatch.pickupWeight is { } weight) text.AppendLine($"Weighed at pickup: {weight:0.##} kg");
            if (!forCustomer && !string.IsNullOrWhiteSpace(dispatch.notes)) text.AppendLine($"Notes: {dispatch.notes}");

            var query = db.CheckpointLogs.AsNoTracking().Where(c => c.dispatchId == dispatch.ObjId);
            if (forCustomer) query = query.Where(c => !c.internalOnly);
            var checkpoints = await query.OrderByDescending(c => c.DocId).Take(maxCheckpoints).ToListAsync(ct);
            text.AppendLine();
            text.AppendLine(forCustomer ? "## Dispatch checkpoints the customer may see, oldest first" : "## Dispatch checkpoints, oldest first");
            if (checkpoints.Count == 0) text.AppendLine("None posted.");
            foreach (var checkpoint in Enumerable.Reverse(checkpoints))
            {
                var files = FileCount(checkpoint.attachments);
                var parts = new[]
                {
                    checkpoint.status is { } status ? $"moved to {status}" : null,
                    Clean(checkpoint.note),
                    files > 0 ? $"{files} file(s) attached" : null,
                    checkpoint.internalOnly ? "(internal)" : null,
                }.OfType<string>();
                text.AppendLine($"- {Local(checkpoint.CreateTime)}: {string.Join(" · ", parts)}");
            }

            if (!forCustomer)
            {
                await AppendRecordAsync(text, "Driver", sources.DriverSidebarId, dispatch.driverId, ct);
                await AppendRecordAsync(text, "Vehicle", sources.VehicleSidebarId, dispatch.vehicleId, ct);
            }
            await AppendRecordAsync(text, "Origin (pickup)", sources.LocationSidebarId, dispatch.originId, ct);
            await AppendRecordAsync(text, "Destination (receiver)", sources.LocationSidebarId, dispatch.destinationId, ct);
            return new Facts(exception, rule, dispatch, text.ToString());
        }

        /// <summary>A UTC time in the configured zone, e.g. "Fri 13 Nov 2026 14:00".</summary>
        public string Local(DateTime utc) =>
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), texts.Zone).ToString("ddd dd MMM yyyy HH:mm", CultureInfo.InvariantCulture);

        /// <summary>A record's fields as "Label: value" lines under a heading.</summary>
        private async Task AppendRecordAsync(StringBuilder text, string heading, string sidebarId, Guid id, CancellationToken ct)
        {
            var row = (await RecordRow.LoadAsync(db, sidebarId, ct, [id])).FirstOrDefault();
            var (title, fields) = await texts.FieldTextsAsync(sidebarId, row, ct);
            text.AppendLine();
            text.AppendLine($"## {heading}");
            if (row is null)
            {
                text.AppendLine("Record not found.");
                return;
            }
            if (title != "") text.AppendLine($"Name: {title}");
            foreach (var (field, value) in fields) text.AppendLine($"{field.sidebarName}: {value}");
        }

        private static int FileCount(string attachments)
        {
            try
            {
                using var json = JsonDocument.Parse(attachments);
                return json.RootElement.ValueKind == JsonValueKind.Array ? json.RootElement.GetArrayLength() : 0;
            }
            catch (JsonException)
            {
                return 0;
            }
        }

        private static string? Clean(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();
    }
}
