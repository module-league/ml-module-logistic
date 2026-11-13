namespace LogisticApi.Models
{
    /// <summary>The "CustomerUpdate" appsettings section: the AI that drafts a message to the customer about an exception. The key is Anthropic:ApiKey.</summary>
    public class CustomerUpdateOptions
    {
        public const string SectionName = "CustomerUpdate";

        public string Model { get; set; } = "claude-haiku-5-5";

        /// <summary>low, medium or high: how hard the model thinks; higher writes more carefully and costs more.</summary>
        public string Effort { get; set; } = "low";

        public int MaxTokens { get; set; } = 8000;

        /// <summary>The most checkpoint entries sent, newest kept; internal ones are never sent.</summary>
        public int MaxCheckpoints { get; set; } = 30;

        /// <summary>How many redelivery slots to offer, one a day from tomorrow at the receiver's opening time.</summary>
        public int SlotDays { get; set; } = 3;

        /// <summary>
        /// Days no slot is offered on, e.g. "Sunday"; the receivers' own closed days aren't recorded yet. Empty here because binding
        /// adds to a list rather than replacing it, so a default couldn't be taken out in appsettings.
        /// </summary>
        public List<DayOfWeek> ClosedDays { get; set; } = [];
    }
}
