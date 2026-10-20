using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LogisticApi.Services
{
    /// <summary>
    /// Dispatches (lg_dispatch): a shipment, driver, vehicle, origin and destination, each a record of its sidebar in DispatchOptions.
    /// </summary>
    public class DispatchService(ContextDb db, IOptions<DispatchOptions> options)
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
            return DispatchResponse.From(dispatch);
        }

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
