using ModuleLeague.Core.Entities;

namespace LogisticApi.Models
{
    /// <summary>A shipment handed to a driver and vehicle, picked up at origin and taken to destination. The ids are records (lg_logistic) of the sidebars in DispatchOptions.</summary>
    public class Dispatch : MLEntityBase
    {
        public const string DefaultStatus = "planned";
        public static readonly string[] Statuses = ["planned", "dispatched", "in_transit", "delivered", "cancelled"];
        /// <summary>A shipment can be dispatched again once its dispatch is in one of these.</summary>
        public static readonly string[] ClosedStatuses = ["delivered", "cancelled"];

        public Guid shipmentId { get; set; }
        public Guid driverId { get; set; }
        public Guid vehicleId { get; set; }
        public Guid originId { get; set; }
        public Guid destinationId { get; set; }
        /// <summary>UTC.</summary>
        public DateTime plannedPickupAt { get; set; }
        /// <summary>UTC; null when not planned yet.</summary>
        public DateTime? plannedDeliveryAt { get; set; }
        /// <summary>UTC; set when the driver picks the shipment up.</summary>
        public DateTime? actualPickupAt { get; set; }
        /// <summary>UTC; set when the shipment is delivered.</summary>
        public DateTime? actualDeliveryAt { get; set; }
        /// <summary>One of Statuses.</summary>
        public string status { get; set; } = DefaultStatus;
        public string? notes { get; set; }
    }
}
