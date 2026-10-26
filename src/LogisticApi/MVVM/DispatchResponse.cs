using LogisticApi.Models;

namespace LogisticApi.MVVM
{
    /// <summary>Matches IDispatch in web/src/services/dispatches/dispatch.types.ts. Times are UTC.</summary>
    public class DispatchResponse
    {
        public Guid objId { get; set; }
        public int docId { get; set; }
        public Guid shipmentId { get; set; }
        public Guid driverId { get; set; }
        public Guid vehicleId { get; set; }
        public Guid originId { get; set; }
        public Guid destinationId { get; set; }
        public DateTime plannedPickupAt { get; set; }
        public DateTime? plannedDeliveryAt { get; set; }
        public DateTime? actualPickupAt { get; set; }
        public DateTime? actualDeliveryAt { get; set; }
        public string status { get; set; } = Dispatch.DefaultStatus;
        public string? notes { get; set; }
        public int versionNo { get; set; }
        public DateTime createTime { get; set; }

        public static DispatchResponse From(Dispatch dispatch) => new()
        {
            objId = dispatch.ObjId,
            docId = dispatch.DocId,
            shipmentId = dispatch.shipmentId,
            driverId = dispatch.driverId,
            vehicleId = dispatch.vehicleId,
            originId = dispatch.originId,
            destinationId = dispatch.destinationId,
            plannedPickupAt = Utc(dispatch.plannedPickupAt),
            plannedDeliveryAt = Utc(dispatch.plannedDeliveryAt),
            actualPickupAt = Utc(dispatch.actualPickupAt),
            actualDeliveryAt = Utc(dispatch.actualDeliveryAt),
            status = dispatch.status,
            notes = dispatch.notes,
            versionNo = dispatch.VersionNo,
            createTime = Utc(dispatch.CreateTime),
        };

        // Saved as UTC but read back without a kind; mark it so it serializes with a Z
        private static DateTime Utc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
        private static DateTime? Utc(DateTime? value) => value is { } at ? Utc(at) : null;
    }

    /// <summary>Matches IDispatchStatusResult: the moved dispatch and the log entry posted for it.</summary>
    public class DispatchStatusResponse
    {
        public DispatchResponse dispatch { get; set; } = new();
        public CheckpointLogResponse checkpoint { get; set; } = new();
    }

    /// <summary>Matches IDispatchSources: the sidebars a dispatch picks its records from.</summary>
    public class DispatchSourcesResponse
    {
        public string shipmentSidebarId { get; set; } = string.Empty;
        public string driverSidebarId { get; set; } = string.Empty;
        public string vehicleSidebarId { get; set; } = string.Empty;
        public string locationSidebarId { get; set; } = string.Empty;

        public static DispatchSourcesResponse From(DispatchOptions options) => new()
        {
            shipmentSidebarId = options.ShipmentSidebarId,
            driverSidebarId = options.DriverSidebarId,
            vehicleSidebarId = options.VehicleSidebarId,
            locationSidebarId = options.LocationSidebarId,
        };
    }
}
