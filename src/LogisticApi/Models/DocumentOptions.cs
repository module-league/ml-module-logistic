namespace LogisticApi.Models
{
    /// <summary>The "Documents" appsettings section: the workflow config of the document checklist (v1).</summary>
    public class DocumentOptions
    {
        public const string SectionName = "Documents";

        public List<DocumentType> Types { get; set; } = [];
        public List<DocumentRequirement> Requirements { get; set; } = [];

        public DocumentType? Type(string docType) => Types.FirstOrDefault(t => t.DocType == docType);
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
        /// <summary>Offers "Generate from record", filling a draft from the shipment and its locations.</summary>
        public bool CanGenerate { get; set; }
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
