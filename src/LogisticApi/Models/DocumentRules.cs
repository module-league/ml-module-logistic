using System.Text.Json;

namespace LogisticApi.Models
{
    /// <summary>
    /// The document checklist's types and requirements, kept as JSON in lg_document_setting.rules and edited in the Documents
    /// page's Rules dialog. Empty until someone adds a type: a shipment then has nothing on its checklist.
    /// </summary>
    public class DocumentRules
    {
        public const string EmptyJson = """{"types":[],"requirements":[]}""";

        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        public List<DocumentType> Types { get; set; } = [];
        public List<DocumentRequirement> Requirements { get; set; } = [];

        public DocumentType? Type(string docType) => Types.FirstOrDefault(t => t.DocType == docType);

        /// <summary>The rules a setting row holds; empty for no row or a blank column.</summary>
        public static DocumentRules Parse(string? json) =>
            string.IsNullOrWhiteSpace(json) ? new() : JsonSerializer.Deserialize<DocumentRules>(json, Json) ?? new();

        public string ToJson() => JsonSerializer.Serialize(this, Json);
    }

    /// <summary>A kind of paper, e.g. an air waybill.</summary>
    public class DocumentType
    {
        public string DocType { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        /// <summary>Words in a file's name or label that suggest this type, e.g. "awb".</summary>
        public List<string> Keywords { get; set; } = [];
        /// <summary>Asks for an expiry date when verified, e.g. permits and certificates.</summary>
        public bool Expires { get; set; }
    }

    /// <summary>
    /// When a shipment needs a document type. When maps a role (mode, incoterm) to the values that need it, e.g. { "mode": ["Air"] };
    /// empty means always. A value matches an option equal to it or starting with it, so "FCA" matches "FCA (Free Carrier)".
    /// </summary>
    public class DocumentRequirement
    {
        public string Key { get; set; } = string.Empty;
        public string DocType { get; set; } = string.Empty;
        public Dictionary<string, List<string>> When { get; set; } = [];
        /// <summary>The step (DocumentSteps.All) from which it's on the checklist.</summary>
        public string RequiredAtStep { get; set; } = DocumentSteps.Booked;
        /// <summary>The step it gates: the shipment can't reach it until the document is verified. Null gates nothing.</summary>
        public string? Blocks { get; set; }
    }

    /// <summary>The steps a shipment goes through: booked, then its dispatch's Flow, then billed.</summary>
    public static class DocumentSteps
    {
        public const string Booked = "booked";
        public const string Billed = "billed";
        public const string Mode = "mode";
        public const string Incoterm = "incoterm";
        public static readonly string[] All = [Booked, .. Dispatch.Flow, Billed];
        public static readonly string[] Roles = [Mode, Incoterm];

        public static int IndexOf(string step) => Array.IndexOf(All, step);

        /// <summary>Where a shipment is: its dispatch's status, or booked without an open one.</summary>
        public static string Of(Dispatch? dispatch) => dispatch is null || dispatch.status == Dispatch.Cancelled ? Booked : dispatch.status;
    }
}
