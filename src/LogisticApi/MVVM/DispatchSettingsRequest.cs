using System.ComponentModel.DataAnnotations;

namespace LogisticApi.MVVM
{
    /// <summary>Which shipment fields the Dispatch board reads. Each id is a field of the shipment sidebar in GET /api/dispatches/sources.</summary>
    public class DispatchSettingsRequest
    {
        /// <summary>Null uses the primary field.</summary>
        public Guid? titleFieldId { get; set; }

        /// <summary>A link field to the location sidebar.</summary>
        [Required]
        public Guid? originFieldId { get; set; }

        /// <summary>A link field to the location sidebar, other than originFieldId.</summary>
        [Required]
        public Guid? destinationFieldId { get; set; }

        public Guid? badgeFieldId { get; set; }

        /// <summary>A number field, shown on the card in kg; null shows no weight.</summary>
        public Guid? weightFieldId { get; set; }

        /// <summary>Up to 4, in display order.</summary>
        [MaxLength(4)]
        public List<Guid> detailFieldIds { get; set; } = [];

        /// <summary>The versionNo you last read; 0 when nothing is saved yet. A stale value returns 409.</summary>
        public int versionNo { get; set; }
    }
}
