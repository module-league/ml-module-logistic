namespace LogisticApi.MVVM
{
    /// <summary>The day to plan, local "yyyy-MM-dd"; today when left out.</summary>
    public class DispatchPlannerRequest
    {
        public string? date { get; set; }
    }

    /// <summary>A proposed plan for the shipments not yet dispatched. Nothing is saved; each line a person approves becomes a dispatch.</summary>
    public class DispatchPlannerResponse
    {
        /// <summary>Local "yyyy-MM-dd".</summary>
        public string date { get; set; } = string.Empty;
        public string summary { get; set; } = string.Empty;
        public List<DispatchPlanLine> lines { get; set; } = [];
        /// <summary>Shipments with no line, and why.</summary>
        public List<DispatchPlanSkip> unplanned { get; set; } = [];
        /// <summary>Drivers and vehicles that couldn't be used, and why, e.g. not marked available or a licence expired.</summary>
        public List<DispatchPlanLeftOut> leftOut { get; set; } = [];
        /// <summary>What could go wrong with the plan as a whole.</summary>
        public List<string> risks { get; set; } = [];
        public AiUsageResponse? usage { get; set; }
    }

    public class DispatchPlanLine
    {
        public Guid shipmentId { get; set; }
        public string shipment { get; set; } = string.Empty;
        public Guid driverId { get; set; }
        public string driver { get; set; } = string.Empty;
        public Guid vehicleId { get; set; }
        public string vehicle { get; set; } = string.Empty;
        public Guid originId { get; set; }
        public string origin { get; set; } = string.Empty;
        public Guid destinationId { get; set; }
        public string destination { get; set; } = string.Empty;
        /// <summary>UTC.</summary>
        public DateTime plannedPickupAt { get; set; }
        /// <summary>UTC.</summary>
        public DateTime plannedDeliveryAt { get; set; }
        /// <summary>Lines with the same trip are carried together on one vehicle, e.g. "Trip 1".</summary>
        public string trip { get; set; } = string.Empty;
        /// <summary>In kg; null when not recorded.</summary>
        public decimal? weight { get; set; }
        /// <summary>The vehicle's capacity in kg; null when not recorded.</summary>
        public decimal? capacity { get; set; }
        /// <summary>Why these picks, from the AI.</summary>
        public string why { get; set; } = string.Empty;
        /// <summary>What stops the line from being approved, e.g. the driver is busy then; empty when it can be.</summary>
        public List<string> problems { get; set; } = [];
        /// <summary>What to look at, e.g. it arrives before the receiver opens.</summary>
        public List<string> warnings { get; set; } = [];
    }

    public class DispatchPlanSkip
    {
        public Guid shipmentId { get; set; }
        public string shipment { get; set; } = string.Empty;
        public string why { get; set; } = string.Empty;
    }

    public class DispatchPlanLeftOut
    {
        /// <summary>driver or vehicle.</summary>
        public string kind { get; set; } = string.Empty;
        public string name { get; set; } = string.Empty;
        public string why { get; set; } = string.Empty;
    }
}
