namespace LogisticApi.Models
{
    /// <summary>The "ExceptionCopilot" appsettings section: the AI that sums up an exception and suggests what to do. The key is Anthropic:ApiKey.</summary>
    public class ExceptionCopilotOptions
    {
        public const string SectionName = "ExceptionCopilot";

        public string Model { get; set; } = "claude-haiku-5-5";

        /// <summary>low, medium or high: how hard the model thinks; higher weighs long timelines better and costs more.</summary>
        public string Effort { get; set; } = "low";

        public int MaxTokens { get; set; } = 8000;

        /// <summary>The most checkpoint entries sent, newest kept, so a long dispatch doesn't grow the cost.</summary>
        public int MaxCheckpoints { get; set; } = 30;
    }
}
