using System.Text.Json;
using System.Text.RegularExpressions;
using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LogisticApi.Services
{
    /// <summary>A requirement whose condition holds for a shipment, with its document; the document is null until the list first saves it.</summary>
    public sealed record ChecklistItem(DocumentRequirement Requirement, DocumentType Type, string When, ShipmentDocument? Document);

    /// <summary>A file of the shipment's attachment field or of its dispatches' checkpoint logs that no document holds yet.</summary>
    public sealed record UnclassifiedFile(AttachmentResponse File, string Origin, string? Label, string? SuggestedDocType);

    /// <summary>What one shipment needs, at the stage it's at, and what it has.</summary>
    public sealed class Checklist
    {
        public required RecordRow Shipment { get; init; }
        /// <summary>Its latest dispatch that isn't cancelled.</summary>
        public Dispatch? Dispatch { get; init; }
        public required string Stage { get; init; }
        public string? Mode { get; init; }
        /// <summary>The code, e.g. FCA.</summary>
        public string? Incoterm { get; init; }
        /// <summary>Every requirement whose condition holds, at any step; one per doc type.</summary>
        public required List<ChecklistItem> Matching { get; init; }
        public required List<ShipmentDocument> Documents { get; init; }
        public List<UnclassifiedFile> Unclassified { get; init; } = [];

        /// <summary>The requirements on the checklist now: the stage reached the step each one is needed from.</summary>
        public IEnumerable<ChecklistItem> Items => Matching.Where(i => Step(i.Requirement.RequiredAtStep) <= Step(Stage));

        /// <summary>The unverified ones that gate a step after from, up to and including to.</summary>
        public List<ChecklistItem> Blocking(string from, string to, DateTime now) =>
            Matching
                .Where(i => i.Requirement.Blocks is { } gate
                    && Step(gate) > Step(from) && Step(gate) <= Step(to)
                    && Step(i.Requirement.RequiredAtStep) <= Step(to)
                    && i.Document?.IsVerified(now) != true)
                .ToList();

        /// <summary>The next step an unverified document gates, e.g. picked_up; null when nothing ahead is gated.</summary>
        public string? NextGate(DateTime now) =>
            Blocking(Stage, DocumentSteps.Billed, now).Select(i => i.Requirement.Blocks!).MinBy(Step);

        private static int Step(string step) => DocumentSteps.IndexOf(step);
    }

    /// <summary>
    /// Builds each shipment's checklist from the document rules saved in lg_document_setting: the requirements whose condition holds
    /// for its mode and Incoterm, the stage its dispatch reached, its documents and, when asked, the files waiting to be classified.
    /// </summary>
    public class DocumentChecklistService(ContextDb db, IOptions<DispatchOptions> dispatchOptions)
    {
        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
        private readonly DispatchOptions sources = dispatchOptions.Value;

        /// <summary>The fields the checklist reads, the labels of their options, and the document types and requirements.</summary>
        public sealed record Roles(
            Guid? ModeFieldId,
            Guid? IncotermFieldId,
            Guid? AttachmentFieldId,
            Dictionary<string, string> Names,
            Dictionary<Guid, string> Options,
            DocumentRules Rules);

        public async Task<Roles> RolesAsync(CancellationToken ct)
        {
            var modeFieldId = await db.ExceptionSettings
                .AsNoTracking()
                .Where(s => s.shipmentSidebarId == sources.ShipmentSidebarId)
                .Select(s => s.modeFieldId)
                .FirstOrDefaultAsync(ct);
            var setting = await db.DocumentSettings.AsNoTracking().FirstOrDefaultAsync(s => s.shipmentSidebarId == sources.ShipmentSidebarId, ct);
            Guid?[] ids = [modeFieldId, setting?.incotermFieldId, setting?.attachmentFieldId];
            var fieldIds = ids.OfType<Guid>().ToList();
            var names = await db.SidebarFields
                .AsNoTracking()
                .Where(f => fieldIds.Contains(f.ObjId))
                .ToDictionaryAsync(f => f.ObjId, f => f.sidebarName, ct);
            var labels = await db.SidebarFieldOptions
                .AsNoTracking()
                .Where(o => fieldIds.Contains(o.fieldObjId))
                .ToDictionaryAsync(o => o.ObjId, o => o.value, ct);
            return new Roles(
                modeFieldId,
                setting?.incotermFieldId,
                setting?.attachmentFieldId,
                new()
                {
                    [DocumentSteps.Mode] = names.GetValueOrDefault(modeFieldId ?? Guid.Empty) ?? "Mode",
                    [DocumentSteps.Incoterm] = names.GetValueOrDefault(setting?.incotermFieldId ?? Guid.Empty) ?? "Incoterm",
                },
                labels,
                DocumentRules.Parse(setting?.rules));
        }

        /// <summary>"Shipment Mode = Air", "Incoterm = DAP / DDP" or "Always".</summary>
        public static string WhenText(DocumentRequirement requirement, Roles roles) =>
            requirement.When.Count == 0
                ? "Always"
                : string.Join(", ", requirement.When.Select(w => $"{roles.Names.GetValueOrDefault(w.Key) ?? w.Key} = {string.Join(" / ", w.Value)}"));

        /// <summary>The checklists of the shipments asked for, or of every shipment.</summary>
        public async Task<Dictionary<Guid, Checklist>> BuildAsync(CancellationToken ct, ICollection<Guid>? shipmentIds = null, bool withFiles = false)
        {
            var now = DateTime.UtcNow;
            var roles = await RolesAsync(ct);
            var shipments = await RecordRow.LoadAsync(db, sources.ShipmentSidebarId, ct, shipmentIds);
            var ids = shipments.Select(s => s.Id).ToList();
            var dispatches = await db.Dispatches
                .AsNoTracking()
                .Where(d => ids.Contains(d.shipmentId))
                .OrderByDescending(d => d.DocId)
                .ToListAsync(ct);
            var documents = (await db.ShipmentDocuments
                    .AsNoTracking()
                    .Where(d => ids.Contains(d.shipmentId))
                    .OrderBy(d => d.DocId)
                    .ToListAsync(ct))
                .ToLookup(d => d.shipmentId);

            ILookup<Guid, UnclassifiedFile> files = Array.Empty<UnclassifiedFile>().ToLookup(_ => Guid.Empty);
            if (withFiles) files = await UnclassifiedAsync(shipments, dispatches, roles, ct);

            return shipments.ToDictionary(s => s.Id, shipment =>
            {
                var dispatch = dispatches.FirstOrDefault(d => d.shipmentId == shipment.Id && d.status != Dispatch.Cancelled);
                var mode = Label(shipment, roles.ModeFieldId, roles);
                var incoterm = Label(shipment, roles.IncotermFieldId, roles);
                var held = documents[shipment.Id].ToList();
                var matching = roles.Rules.Requirements
                    .Where(r => roles.Rules.Type(r.DocType) is not null && Matches(r, mode, incoterm))
                    .DistinctBy(r => r.DocType)
                    .Select(r => new ChecklistItem(r, roles.Rules.Type(r.DocType)!, WhenText(r, roles), held.FirstOrDefault(d => d.docType == r.DocType)))
                    .ToList();
                return new Checklist
                {
                    Shipment = shipment,
                    Dispatch = dispatch,
                    Stage = DocumentSteps.Of(dispatch),
                    Mode = mode,
                    Incoterm = incoterm is null ? null : CodeOf(incoterm),
                    Matching = matching,
                    Documents = held,
                    Unclassified = files[shipment.Id].ToList(),
                };
            });
        }

        /// <summary>The type whose keywords appear in the file's label or name, e.g. "Packing List" or "AWB-123.pdf".</summary>
        public static string? Suggest(DocumentRules rules, string? label, string fileName)
        {
            var words = Regex.Split($"{label} {Path.GetFileNameWithoutExtension(fileName)}".ToLowerInvariant(), "[^a-z0-9]+")
                .Where(w => w.Length > 0)
                .ToList();
            var text = $" {string.Join(' ', words)} ";
            return rules.Types
                .FirstOrDefault(t => t.Keywords.Any(k => text.Contains($" {k.ToLowerInvariant()} ")))
                ?.DocType;
        }

        private async Task<ILookup<Guid, UnclassifiedFile>> UnclassifiedAsync(List<RecordRow> shipments, List<Dispatch> dispatches, Roles roles, CancellationToken ct)
        {
            var ids = shipments.Select(s => s.Id).ToList();
            var used = (await db.DocumentActivities
                    .AsNoTracking()
                    .Where(a => ids.Contains(a.shipmentId) && a.attachmentId != null)
                    .Select(a => a.attachmentId!.Value)
                    .ToListAsync(ct))
                .ToHashSet();
            var dispatchIds = dispatches.Select(d => d.ObjId).ToList();
            var shipmentOf = dispatches.ToDictionary(d => d.ObjId, d => d.shipmentId);
            var logs = await db.CheckpointLogs
                .AsNoTracking()
                .Where(l => dispatchIds.Contains(l.dispatchId) && l.attachments != "[]")
                .OrderBy(l => l.DocId)
                .Select(l => new { l.dispatchId, l.attachments })
                .ToListAsync(ct);

            var fromRecords = shipments.SelectMany(s =>
                (s.Read<List<AttachmentResponse>>(roles.AttachmentFieldId) ?? [])
                    .Select(f => (shipmentId: s.Id, file: f, origin: "record", label: f.optionId is { } option ? roles.Options.GetValueOrDefault(option) : null)));
            var fromLogs = logs.SelectMany(l =>
                (JsonSerializer.Deserialize<List<CheckpointAttachmentResponse>>(l.attachments, Json) ?? [])
                    .Select(f => (shipmentId: shipmentOf[l.dispatchId], file: (AttachmentResponse)f, origin: "checkpoint", label: f.label)));
            return fromRecords
                .Concat(fromLogs)
                .Where(f => !used.Contains(f.file.id))
                .DistinctBy(f => f.file.id)
                .ToLookup(f => f.shipmentId, f => new UnclassifiedFile(f.file, f.origin, f.label, Suggest(roles.Rules, f.label, f.file.name)));
        }

        /// <summary>Every role in the condition must have one of its values.</summary>
        private static bool Matches(DocumentRequirement requirement, string? mode, string? incoterm) =>
            requirement.When.All(w =>
            {
                var label = w.Key switch
                {
                    DocumentSteps.Mode => mode,
                    DocumentSteps.Incoterm => incoterm,
                    _ => null,
                };
                return label is not null && w.Value.Any(v => string.Equals(v, label, StringComparison.OrdinalIgnoreCase) || string.Equals(v, CodeOf(label), StringComparison.OrdinalIgnoreCase));
            });

        private static string? Label(RecordRow shipment, Guid? fieldId, Roles roles) =>
            Guid.TryParse(shipment.Value(fieldId), out var option) ? roles.Options.GetValueOrDefault(option) : null;

        /// <summary>"FCA" from "FCA (Free Carrier)".</summary>
        private static string CodeOf(string label) => Regex.Match(label, "^[A-Za-z0-9]+").Value is { Length: > 0 } code ? code : label;
    }
}
