using System.ComponentModel.DataAnnotations;

namespace LogisticApi.MVVM
{
    /// <summary>
    /// Files one attachment as the shipment's document of docType, as its new version: one of the shipment's unclassified files, or
    /// one uploaded with refId "documents". docType "other" just takes the file off the unclassified list.
    /// </summary>
    public class DocumentFileRequest
    {
        [Required]
        public Guid? shipmentId { get; set; }

        [Required, MaxLength(40)]
        public string? docType { get; set; }

        [Required]
        public Guid? attachmentId { get; set; }
    }

    /// <summary>Every verify or reject sends the versionNo last read; a stale one is rejected with 409.</summary>
    public class DocumentVerifyRequest
    {
        [Required]
        public int? versionNo { get; set; }

        /// <summary>When it stops counting, e.g. a permit's end date; in the future.</summary>
        public DateTimeOffset? expiresAt { get; set; }
    }

    public class DocumentRejectRequest
    {
        [Required]
        public int? versionNo { get; set; }

        [Required, MaxLength(500)]
        public string? reason { get; set; }
    }

    /// <summary>Which fields the checklist reads, and its rules when sent. Send the versionNo you last read, 0 for the first save.</summary>
    public class DocumentSettingsRequest
    {
        public Guid? incotermFieldId { get; set; }
        public Guid? attachmentFieldId { get; set; }

        /// <summary>The document types and requirements in full; left out keeps the saved ones.</summary>
        public DocumentRulesRequest? rules { get; set; }

        [Required]
        public int? versionNo { get; set; }
    }

    public class DocumentRulesRequest
    {
        [Required, MaxLength(50)]
        public List<DocumentTypeRequest>? types { get; set; }

        [Required, MaxLength(100)]
        public List<DocumentRequirementRequest>? requirements { get; set; }
    }

    public class DocumentTypeRequest
    {
        /// <summary>Lowercase letters, digits and underscores, e.g. air_waybill; never "other".</summary>
        [Required, MaxLength(40), RegularExpression("^[a-z0-9_]+$")]
        public string? docType { get; set; }

        [Required, MaxLength(80)]
        public string? title { get; set; }

        [MaxLength(20)]
        public List<string>? keywords { get; set; }

        public bool expires { get; set; }
    }

    public class DocumentRequirementRequest
    {
        [Required, MaxLength(60)]
        public string? key { get; set; }

        [Required, MaxLength(40)]
        public string? docType { get; set; }

        /// <summary>Role (mode, incoterm) to the values that need it; empty or left out means always.</summary>
        public Dictionary<string, List<string>>? condition { get; set; }

        [Required, MaxLength(40)]
        public string? requiredAtStep { get; set; }

        [MaxLength(40)]
        public string? blocks { get; set; }
    }

    /// <summary>Takes the current file off a document, which goes back to missing; send the versionNo last read.</summary>
    public class DocumentRemoveRequest
    {
        [Required]
        public int? versionNo { get; set; }
    }

    /// <summary>Has the AI read one of the shipment's files and check it against the shipment record. Nothing is saved.</summary>
    public class DocumentReviewRequest
    {
        [Required]
        public Guid? shipmentId { get; set; }

        [Required]
        public Guid? attachmentId { get; set; }
    }
}
