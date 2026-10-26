using System.ComponentModel.DataAnnotations;

namespace LogisticApi.MVVM
{
    /// <summary>Plans a dispatch; it starts as "planned". Each id is a record of its sidebar in GET /api/dispatches/sources.</summary>
    public class DispatchCreateRequest
    {
        [Required]
        public Guid? shipmentId { get; set; }

        [Required]
        public Guid? driverId { get; set; }

        [Required]
        public Guid? vehicleId { get; set; }

        /// <summary>A location record; must differ from destinationId.</summary>
        [Required]
        public Guid? originId { get; set; }

        [Required]
        public Guid? destinationId { get; set; }

        /// <summary>ISO 8601; without an offset it is read as UTC.</summary>
        [Required]
        public DateTimeOffset? plannedPickupAt { get; set; }

        /// <summary>Not before plannedPickupAt.</summary>
        public DateTimeOffset? plannedDeliveryAt { get; set; }

        [MaxLength(1000)]
        public string? notes { get; set; }
    }

    /// <summary>Moves a dispatch to a later status of Dispatch.Flow, or cancels it; posts an entry to its checkpoint log.</summary>
    public class DispatchStatusRequest
    {
        /// <summary>picked_up, in_transit, arrived, delivered or cancelled.</summary>
        [Required]
        public string? status { get; set; }

        /// <summary>The versionNo last read; a stale one is rejected with 409.</summary>
        [Required]
        public int? versionNo { get; set; }

        /// <summary>Shown on the log entry, e.g. why it was cancelled.</summary>
        [MaxLength(2000)]
        public string? note { get; set; }

        /// <summary>Hides the log entry from the customer.</summary>
        public bool internalOnly { get; set; }
    }
}
