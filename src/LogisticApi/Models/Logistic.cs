using ModuleLeague.Core.Entities;

namespace LogisticApi.Models
{
    public class Logistic: MLEntityBase
    {
        public string Id { get; set; } = string.Empty;
        public string TrackingNo { get; set; } = string.Empty;
        public string Origin { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
