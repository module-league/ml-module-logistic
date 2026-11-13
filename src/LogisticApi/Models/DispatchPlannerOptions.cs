namespace LogisticApi.Models
{
    /// <summary>The "DispatchPlanner" appsettings section: the AI that proposes a driver, vehicle and times for each shipment not yet dispatched. The key is Anthropic:ApiKey.</summary>
    public class DispatchPlannerOptions
    {
        public const string SectionName = "DispatchPlanner";

        public string Model { get; set; } = "claude-haiku-5-5";

        /// <summary>low, medium or high: how hard the model thinks; higher combines trips and times them better and costs more.</summary>
        public string Effort { get; set; } = "medium";

        public int MaxTokens { get; set; } = 16000;

        /// <summary>The most shipments planned at once, oldest first.</summary>
        public int MaxShipments { get; set; } = 30;

        /// <summary>When the working day starts and ends, local "HH:mm"; plans outside it get a warning.</summary>
        public string DayStart { get; set; } = "07:00";
        public string DayEnd { get; set; } = "19:00";

        /// <summary>How long an existing dispatch without a planned delivery is taken to keep its driver and vehicle busy.</summary>
        public int TripHours { get; set; } = 4;

        /// <summary>A number field of the vehicle table with this name is its capacity in kg; loads above it are blocked.</summary>
        public string CapacityFieldName { get; set; } = "Capacity";

        /// <summary>A checkbox field of the driver or vehicle table with this name marks who can be planned; without one, everyone can.</summary>
        public string AvailableFieldName { get; set; } = "Available";

        /// <summary>Date fields of the driver and vehicle tables whose names contain this, e.g. "License Expiry Date": past ones keep the record out.</summary>
        public string ExpiryWord { get; set; } = "Expir";
    }
}
