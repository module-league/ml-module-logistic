using ModuleLeague.Core.Entities;

namespace LogisticApi.Models
{
    /// <summary>
    /// One required or uploaded document of a shipment (lg_shipment_document). A shipment has one per document type, plus any number
    /// classified as Other. Older versions stay in its activity; only the current attachment counts, and only once verified.
    /// </summary>
    public class ShipmentDocument : MLEntityBase
    {
        public const string Missing = "missing";
        public const string Uploaded = "uploaded";
        public const string Verified = "verified";
        public const string Rejected = "rejected";
        public static readonly string[] Statuses = [Missing, Uploaded, Verified, Rejected];

        public const string Upload = "upload";
        // Drafts from the retired "Generate from record"; kept so documents and history saved with it stay valid
        public const string Generated = "generated";
        public const string DriverApp = "driver_app";
        public const string Dispatcher = "dispatcher";
        public static readonly string[] Sources = [Upload, Generated, DriverApp, Dispatcher];

        /// <summary>The doc type of a file that isn't a required paper; it's only kept so the file leaves the unclassified list.</summary>
        public const string Other = "other";

        public Guid shipmentId { get; set; }
        /// <summary>The dispatch it belongs to, for papers needed from the dispatch on, e.g. the proof of delivery.</summary>
        public Guid? dispatchId { get; set; }
        /// <summary>A DocumentType.DocType, or Other.</summary>
        public string docType { get; set; } = string.Empty;
        public string status { get; set; } = Missing;
        public Guid? currentAttachmentId { get; set; }
        /// <summary>0 while missing; each new file adds 1.</summary>
        public int version { get; set; }
        /// <summary>Where the current file came from; null while missing.</summary>
        public string? source { get; set; }
        public Guid? verifiedBy { get; set; }
        public DateTime? verifiedAt { get; set; }
        public string? rejectReason { get; set; }
        /// <summary>UTC; an expired document no longer counts as verified, e.g. a permit.</summary>
        public DateTime? expiresAt { get; set; }

        public bool IsVerified(DateTime now) => status == Verified && (expiresAt is null || expiresAt > now);
    }

    /// <summary>Something that happened to a document: a file added or removed, a verify or a reject. File entries keep every version.</summary>
    public class DocumentActivity : MLEntityBase
    {
        public const string Uploaded = "uploaded";
        public const string Verified = "verified";
        public const string Rejected = "rejected";
        public const string Removed = "removed";
        public static readonly string[] Kinds = [Uploaded, Verified, Rejected, Removed];

        public Guid documentId { get; set; }
        /// <summary>Kept so a shipment's used files are found without joining its documents.</summary>
        public Guid shipmentId { get; set; }
        public string kind { get; set; } = Uploaded;
        public Guid? actorId { get; set; }
        /// <summary>The file and version an upload added.</summary>
        public Guid? attachmentId { get; set; }
        public int? version { get; set; }
        public string? source { get; set; }
        public string? body { get; set; }
    }

    /// <summary>Which shipment fields the checklist reads besides the mode (lg_exception_setting), one row per shipment sidebar.</summary>
    public class DocumentSetting : MLEntityBase
    {
        public string shipmentSidebarId { get; set; } = string.Empty;
        /// <summary>A single select field, e.g. FCA or DAP.</summary>
        public Guid? incotermFieldId { get; set; }
        /// <summary>An attachment field whose files wait in the unclassified list.</summary>
        public Guid? attachmentFieldId { get; set; }
    }
}
