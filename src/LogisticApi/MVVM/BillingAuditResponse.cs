namespace LogisticApi.MVVM
{
    /// <summary>
    /// The AI's check of a ready shipment's charges against its proof of delivery, exceptions and checkpoints. A suggestion; nothing
    /// is saved until a person adds a line and creates the invoice. Matches IBillingAudit in web/src/services/billing/billing.types.ts.
    /// </summary>
    public class BillingAuditResponse
    {
        public Guid shipmentId { get; set; }
        /// <summary>The proof of delivery that was read.</summary>
        public string fileName { get; set; } = string.Empty;
        /// <summary>looks_right, or review when a finding changes the invoice.</summary>
        public string verdict { get; set; } = string.Empty;
        public string verdictText { get; set; } = string.Empty;
        /// <summary>What the AI made of it, in plain words.</summary>
        public string summary { get; set; } = string.Empty;
        public BillingAuditPodResponse pod { get; set; } = new();
        /// <summary>Those that change the invoice first.</summary>
        public List<BillingAuditFindingResponse> findings { get; set; } = [];
        public AiUsageResponse usage { get; set; } = new();
    }

    /// <summary>What the proof of delivery states, as printed; each left out when it doesn't say.</summary>
    public class BillingAuditPodResponse
    {
        public string? deliveredAt { get; set; }
        public string? receivedBy { get; set; }
        /// <summary>Left out when the AI can't tell.</summary>
        public bool? signed { get; set; }
        /// <summary>As written, e.g. "860 kg".</summary>
        public string? weight { get; set; }
        public string? pieces { get; set; }
        /// <summary>Handwritten or printed notes, e.g. "waited 1.5 h", "1 carton damaged".</summary>
        public string? remarks { get; set; }
    }

    /// <summary>One thing the audit found, with where it comes from.</summary>
    public class BillingAuditFindingResponse
    {
        /// <summary>add_charge (a line to add, priced), weight (the POD's weight differs), remove_charge (a quoted line to drop), check or ok.</summary>
        public string kind { get; set; } = string.Empty;
        public string title { get; set; } = string.Empty;
        public string detail { get; set; } = string.Empty;
        /// <summary>The document, exception or checkpoint it was read from, e.g. "POD remarks" or "EXC-0022".</summary>
        public string source { get; set; } = string.Empty;
        /// <summary>For add_charge: the line to add, priced by the API; the web sends it back as an extra line.</summary>
        public BillingLineResponse? line { get; set; }
        /// <summary>For add_charge: what to send as the extra line.</summary>
        public InvoiceExtraLineRequest? extraLine { get; set; }
        /// <summary>For remove_charge: the quoted line it means.</summary>
        public string? lineKey { get; set; }
    }
}
