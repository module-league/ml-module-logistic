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

    /// <summary>Fills a draft of a document whose requirement can be generated, from the shipment and its locations.</summary>
    public class DocumentGenerateRequest
    {
        [Required]
        public Guid? shipmentId { get; set; }

        [Required, MaxLength(40)]
        public string? docType { get; set; }
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

    /// <summary>Which fields the checklist reads. Send the versionNo you last read, 0 for the first save.</summary>
    public class DocumentSettingsRequest
    {
        public Guid? incotermFieldId { get; set; }
        public Guid? attachmentFieldId { get; set; }

        [Required]
        public int? versionNo { get; set; }
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
