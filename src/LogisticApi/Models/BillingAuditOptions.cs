namespace LogisticApi.Models
{
    /// <summary>The "BillingAudit" appsettings section: the AI that checks a ready shipment's charges before it's invoiced. The key is Anthropic:ApiKey.</summary>
    public class BillingAuditOptions
    {
        public const string SectionName = "BillingAudit";

        public string Model { get; set; } = "claude-haiku-5-5";

        /// <summary>low, medium or high: how hard the model thinks; higher reads hard scans and long timelines better and costs more.</summary>
        public string Effort { get; set; } = "medium";

        public int MaxTokens { get; set; } = 16000;

        /// <summary>How far the weight on the POD may be from the record's and still pass, in percent; the weight mismatch rule's tolerance when it has one.</summary>
        public decimal WeightTolerancePercent { get; set; } = 5;

        /// <summary>The most checkpoint entries sent, newest kept.</summary>
        public int MaxCheckpoints { get; set; } = 30;
    }
}
