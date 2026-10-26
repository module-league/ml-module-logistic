namespace LogisticApi.Models
{
    /// <summary>The "ExceptionRules" appsettings section: the workflow config of the exception rules (v1).</summary>
    public class ExceptionRuleOptions
    {
        public const string SectionName = "ExceptionRules";

        /// <summary>IANA zone the operating hours and date-only ETAs are in, e.g. "Asia/Kuala_Lumpur".</summary>
        public string TimeZone { get; set; } = "UTC";

        public List<ExceptionRule> Rules { get; set; } = [];

        public ExceptionRule? Find(string ruleKey) => Rules.FirstOrDefault(r => r.RuleKey == ruleKey);
    }

    /// <summary>
    /// One rule. Its condition is coded per RuleKey in ExceptionRuleEngine; When describes it for people. Manual rules are only
    /// raised by hand (e.g. a failed delivery attempt) and never auto-close.
    /// </summary>
    public class ExceptionRule
    {
        public string RuleKey { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string When { get; set; } = string.Empty;
        public string Type { get; set; } = "other";
        public string Severity { get; set; } = "medium";
        public int SlaMinutes { get; set; } = 60;
        /// <summary>How long after the condition first holds before it opens.</summary>
        public int GracePeriodMinutes { get; set; }
        public bool AutoClose { get; set; } = true;
        public bool IsActive { get; set; } = true;
        public bool Manual { get; set; }
        /// <summary>The weight rule's allowed difference, in percent.</summary>
        public decimal? TolerancePercent { get; set; }
        /// <summary>Reasons offered when resolving one, besides False alarm.</summary>
        public List<string> Reasons { get; set; } = [];
    }
}
