namespace LogisticApi.Models
{
    /// <summary>
    /// The "DocumentReview" appsettings section: the AI that reads uploaded files and checks them against the shipment.
    /// The API key is not here; it comes from "Anthropic:ApiKey" (user-secrets in development) or ANTHROPIC_API_KEY.
    /// </summary>
    public class DocumentReviewOptions
    {
        public const string SectionName = "DocumentReview";

        /// <summary>The Claude model that reads the files.</summary>
        public string Model { get; set; } = "claude-haiku-5-5";

        /// <summary>low, medium or high: how hard the model thinks; higher reads hard scans better and costs more.</summary>
        public string Effort { get; set; } = "medium";

        public int MaxTokens { get; set; } = 16000;

        /// <summary>How far a number on the document may be from the record's and still match, in percent; as the weight mismatch rule.</summary>
        public decimal TolerancePercent { get; set; } = 5;

        /// <summary>Below this confidence (0–100) in the document type, the review asks a person instead of judging.</summary>
        public int MinConfidence { get; set; } = 60;
    }
}
