using ModuleLeague.Core.Entities;

namespace LogisticApi.Models
{
    /// <summary>Which fields of the shipment sidebar the Dispatch board reads, one row per shipment sidebar. The field ids are SidebarField ObjIds of shipmentSidebarId.</summary>
    public class DispatchSetting : MLEntityBase
    {
        public const int MaxDetailFields = 4;

        public string shipmentSidebarId { get; set; } = string.Empty;
        /// <summary>The card's title; null uses the primary field.</summary>
        public Guid? titleFieldId { get; set; }
        /// <summary>A link field to the location sidebar.</summary>
        public Guid? originFieldId { get; set; }
        /// <summary>A link field to the location sidebar, other than originFieldId.</summary>
        public Guid? destinationFieldId { get; set; }
        /// <summary>Shown as a badge, e.g. the shipment mode.</summary>
        public Guid? badgeFieldId { get; set; }
        /// <summary>A number field, in kg, checked against the vehicle capacity.</summary>
        public Guid? weightFieldId { get; set; }
        /// <summary>JSON array of up to MaxDetailFields field ids, in display order.</summary>
        public string detailFieldIds { get; set; } = "[]";
    }
}
