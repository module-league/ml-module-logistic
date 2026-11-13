namespace LogisticApi.MVVM
{
    /// <summary>A booking email and/or its files to read; at least one of them. Files are uploaded first with the shipment sidebar as refId.</summary>
    public class BookingIntakeRequest
    {
        public string? emailText { get; set; }
        public List<Guid> attachmentIds { get; set; } = [];
    }

    /// <summary>What the AI read from a booking, ready to fill the New record form. Nothing is saved.</summary>
    public class BookingIntakeResponse
    {
        /// <summary>One or two sentences on what the booking asks for.</summary>
        public string summary { get; set; } = string.Empty;
        /// <summary>Stored values by shipment field id, in the format the record API takes.</summary>
        public Dictionary<Guid, string> values { get; set; } = [];
        /// <summary>The same values as people read them, with where each came from, in field order.</summary>
        public List<BookingIntakeRow> rows { get; set; } = [];
        /// <summary>Names of the shipment fields left empty.</summary>
        public List<string> missing { get; set; } = [];
        /// <summary>Parties or places the booking names that aren't on file; add them by hand before linking.</summary>
        public List<BookingIntakeNotOnFile> notOnFile { get; set; } = [];
        /// <summary>What to check before creating, e.g. a value that didn't fit its field.</summary>
        public List<string> checks { get; set; } = [];
        /// <summary>A reply to the sender asking for what's missing.</summary>
        public BookingIntakeReply reply { get; set; } = new();
        public AiUsageResponse usage { get; set; } = new();
    }

    public class BookingIntakeRow
    {
        public Guid fieldId { get; set; }
        public string name { get; set; } = string.Empty;
        public string text { get; set; } = string.Empty;
        /// <summary>Where it was read, e.g. "email", "PO page 1".</summary>
        public string source { get; set; } = string.Empty;
    }

    public class BookingIntakeNotOnFile
    {
        public string field { get; set; } = string.Empty;
        /// <summary>The name and address as the booking gives them.</summary>
        public string text { get; set; } = string.Empty;
    }

    public class BookingIntakeReply
    {
        public string subject { get; set; } = string.Empty;
        public string message { get; set; } = string.Empty;
    }
}
