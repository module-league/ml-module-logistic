namespace LogisticApi.Models
{
    /// <summary>The "Dispatch" section of appsettings: the sidebars (web/src/config/config.ts) a dispatch picks its records from.</summary>
    public class DispatchOptions
    {
        public const string Section = "Dispatch";

        public string ShipmentSidebarId { get; set; } = "shipment";
        public string DriverSidebarId { get; set; } = "shipment-driver";
        public string VehicleSidebarId { get; set; } = "shipment-vehicle";
        /// <summary>Origin and destination are both records of this sidebar.</summary>
        public string LocationSidebarId { get; set; } = "shipment-location";
    }
}
