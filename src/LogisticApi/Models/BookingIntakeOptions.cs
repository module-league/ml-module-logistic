namespace LogisticApi.Models
{
    /// <summary>The "BookingIntake" appsettings section: the AI that reads a booking email and its files into a new shipment. The key is Anthropic:ApiKey.</summary>
    public class BookingIntakeOptions
    {
        public const string SectionName = "BookingIntake";

        public string Model { get; set; } = "claude-haiku-5-5";

        /// <summary>low, medium or high: how hard the model thinks; higher reads messy scans and matches parties better and costs more.</summary>
        public string Effort { get; set; } = "medium";

        public int MaxTokens { get; set; } = 16000;

        /// <summary>The most files (PDF, JPG or PNG) one booking can bring.</summary>
        public int MaxFiles { get; set; } = 5;

        /// <summary>The most bytes those files may add up to; Claude takes up to 32 MB a request.</summary>
        public long MaxFileBytes { get; set; } = 20 * 1024 * 1024;

        /// <summary>The longest pasted email, in characters.</summary>
        public int MaxEmailChars { get; set; } = 20000;

        /// <summary>The most records of each linked table (parties, locations) sent to match against, newest kept.</summary>
        public int MaxCandidates { get; set; } = 300;
    }
}
