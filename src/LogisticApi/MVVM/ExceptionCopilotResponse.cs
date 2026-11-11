namespace LogisticApi.MVVM
{
    /// <summary>
    /// The AI's read of an exception: what happened, why, a new arrival time and what to do. A suggestion; nothing is saved until a
    /// person posts its note to the timeline. Matches IExceptionCopilot in web/src/services/exceptions/exception.types.ts.
    /// </summary>
    public class ExceptionCopilotResponse
    {
        public Guid exceptionId { get; set; }
        /// <summary>What happened, in plain words.</summary>
        public string summary { get; set; } = string.Empty;
        /// <summary>Left out when the AI can't tell from what the system knows.</summary>
        public string? cause { get; set; }
        /// <summary>low, medium or high: how sure it is of the cause.</summary>
        public string certainty { get; set; } = "low";
        /// <summary>A new expected arrival, as local time text, e.g. "31 Oct 2026 14:00"; left out when it can't estimate one.</summary>
        public string? eta { get; set; }
        /// <summary>How the eta was worked out.</summary>
        public string? etaBasis { get; set; }
        public List<ExceptionCopilotActionResponse> actions { get; set; } = [];
        /// <summary>One of the rule's resolve reasons, when the exception looks ready to close.</summary>
        public string? resolveWith { get; set; }
        /// <summary>What the AI needed but the system doesn't have, e.g. "The driver's location".</summary>
        public List<string> unknowns { get; set; } = [];
        /// <summary>The whole suggestion as one note, ready to post to the timeline.</summary>
        public string note { get; set; } = string.Empty;
        public AiUsageResponse usage { get; set; } = new();
    }

    public class ExceptionCopilotActionResponse
    {
        /// <summary>A short instruction, e.g. "Call the receiver".</summary>
        public string title { get; set; } = string.Empty;
        /// <summary>Why, and what to say or check.</summary>
        public string detail { get; set; } = string.Empty;
    }
}
