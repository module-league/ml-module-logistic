using LogisticApi.Models;
using LogisticApi.Services;

namespace LogisticApi.MVVM
{
    /// <summary>Matches IShipmentChecklist in web/src/services/documents/document.types.ts: what one shipment needs and has.</summary>
    public class ShipmentChecklistResponse
    {
        public Guid shipmentId { get; set; }
        public Guid? dispatchId { get; set; }
        /// <summary>booked, or its dispatch's status.</summary>
        public string stage { get; set; } = string.Empty;
        public string? mode { get; set; }
        /// <summary>The code, e.g. FCA.</summary>
        public string? incoterm { get; set; }
        /// <summary>On the checklist now, then needed at a later step, then filed but not required (Other last).</summary>
        public List<ShipmentDocumentResponse> documents { get; set; } = [];
        public List<UnclassifiedFileResponse> unclassified { get; set; } = [];
        /// <summary>How many documents on the checklist now are required, and how many of those are verified.</summary>
        public int required { get; set; }
        public int verified { get; set; }
        /// <summary>The next step an unverified document gates, e.g. picked_up or billed; null when nothing ahead is gated.</summary>
        public string? blocks { get; set; }
    }

    /// <summary>Matches IShipmentDocument. objId is left out for a document needed at a later step and not saved yet.</summary>
    public class ShipmentDocumentResponse
    {
        public Guid? objId { get; set; }
        public string docType { get; set; } = string.Empty;
        public string title { get; set; } = string.Empty;
        public string status { get; set; } = ShipmentDocument.Missing;
        /// <summary>On the checklist now.</summary>
        public bool required { get; set; }
        /// <summary>Its condition holds but the shipment hasn't reached requiredAtStep.</summary>
        public bool upcoming { get; set; }
        /// <summary>"Shipment Mode = Air" or "Always"; left out when no requirement asks for it.</summary>
        public string? when { get; set; }
        public string? requiredAtStep { get; set; }
        public string? blocks { get; set; }
        /// <summary>Asks for an expiry date when verified.</summary>
        public bool expires { get; set; }
        public AttachmentResponse? file { get; set; }
        public int version { get; set; }
        public string? source { get; set; }
        public Guid? verifiedBy { get; set; }
        public DateTime? verifiedAt { get; set; }
        public string? rejectReason { get; set; }
        public DateTime? expiresAt { get; set; }
        /// <summary>Verified, but past expiresAt, so it no longer counts.</summary>
        public bool expired { get; set; }
        public DateTime? updatedAt { get; set; }
        public int versionNo { get; set; }
    }

    /// <summary>Matches IUnclassifiedFile.</summary>
    public class UnclassifiedFileResponse
    {
        public AttachmentResponse file { get; set; } = new();
        /// <summary>record (the shipment's attachment field) or checkpoint (a dispatch's checkpoint log).</summary>
        public string origin { get; set; } = string.Empty;
        /// <summary>The label it was given there, e.g. "Packing List".</summary>
        public string? label { get; set; }
        /// <summary>The doc type its label or name suggests.</summary>
        public string? suggestedDocType { get; set; }

        public static UnclassifiedFileResponse From(UnclassifiedFile file) => new()
        {
            file = file.File,
            origin = file.Origin,
            label = file.Label,
            suggestedDocType = file.SuggestedDocType,
        };
    }

    /// <summary>Matches IDocumentActivity: a file added, a verify or a reject.</summary>
    public class DocumentActivityResponse
    {
        public Guid objId { get; set; }
        public Guid documentId { get; set; }
        public string kind { get; set; } = string.Empty;
        /// <summary>All zeros until sign-in is wired up.</summary>
        public Guid? actorId { get; set; }
        public AttachmentResponse? file { get; set; }
        public int? version { get; set; }
        public string? source { get; set; }
        public string? body { get; set; }
        public DateTime createdAt { get; set; }
    }

    /// <summary>Matches IDocumentRules: the document types and requirements from the workflow config.</summary>
    public class DocumentRulesResponse
    {
        public List<DocumentTypeResponse> types { get; set; } = [];
        public List<DocumentRequirementResponse> requirements { get; set; } = [];
    }

    public class DocumentTypeResponse
    {
        public string docType { get; set; } = string.Empty;
        public string title { get; set; } = string.Empty;
        public List<string> keywords { get; set; } = [];
        public bool expires { get; set; }
    }

    public class DocumentRequirementResponse
    {
        public string key { get; set; } = string.Empty;
        public string docType { get; set; } = string.Empty;
        public string when { get; set; } = string.Empty;
        public string requiredAtStep { get; set; } = string.Empty;
        public string? blocks { get; set; }
    }

    /// <summary>Matches IDocumentSettings; versionNo 0 until first saved. The mode is the exception rules' mode field.</summary>
    public class DocumentSettingsResponse
    {
        public Guid? modeFieldId { get; set; }
        public Guid? incotermFieldId { get; set; }
        public Guid? attachmentFieldId { get; set; }
        public int versionNo { get; set; }
    }

    /// <summary>What the AI read on a file and how it compares with the shipment record; a suggestion for a person to act on.</summary>
    public class DocumentReviewResponse
    {
        public Guid shipmentId { get; set; }
        public Guid attachmentId { get; set; }
        public string fileName { get; set; } = string.Empty;
        /// <summary>A document type's docType, or "other".</summary>
        public string docType { get; set; } = string.Empty;
        public string docTypeTitle { get; set; } = string.Empty;
        /// <summary>0–100, how sure the AI is of docType.</summary>
        public int confidence { get; set; }
        /// <summary>looks_right, check (something differs) or needs_person (the AI isn't sure what it is).</summary>
        public string verdict { get; set; } = string.Empty;
        public string verdictText { get; set; } = string.Empty;
        /// <summary>One sentence from the AI on what the document is.</summary>
        public string summary { get; set; } = string.Empty;
        /// <summary>Signed or stamped; null when the AI can't tell.</summary>
        public bool? signed { get; set; }
        /// <summary>An expiry date printed on it, as written.</summary>
        public string? expiresOn { get; set; }
        /// <summary>Each value the document states: the shipment's fields first, then ones the record doesn't have.</summary>
        public List<DocumentReviewCheckResponse> checks { get; set; } = [];
        public DocumentReviewUsageResponse usage { get; set; } = new();
    }

    public class DocumentReviewCheckResponse
    {
        public string field { get; set; } = string.Empty;
        public string documentValue { get; set; } = string.Empty;
        /// <summary>Null for a value the record has no field for.</summary>
        public string? recordValue { get; set; }
        /// <summary>match, mismatch, or not_on_record.</summary>
        public string status { get; set; } = string.Empty;
        /// <summary>Where on the document it was read, e.g. "Page 2 · totals row".</summary>
        public string source { get; set; } = string.Empty;
    }

    /// <summary>Tokens the review used, for working out what each document costs.</summary>
    public class DocumentReviewUsageResponse
    {
        public string model { get; set; } = string.Empty;
        public long inputTokens { get; set; }
        public long outputTokens { get; set; }
    }
}
