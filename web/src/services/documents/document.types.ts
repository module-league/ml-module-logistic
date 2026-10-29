declare global {
  type IDocumentStatus = "missing" | "uploaded" | "verified" | "rejected";
  type IDocumentSource = "upload" | "generated" | "driver_app" | "dispatcher";
  /** booked, the dispatch statuses in order, then billed. */
  type IDocumentStep = "booked" | IDispatchStatus | "billed";

  /** One required or filed document of a shipment (lg_shipment_document). Matches ShipmentDocumentResponse; times are UTC. */
  type IShipmentDocument = {
    /** Left out for one needed at a later step and not saved yet. */
    objId?: string;
    /** A type from the rules, or "other". */
    docType: string;
    title: string;
    status: IDocumentStatus;
    /** On the checklist now. */
    required: boolean;
    /** Its condition holds, but the shipment hasn't reached requiredAtStep. */
    upcoming: boolean;
    /** "Shipment Mode = Air" or "Always". */
    when?: string;
    requiredAtStep?: IDocumentStep;
    /** The step it gates. */
    blocks?: IDocumentStep;
    /** Asks for an expiry date when verified. */
    expires: boolean;
    /** The current version's file. */
    file?: IAttachment;
    version: number;
    source?: IDocumentSource;
    verifiedBy?: string;
    verifiedAt?: string;
    rejectReason?: string;
    expiresAt?: string;
    /** Verified, but past expiresAt, so it no longer counts. */
    expired: boolean;
    updatedAt?: string;
    versionNo: number;
  };

  /** A file of the shipment's attachment field or a checkpoint log that no document holds yet. */
  type IUnclassifiedFile = {
    file: IAttachment;
    origin: "record" | "checkpoint";
    /** The label it was given there, e.g. "Packing List". */
    label?: string;
    suggestedDocType?: string;
  };

  /** What one shipment needs at its stage and what it has. Matches ShipmentChecklistResponse. */
  type IShipmentChecklist = {
    shipmentId: string;
    dispatchId?: string;
    stage: IDocumentStep;
    mode?: string;
    /** The code, e.g. FCA. */
    incoterm?: string;
    /** On the checklist now, then needed later, then filed but not required ("other" last). */
    documents: IShipmentDocument[];
    unclassified: IUnclassifiedFile[];
    required: number;
    verified: number;
    /** The next step an unverified document gates. */
    blocks?: IDocumentStep;
  };

  type IDocumentActivity = {
    objId: string;
    documentId: string;
    kind: "uploaded" | "verified" | "rejected" | "removed";
    /** All zeros until sign-in is wired up. */
    actorId?: string;
    file?: IAttachment;
    version?: number;
    source?: IDocumentSource;
    body?: string;
    createdAt: string;
  };

  /** The document types and requirements of the API's workflow config ("Documents" in appsettings). */
  type IDocumentRules = {
    types: {
      docType: string;
      title: string;
      keywords: string[];
      expires: boolean;
    }[];
    requirements: {
      key: string;
      docType: string;
      when: string;
      requiredAtStep: IDocumentStep;
      blocks?: IDocumentStep;
    }[];
  };

  /** Which shipment fields the checklist reads; the mode is the exception rules' mode field. versionNo 0 until first saved. */
  type IDocumentSettings = {
    modeFieldId?: string;
    incotermFieldId?: string;
    attachmentFieldId?: string;
    versionNo: number;
  };

  type IDocumentSettingsInput = Omit<IDocumentSettings, "modeFieldId">;

  /** Files an unclassified file, or one uploaded with refId "documents", as the shipment's document of docType. */
  type IDocumentFile = {
    shipmentId: string;
    docType: string;
    attachmentId: string;
  };

  type IDocumentReviewVerdict = "looks_right" | "check" | "needs_person";
  type IDocumentReviewStatus = "match" | "mismatch" | "not_on_record";

  /** One value the AI read on the file, next to the shipment's. Matches DocumentReviewCheckResponse. */
  type IDocumentReviewCheck = {
    field: string;
    documentValue: string;
    /** Left out for a value the record has no field for. */
    recordValue?: string;
    status: IDocumentReviewStatus;
    /** Where on the file it was read, e.g. "Page 2 · totals row". */
    source: string;
  };

  /** The AI's read of one file checked against the shipment; a suggestion, nothing is saved. Matches DocumentReviewResponse. */
  type IDocumentReview = {
    shipmentId: string;
    attachmentId: string;
    fileName: string;
    /** A document type's docType, or "other". */
    docType: string;
    docTypeTitle: string;
    /** 0–100. */
    confidence: number;
    verdict: IDocumentReviewVerdict;
    verdictText: string;
    summary: string;
    /** Left out when the AI can't tell. */
    signed?: boolean;
    expiresOn?: string;
    checks: IDocumentReviewCheck[];
    usage: { model: string; inputTokens: number; outputTokens: number };
  };
}
