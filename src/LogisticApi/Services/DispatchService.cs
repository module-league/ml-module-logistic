using System.Text.Json;
using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LogisticApi.Services
{
    /// <summary>
    /// Dispatches (lg_dispatch): a shipment, driver, vehicle, origin and destination, each a record of its sidebar in DispatchOptions.
    /// </summary>
    public class DispatchService(ContextDb db, IOptions<DispatchOptions> options, ExceptionRuleEngine rules, DocumentChecklistService documents)
    {
        private readonly DispatchOptions sources = options.Value;

        public DispatchSourcesResponse Sources() => DispatchSourcesResponse.From(sources);

        public async Task<List<DispatchResponse>> ListAsync(CancellationToken ct)
        {
            var dispatches = await db.Dispatches
                .AsNoTracking()
                .OrderByDescending(d => d.DocId)
                .ToListAsync(ct);
            return dispatches.Select(DispatchResponse.From).ToList();
        }

        public async Task<DispatchResponse> GetAsync(Guid objId, CancellationToken ct)
        {
            var dispatch = await db.Dispatches
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.ObjId == objId, ct)
                ?? throw ApiProblemException.NotFound("Dispatch not found.");
            return DispatchResponse.From(dispatch);
        }

        /// <summary>Plans a dispatch; a shipment can't have two open dispatches at once.</summary>
        public async Task<DispatchResponse> CreateAsync(DispatchCreateRequest request, CancellationToken ct)
        {
            var shipmentId = request.shipmentId!.Value;
            var originId = request.originId!.Value;
            var destinationId = request.destinationId!.Value;
            var pickupAt = request.plannedPickupAt!.Value.UtcDateTime;
            var deliveryAt = request.plannedDeliveryAt?.UtcDateTime;

            if (originId == destinationId)
                throw ApiProblemException.BadRequest("Origin and destination are the same.", "Pick a destination other than the origin.");
            if (deliveryAt < pickupAt)
                throw ApiProblemException.BadRequest("Delivery is planned before pickup.", "Plan the delivery on or after the pickup.");

            await CheckRecordsAsync(
                [
                    ("Shipment", shipmentId, sources.ShipmentSidebarId),
                    ("Driver", request.driverId!.Value, sources.DriverSidebarId),
                    ("Vehicle", request.vehicleId!.Value, sources.VehicleSidebarId),
                    ("Origin", originId, sources.LocationSidebarId),
                    ("Destination", destinationId, sources.LocationSidebarId),
                ],
                ct);

            var open = await db.Dispatches
                .AsNoTracking()
                .AnyAsync(d => d.shipmentId == shipmentId && !Dispatch.ClosedStatuses.Contains(d.status), ct);
            if (open)
                throw ApiProblemException.Conflict("The shipment is already dispatched.", "Deliver or cancel its open dispatch first.");

            var dispatch = new Dispatch
            {
                ObjId = Guid.CreateVersion7(),
                shipmentId = shipmentId,
                driverId = request.driverId.Value,
                vehicleId = request.vehicleId.Value,
                originId = originId,
                destinationId = destinationId,
                plannedPickupAt = pickupAt,
                plannedDeliveryAt = deliveryAt,
                status = Dispatch.DefaultStatus,
                notes = string.IsNullOrWhiteSpace(request.notes) ? null : request.notes.Trim(),
            };
            db.Dispatches.Add(dispatch);
            await db.SaveChangesAsync(ct);
            await rules.EvaluateAsync(ct);
            return DispatchResponse.From(dispatch);
        }

        /// <summary>Reassigns an open dispatch or moves its planned times, and logs the change on its checkpoint log.</summary>
        public async Task<DispatchResponse> PlanAsync(Guid objId, DispatchPlanRequest request, CancellationToken ct)
        {
            var pickupAt = request.plannedPickupAt!.Value.UtcDateTime;
            var deliveryAt = request.plannedDeliveryAt?.UtcDateTime;
            if (deliveryAt < pickupAt)
                throw ApiProblemException.BadRequest("Delivery is planned before pickup.", "Plan the delivery on or after the pickup.");

            var dispatch = await db.Dispatches.FirstOrDefaultAsync(d => d.ObjId == objId, ct)
                ?? throw ApiProblemException.NotFound("Dispatch not found.");
            if (dispatch.VersionNo != request.versionNo) throw StaleDispatch();
            if (Dispatch.ClosedStatuses.Contains(dispatch.status))
                throw ApiProblemException.BadRequest($"The dispatch is already {dispatch.status}.", "A closed dispatch can't change.");
            await CheckRecordsAsync(
                [
                    ("Driver", request.driverId!.Value, sources.DriverSidebarId),
                    ("Vehicle", request.vehicleId!.Value, sources.VehicleSidebarId),
                ],
                ct);

            db.Entry(dispatch).Property(d => d.VersionNo).OriginalValue = request.versionNo!.Value;
            dispatch.driverId = request.driverId.Value;
            dispatch.vehicleId = request.vehicleId.Value;
            dispatch.plannedPickupAt = pickupAt;
            dispatch.plannedDeliveryAt = deliveryAt;
            db.CheckpointLogs.Add(new CheckpointLog
            {
                ObjId = Guid.CreateVersion7(),
                dispatchId = objId,
                note = string.IsNullOrWhiteSpace(request.note) ? "Plan changed." : request.note.Trim(),
                internalOnly = true,
            });
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                throw StaleDispatch();
            }
            await rules.EvaluateAsync(ct);
            return DispatchResponse.From(dispatch);
        }

        /// <summary>
        /// Moves an open dispatch ahead in Dispatch.Flow, skipping steps if need be, or cancels it, and posts the move to its checkpoint log.
        /// Reaching picked_up or later stamps the pickup time if it isn't set; delivered stamps the delivery time. A step a document gates
        /// can't be reached until that document is verified (DocumentRequirement.Blocks).
        /// </summary>
        public async Task<DispatchStatusResponse> MoveAsync(Guid objId, DispatchStatusRequest request, CancellationToken ct)
        {
            var status = request.status!;
            if (!Dispatch.Statuses.Contains(status) || status == Dispatch.DefaultStatus)
                throw ApiProblemException.BadRequest("Unknown status.", $"Use one of {string.Join(", ", Dispatch.Statuses.Skip(1))}.");

            var dispatch = await db.Dispatches.FirstOrDefaultAsync(d => d.ObjId == objId, ct)
                ?? throw ApiProblemException.NotFound("Dispatch not found.");
            if (dispatch.VersionNo != request.versionNo) throw StaleDispatch();
            if (Dispatch.ClosedStatuses.Contains(dispatch.status))
                throw ApiProblemException.BadRequest($"The dispatch is already {dispatch.status}.", "A closed dispatch can't change; dispatch the shipment again instead.");
            var reached = Array.IndexOf(Dispatch.Flow, status);
            if (status != Dispatch.Cancelled && reached <= Array.IndexOf(Dispatch.Flow, dispatch.status))
                throw ApiProblemException.BadRequest($"The dispatch is already past {status}.", "A dispatch can only move ahead.");

            var now = DateTime.UtcNow;
            if (status != Dispatch.Cancelled)
            {
                var checklist = (await documents.BuildAsync(ct, [dispatch.shipmentId])).GetValueOrDefault(dispatch.shipmentId);
                if (checklist?.Blocking(dispatch.status, status, now) is { Count: > 0 } unverified)
                    throw ApiProblemException.BadRequest(
                        $"Verify the papers for {GateNames.GetValueOrDefault(unverified[0].Requirement.Blocks!, "this step")} first.",
                        $"{Sentence(unverified.Select(i => i.Type.Title).ToList())} {(unverified.Count == 1 ? "isn't" : "aren't")} verified yet. Verify them on the Documents page.");
            }

            db.Entry(dispatch).Property(d => d.VersionNo).OriginalValue = request.versionNo!.Value;
            dispatch.status = status;
            var pickedUp = reached >= Array.IndexOf(Dispatch.Flow, Dispatch.PickedUp);
            if (request.pickupWeight is not null && (!pickedUp || dispatch.pickupWeight is not null))
                throw ApiProblemException.BadRequest("The pickup weight can't be set now.", "Weigh it when marking it picked up.");
            if (pickedUp) dispatch.actualPickupAt ??= now;
            dispatch.pickupWeight ??= request.pickupWeight;
            if (status == Dispatch.Arrived) dispatch.actualArrivalAt = now;
            if (status == Dispatch.Delivered) dispatch.actualDeliveryAt = now;

            var log = new CheckpointLog
            {
                ObjId = Guid.CreateVersion7(),
                dispatchId = objId,
                status = status,
                note = string.IsNullOrWhiteSpace(request.note) ? null : request.note.Trim(),
                internalOnly = request.internalOnly,
            };
            db.CheckpointLogs.Add(log);
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                throw StaleDispatch();
            }
            await rules.EvaluateAsync(ct);
            return new DispatchStatusResponse { dispatch = DispatchResponse.From(dispatch), checkpoint = CheckpointLogResponse.From(log) };
        }

        private static readonly Dictionary<string, string> GateNames = new()
        {
            [Dispatch.PickedUp] = "pickup",
            ["in_transit"] = "transit",
            [Dispatch.Arrived] = "arrival",
            [Dispatch.Delivered] = "delivery",
        };

        /// <summary>"A", "A and B", "A, B and C".</summary>
        private static string Sentence(List<string> items) =>
            items.Count < 2 ? string.Concat(items) : $"{string.Join(", ", items[..^1])} and {items[^1]}";

        private static ApiProblemException StaleDispatch() =>
            ApiProblemException.Conflict("The dispatch was changed by someone else.", "Reload it and try again.");

        public async Task<DispatchSettingsResponse> GetSettingsAsync(CancellationToken ct)
        {
            var setting = await db.DispatchSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.shipmentSidebarId == sources.ShipmentSidebarId, ct);
            return setting is null ? DispatchSettingsResponse.Empty(sources.ShipmentSidebarId) : DispatchSettingsResponse.From(setting);
        }

        /// <summary>Adds the setting on the first save (versionNo 0) and replaces it after that.</summary>
        public async Task<DispatchSettingsResponse> SaveSettingsAsync(DispatchSettingsRequest request, CancellationToken ct)
        {
            var fields = await db.SidebarFields
                .AsNoTracking()
                .Where(f => f.sidebarId == sources.ShipmentSidebarId)
                .ToDictionaryAsync(f => f.ObjId, ct);
            SidebarField FieldOf(Guid id, string role) =>
                fields.GetValueOrDefault(id)
                ?? throw ApiProblemException.BadRequest($"Unknown {role} field.", $"'{sources.ShipmentSidebarId}' has no field '{id}'.");
            void CheckLocationLink(Guid id, string role)
            {
                var field = FieldOf(id, role);
                if (!FieldTypes.IsLink(field.type) || FieldSettings.Read(field.settings).lookupSidebarId != sources.LocationSidebarId)
                    throw ApiProblemException.BadRequest($"The {role} needs a link to the location table.", $"'{field.sidebarName}' doesn't link to '{sources.LocationSidebarId}'.");
            }

            var originId = request.originFieldId!.Value;
            var destinationId = request.destinationFieldId!.Value;
            CheckLocationLink(originId, "origin");
            CheckLocationLink(destinationId, "destination");
            if (originId == destinationId)
                throw ApiProblemException.BadRequest("Origin and destination are the same field.", "Pick a different field for each.");
            if (request.titleFieldId is { } titleId) FieldOf(titleId, "title");
            if (request.badgeFieldId is { } badgeId) FieldOf(badgeId, "badge");
            if (request.weightFieldId is { } weightId && !FieldTypes.IsNumeric(FieldOf(weightId, "weight").type))
                throw ApiProblemException.BadRequest("The weight needs a number field.", $"'{fields[weightId].sidebarName}' is a {fields[weightId].type} field.");
            var detailIds = request.detailFieldIds.Distinct().ToList();
            detailIds.ForEach(id => FieldOf(id, "detail"));

            var setting = await db.DispatchSettings.FirstOrDefaultAsync(s => s.shipmentSidebarId == sources.ShipmentSidebarId, ct);
            if (setting is null)
            {
                if (request.versionNo != 0) throw StaleSettings();
                setting = new DispatchSetting { ObjId = Guid.CreateVersion7(), shipmentSidebarId = sources.ShipmentSidebarId };
                db.DispatchSettings.Add(setting);
            }
            else
            {
                if (setting.VersionNo != request.versionNo) throw StaleSettings();
                db.Entry(setting).Property(s => s.VersionNo).OriginalValue = request.versionNo;
            }

            setting.titleFieldId = request.titleFieldId;
            setting.originFieldId = originId;
            setting.destinationFieldId = destinationId;
            setting.badgeFieldId = request.badgeFieldId;
            setting.weightFieldId = request.weightFieldId;
            setting.detailFieldIds = JsonSerializer.Serialize(detailIds);

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                throw StaleSettings();
            }
            // Two first saves at once: the one-setting index keeps the second out
            catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
            {
                throw StaleSettings();
            }
            return DispatchSettingsResponse.From(setting);
        }

        private static ApiProblemException StaleSettings() =>
            ApiProblemException.Conflict("The card settings were changed by someone else.", "Reload the page and change them again.");

        /// <summary>Each id must be a record of its sidebar.</summary>
        private async Task CheckRecordsAsync(List<(string label, Guid id, string sidebarId)> picks, CancellationToken ct)
        {
            var ids = picks.Select(p => p.id).Distinct().ToList();
            var found = await db.SidebarRecords
                .AsNoTracking()
                .Where(r => ids.Contains(r.ObjId))
                .ToDictionaryAsync(r => r.ObjId, r => r.sidebarId, ct);
            var wrong = picks.FirstOrDefault(p => found.GetValueOrDefault(p.id) != p.sidebarId);
            if (wrong.label is not null)
                throw ApiProblemException.BadRequest($"Unknown {wrong.label.ToLowerInvariant()}.", $"'{wrong.id}' isn't a record of '{wrong.sidebarId}'.");
        }
    }
}
