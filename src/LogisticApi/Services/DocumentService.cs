using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using ModuleLeague.Core.Abstractions;

namespace LogisticApi.Services
{
    /// <summary>
    /// Shipment documents (lg_shipment_document) and their activity (lg_document_activity): the checklist of each shipment, filing
    /// files as documents (each a new version), generating drafts, and verifying or rejecting them. Every change reruns the exception
    /// rules, so Missing document and POD not verified close themselves once the papers are verified.
    /// </summary>
    public class DocumentService(
        ContextDb db,
        ICurrentUser currentUser,
        DocumentChecklistService checklists,
        AttachmentService attachments,
        ExceptionRuleEngine engine,
        RecordTextService texts,
        IOptions<DispatchOptions> dispatchOptions)
    {
        /// <summary>The refId of files uploaded straight onto a document instead of into the shipment's attachment field.</summary>
        public const string RefId = "documents";

        private readonly DispatchOptions sources = dispatchOptions.Value;
        private DocumentOptions Config => checklists.Config;

        /// <summary>Every shipment's checklist. Saves a missing document for each requirement the checklist gained since.</summary>
        public Task<List<ShipmentChecklistResponse>> ListAsync(CancellationToken ct) => ResponsesAsync(null, ct);

        public async Task<DocumentRulesResponse> RulesAsync(CancellationToken ct)
        {
            var roles = await checklists.RolesAsync(ct);
            return new DocumentRulesResponse
            {
                types = Config.Types.Select(t => new DocumentTypeResponse { docType = t.DocType, title = t.Title, keywords = t.Keywords, expires = t.Expires }).ToList(),
                requirements = Config.Requirements.Select(r => new DocumentRequirementResponse
                {
                    key = r.Key,
                    docType = r.DocType,
                    when = DocumentChecklistService.WhenText(r, roles),
                    requiredAtStep = r.RequiredAtStep,
                    blocks = r.Blocks,
                    canGenerate = r.CanGenerate,
                }).ToList(),
            };
        }

        /// <summary>Oldest first.</summary>
        public async Task<List<DocumentActivityResponse>> ActivityAsync(Guid objId, CancellationToken ct)
        {
            if (!await db.ShipmentDocuments.AnyAsync(d => d.ObjId == objId, ct))
                throw ApiProblemException.NotFound("Document not found.");
            var activity = await db.DocumentActivities.AsNoTracking().Where(a => a.documentId == objId).OrderBy(a => a.DocId).ToListAsync(ct);
            var files = await FilesAsync(activity.Select(a => a.attachmentId), ct);
            return activity.Select(a => new DocumentActivityResponse
            {
                objId = a.ObjId,
                documentId = a.documentId,
                kind = a.kind,
                actorId = a.actorId,
                file = a.attachmentId is { } id ? files.GetValueOrDefault(id) : null,
                version = a.version,
                source = a.source,
                body = a.body,
                createdAt = ExceptionResponse.Utc(a.CreateTime),
            }).ToList();
        }

        /// <summary>Files an unclassified file, or one uploaded for documents, as the shipment's document of docType.</summary>
        public async Task<ShipmentChecklistResponse> FileAsync(DocumentFileRequest request, CancellationToken ct)
        {
            var attachmentId = request.attachmentId!.Value;
            var checklist = await ChecklistAsync(request.shipmentId!.Value, ct);
            CheckDocType(request.docType!);
            var attachment = await db.Attachments.AsNoTracking().FirstOrDefaultAsync(a => a.ObjId == attachmentId, ct)
                ?? throw ApiProblemException.BadRequest("Unknown attachment.");
            if (await db.DocumentActivities.AnyAsync(a => a.attachmentId == attachmentId, ct))
                throw ApiProblemException.Conflict("That file is already filed.", "Each file can be one document only; reload to see where it went.");

            var waiting = checklist.Unclassified.FirstOrDefault(f => f.File.id == attachmentId);
            if (waiting is null && attachment.refId != RefId)
                throw ApiProblemException.BadRequest("Unknown attachment.", "Pick one of the shipment's unclassified files, or upload one for documents.");
            var source = waiting?.Origin == "checkpoint" ? ShipmentDocument.Dispatcher : ShipmentDocument.Upload;
            await AddVersionAsync(checklist, request.docType!, attachment, source, ct);
            return await ResponseAsync(checklist.Shipment.Id, ct);
        }

        /// <summary>Fills a PDF draft from the shipment and its origin and destination, and files it as a new version to check and verify.</summary>
        public async Task<ShipmentChecklistResponse> GenerateAsync(DocumentGenerateRequest request, CancellationToken ct)
        {
            var checklist = await ChecklistAsync(request.shipmentId!.Value, ct);
            var item = checklist.Matching.FirstOrDefault(i => i.Requirement.DocType == request.docType && i.Requirement.CanGenerate)
                ?? throw ApiProblemException.BadRequest("This document can't be generated for this shipment.", "Upload it instead.");
            var (shipmentTitle, pdf) = await DraftAsync(checklist, item.Type, ct);
            var fileName = $"{item.Type.Title.Replace(' ', '-')}-{shipmentTitle}-draft.pdf";
            var attachment = await attachments.SaveAsync(RefId, fileName, "application/pdf", new MemoryStream(pdf), pdf.Length, ct);
            await AddVersionAsync(checklist, item.Type.DocType, attachment, ShipmentDocument.Generated, ct);
            return await ResponseAsync(checklist.Shipment.Id, ct);
        }

        public Task<ShipmentChecklistResponse> VerifyAsync(Guid objId, DocumentVerifyRequest request, CancellationToken ct) =>
            ChangeAsync(objId, request.versionNo!.Value, document =>
            {
                if (document.docType == ShipmentDocument.Other)
                    throw ApiProblemException.BadRequest("Other files aren't verified.", "Classify it as a document type first.");
                if (document.status != ShipmentDocument.Uploaded)
                    throw ApiProblemException.BadRequest(
                        document.status == ShipmentDocument.Missing ? "There's no file to verify yet." : $"It's already {document.status}.",
                        document.status == ShipmentDocument.Rejected ? "Upload a corrected version, then verify that." : null);
                var expiresAt = request.expiresAt?.UtcDateTime;
                if (expiresAt <= DateTime.UtcNow)
                    throw ApiProblemException.BadRequest("The expiry date has passed.", "Upload a document that's still valid.");
                document.status = ShipmentDocument.Verified;
                document.verifiedBy = currentUser.UserId;
                document.verifiedAt = DateTime.UtcNow;
                document.expiresAt = expiresAt;
                return (DocumentActivity.Verified, expiresAt is { } until
                    ? $"Verified version {document.version}, valid until {until:yyyy-MM-dd}."
                    : $"Verified version {document.version}.");
            }, ct);

        public Task<ShipmentChecklistResponse> RejectAsync(Guid objId, DocumentRejectRequest request, CancellationToken ct) =>
            ChangeAsync(objId, request.versionNo!.Value, document =>
            {
                var reason = string.IsNullOrWhiteSpace(request.reason)
                    ? throw ApiProblemException.BadRequest("Say why it's rejected.")
                    : request.reason.Trim();
                if (document.status is not (ShipmentDocument.Uploaded or ShipmentDocument.Verified) || document.docType == ShipmentDocument.Other)
                    throw ApiProblemException.BadRequest("There's no file to reject.");
                document.status = ShipmentDocument.Rejected;
                document.rejectReason = reason;
                document.verifiedBy = null;
                document.verifiedAt = null;
                document.expiresAt = null;
                return (DocumentActivity.Rejected, $"Rejected version {document.version}: {reason}");
            }, ct);

        public async Task<DocumentSettingsResponse> GetSettingsAsync(CancellationToken ct)
        {
            var roles = await checklists.RolesAsync(ct);
            var versionNo = await db.DocumentSettings
                .Where(s => s.shipmentSidebarId == sources.ShipmentSidebarId)
                .Select(s => s.VersionNo)
                .FirstOrDefaultAsync(ct);
            return Settings(roles, versionNo);
        }

        /// <summary>Adds the setting on the first save (versionNo 0) and replaces it after that.</summary>
        public async Task<DocumentSettingsResponse> SaveSettingsAsync(DocumentSettingsRequest request, CancellationToken ct)
        {
            var fields = await db.SidebarFields.AsNoTracking().Where(f => f.sidebarId == sources.ShipmentSidebarId).ToDictionaryAsync(f => f.ObjId, ct);
            void Check(Guid? id, string role, string type, string kind)
            {
                if (id is not { } fieldId) return;
                var field = fields.GetValueOrDefault(fieldId)
                    ?? throw ApiProblemException.BadRequest($"Unknown {role} field.", $"'{sources.ShipmentSidebarId}' has no field '{fieldId}'.");
                if (field.type != type)
                    throw ApiProblemException.BadRequest($"The {role} needs {kind} field.", $"'{field.sidebarName}' is a {field.type} field.");
            }
            Check(request.incotermFieldId, "Incoterm", "single_select", "a single select");
            Check(request.attachmentFieldId, "attachments", "attachment", "an attachment");

            var setting = await db.DocumentSettings.FirstOrDefaultAsync(s => s.shipmentSidebarId == sources.ShipmentSidebarId, ct);
            if (setting is null)
            {
                if (request.versionNo != 0) throw StaleSettings();
                setting = new DocumentSetting { ObjId = Guid.CreateVersion7(), shipmentSidebarId = sources.ShipmentSidebarId };
                db.DocumentSettings.Add(setting);
            }
            else
            {
                if (setting.VersionNo != request.versionNo) throw StaleSettings();
                db.Entry(setting).Property(s => s.VersionNo).OriginalValue = request.versionNo!.Value;
            }
            setting.incotermFieldId = request.incotermFieldId;
            setting.attachmentFieldId = request.attachmentFieldId;
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex) when (ex is DbUpdateConcurrencyException or DbUpdateException { InnerException: SqlException { Number: 2601 or 2627 } })
            {
                throw StaleSettings();
            }
            await engine.EvaluateAsync(ct);
            return Settings(await checklists.RolesAsync(ct), setting.VersionNo);
        }

        private static DocumentSettingsResponse Settings(DocumentChecklistService.Roles roles, int versionNo) => new()
        {
            modeFieldId = roles.ModeFieldId,
            incotermFieldId = roles.IncotermFieldId,
            attachmentFieldId = roles.AttachmentFieldId,
            versionNo = versionNo,
        };

        private async Task<Checklist> ChecklistAsync(Guid shipmentId, CancellationToken ct) =>
            (await checklists.BuildAsync(ct, [shipmentId], withFiles: true)).GetValueOrDefault(shipmentId)
            ?? throw ApiProblemException.BadRequest("Unknown shipment.", $"'{shipmentId}' isn't a record of '{sources.ShipmentSidebarId}'.");

        private void CheckDocType(string docType)
        {
            if (docType != ShipmentDocument.Other && Config.Type(docType) is null)
                throw ApiProblemException.BadRequest("Unknown document type.", $"Use one of {string.Join(", ", Config.Types.Select(t => t.DocType))} or {ShipmentDocument.Other}.");
        }

        /// <summary>Makes the file the document's current version and sets it back to Uploaded; the old file stays in its activity.</summary>
        private async Task AddVersionAsync(Checklist checklist, string docType, Attachment attachment, string source, CancellationToken ct)
        {
            var shipmentId = checklist.Shipment.Id;
            var document = docType == ShipmentDocument.Other
                ? null
                : await db.ShipmentDocuments.FirstOrDefaultAsync(d => d.shipmentId == shipmentId && d.docType == docType, ct);
            if (document is null)
            {
                document = new ShipmentDocument { ObjId = Guid.CreateVersion7(), shipmentId = shipmentId, docType = docType, dispatchId = DispatchFor(checklist, docType) };
                db.ShipmentDocuments.Add(document);
            }
            document.version += 1;
            document.currentAttachmentId = attachment.ObjId;
            document.status = ShipmentDocument.Uploaded;
            document.source = source;
            document.verifiedBy = null;
            document.verifiedAt = null;
            document.rejectReason = null;
            document.expiresAt = null;
            Log(document, DocumentActivity.Uploaded, $"Version {document.version}: {attachment.fileName}", attachment.ObjId);
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex) when (ex is DbUpdateConcurrencyException or DbUpdateException { InnerException: SqlException { Number: 2601 or 2627 } })
            {
                throw ApiProblemException.Conflict("Someone filed this document at the same time.", "Reload and try again.");
            }
            await engine.EvaluateAsync(ct);
        }

        /// <summary>Loads it, checks the version, applies the change and logs it.</summary>
        private async Task<ShipmentChecklistResponse> ChangeAsync(Guid objId, int versionNo, Func<ShipmentDocument, (string kind, string body)> apply, CancellationToken ct)
        {
            var document = await db.ShipmentDocuments.FirstOrDefaultAsync(d => d.ObjId == objId, ct)
                ?? throw ApiProblemException.NotFound("Document not found.");
            if (document.VersionNo != versionNo) throw Stale();
            db.Entry(document).Property(d => d.VersionNo).OriginalValue = versionNo;
            var (kind, body) = apply(document);
            Log(document, kind, body);
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                throw Stale();
            }
            await engine.EvaluateAsync(ct);
            return await ResponseAsync(document.shipmentId, ct);
        }

        private void Log(ShipmentDocument document, string kind, string body, Guid? attachmentId = null) =>
            db.DocumentActivities.Add(new DocumentActivity
            {
                ObjId = Guid.CreateVersion7(),
                documentId = document.ObjId,
                shipmentId = document.shipmentId,
                kind = kind,
                actorId = currentUser.UserId,
                attachmentId = attachmentId,
                version = attachmentId is null ? null : document.version,
                source = attachmentId is null ? null : document.source,
                body = body,
            });

        /// <summary>Papers needed from a dispatch step on, e.g. the proof of delivery, belong to its dispatch.</summary>
        private static Guid? DispatchFor(Checklist checklist, string docType) =>
            checklist.Matching.FirstOrDefault(i => i.Requirement.DocType == docType)?.Requirement.RequiredAtStep is { } step
            && DocumentSteps.IndexOf(step) > DocumentSteps.IndexOf(DocumentSteps.Booked)
                ? checklist.Dispatch?.ObjId
                : null;

        private async Task<ShipmentChecklistResponse> ResponseAsync(Guid shipmentId, CancellationToken ct) =>
            (await ResponsesAsync([shipmentId], ct)).Single();

        /// <summary>Saves a missing document for each requirement on a checklist that has none, then shapes the checklists.</summary>
        private async Task<List<ShipmentChecklistResponse>> ResponsesAsync(ICollection<Guid>? shipmentIds, CancellationToken ct)
        {
            var built = await checklists.BuildAsync(ct, shipmentIds, withFiles: true);
            var gained = built.Values
                .SelectMany(c => c.Items.Where(i => i.Document is null).Select(i => new ShipmentDocument
                {
                    ObjId = Guid.CreateVersion7(),
                    shipmentId = c.Shipment.Id,
                    docType = i.Type.DocType,
                    dispatchId = DispatchFor(c, i.Type.DocType),
                }))
                .ToList();
            if (gained.Count > 0)
            {
                db.ShipmentDocuments.AddRange(gained);
                try
                {
                    await db.SaveChangesAsync(ct);
                }
                // Another request saved them meanwhile
                catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
                {
                    db.ChangeTracker.Clear();
                }
                built = await checklists.BuildAsync(ct, shipmentIds, withFiles: true);
            }

            var now = DateTime.UtcNow;
            var files = await FilesAsync(built.Values.SelectMany(c => c.Documents.Select(d => d.currentAttachmentId)), ct);
            return built.Values.Select(c =>
            {
                var items = c.Items.ToList();
                var upcoming = c.Matching.Except(items).ToList();
                var asked = c.Matching.Select(i => i.Type.DocType).ToHashSet();
                ShipmentDocumentResponse Shape(ShipmentDocument? document, ChecklistItem? item, string docType)
                {
                    var type = Config.Type(docType);
                    return new ShipmentDocumentResponse
                    {
                        objId = document?.ObjId,
                        docType = docType,
                        title = type?.Title ?? "Other",
                        status = document?.status ?? ShipmentDocument.Missing,
                        required = item is not null && items.Contains(item),
                        upcoming = item is not null && upcoming.Contains(item),
                        when = item?.When,
                        requiredAtStep = item?.Requirement.RequiredAtStep,
                        blocks = item?.Requirement.Blocks,
                        canGenerate = item?.Requirement.CanGenerate ?? false,
                        expires = type?.Expires ?? false,
                        file = document?.currentAttachmentId is { } id ? files.GetValueOrDefault(id) : null,
                        version = document?.version ?? 0,
                        source = document?.source,
                        verifiedBy = document?.verifiedBy,
                        verifiedAt = ExceptionResponse.Utc(document?.verifiedAt),
                        rejectReason = document?.rejectReason,
                        expiresAt = ExceptionResponse.Utc(document?.expiresAt),
                        expired = document is { status: ShipmentDocument.Verified } && !document.IsVerified(now),
                        updatedAt = document is null ? null : ExceptionResponse.Utc(document.UpdateTime ?? document.CreateTime),
                        versionNo = document?.VersionNo ?? 0,
                    };
                }
                var extras = c.Documents
                    .Where(d => !asked.Contains(d.docType) && d.status != ShipmentDocument.Missing)
                    .OrderBy(d => d.docType == ShipmentDocument.Other);
                return new ShipmentChecklistResponse
                {
                    shipmentId = c.Shipment.Id,
                    dispatchId = c.Dispatch?.ObjId,
                    stage = c.Stage,
                    mode = c.Mode,
                    incoterm = c.Incoterm,
                    documents =
                    [
                        .. items.Concat(upcoming).Select(i => Shape(i.Document, i, i.Type.DocType)),
                        .. extras.Select(d => Shape(d, null, d.docType)),
                    ],
                    unclassified = c.Unclassified.Select(UnclassifiedFileResponse.From).ToList(),
                    required = items.Count,
                    verified = items.Count(i => i.Document?.IsVerified(now) == true),
                    blocks = c.NextGate(now),
                };
            }).ToList();
        }

        private async Task<Dictionary<Guid, AttachmentResponse>> FilesAsync(IEnumerable<Guid?> ids, CancellationToken ct)
        {
            var wanted = ids.OfType<Guid>().Distinct().ToList();
            return wanted.Count == 0
                ? []
                : await db.Attachments.AsNoTracking().Where(a => wanted.Contains(a.ObjId)).ToDictionaryAsync(a => a.ObjId, a => AttachmentResponse.From(a), ct);
        }

        /// <summary>The shipment's title and a PDF of its fields, then its origin's and destination's.</summary>
        private async Task<(string title, byte[] pdf)> DraftAsync(Checklist checklist, DocumentType type, CancellationToken ct)
        {
            var card = await db.DispatchSettings.AsNoTracking().FirstOrDefaultAsync(s => s.shipmentSidebarId == sources.ShipmentSidebarId, ct);
            var shipment = checklist.Shipment;
            var originId = checklist.Dispatch?.originId ?? shipment.Link(card?.originFieldId);
            var destinationId = checklist.Dispatch?.destinationId ?? shipment.Link(card?.destinationFieldId);
            Guid[] placeIds = [.. new[] { originId, destinationId }.OfType<Guid>()];
            var places = (await RecordRow.LoadAsync(db, sources.LocationSidebarId, ct, placeIds)).ToDictionary(r => r.Id);

            var (title, shipmentRows) = await texts.TextRowsAsync(sources.ShipmentSidebarId, shipment, ct, card?.titleFieldId);
            var (_, originRows) = await texts.TextRowsAsync(sources.LocationSidebarId, places.GetValueOrDefault(originId ?? Guid.Empty), ct);
            var (_, destinationRows) = await texts.TextRowsAsync(sources.LocationSidebarId, places.GetValueOrDefault(destinationId ?? Guid.Empty), ct);
            var pdf = PdfWriter.Pdf(
                $"{type.Title} - DRAFT",
                $"{title} · generated {texts.LocalNow:dd MMM yyyy HH:mm} ({texts.ZoneName})",
                [
                    new PdfWriter.Section("Shipment", shipmentRows),
                    new PdfWriter.Section("Shipper (origin)", originRows),
                    new PdfWriter.Section("Consignee (destination)", destinationRows),
                ],
                "Filled from the shipment record. Check every value against the original before verifying.");
            return (title, pdf);
        }

        private static ApiProblemException Stale() =>
            ApiProblemException.Conflict("The document was changed by someone else.", "Reload it and try again.");

        private static ApiProblemException StaleSettings() =>
            ApiProblemException.Conflict("The document settings were changed by someone else.", "Reload the page and change them again.");
    }
}
