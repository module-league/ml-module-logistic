using System.Text.Json;
using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LogisticApi.Services
{
    /// <summary>The checkpoint log (lg_checkpoint_log) of a dispatch: notes and files posted on its timeline.</summary>
    public class CheckpointLogService(ContextDb db, IOptions<DispatchOptions> options)
    {
        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        /// <summary>Newest first.</summary>
        public async Task<List<CheckpointLogResponse>> ListAsync(Guid dispatchId, CancellationToken ct)
        {
            await EnsureDispatchAsync(dispatchId, ct);
            var logs = await db.CheckpointLogs
                .AsNoTracking()
                .Where(l => l.dispatchId == dispatchId)
                .OrderByDescending(l => l.DocId)
                .ToListAsync(ct);
            return logs.Select(CheckpointLogResponse.From).ToList();
        }

        /// <summary>
        /// Needs a note or a file. Each file must be uploaded for this dispatch, and its label one of the dispatch settings' attachment labels;
        /// its name, size and type come from the database.
        /// </summary>
        public async Task<CheckpointLogResponse> CreateAsync(Guid dispatchId, CheckpointLogRequest request, CancellationToken ct)
        {
            await EnsureDispatchAsync(dispatchId, ct);
            var note = string.IsNullOrWhiteSpace(request.note) ? null : request.note.Trim();
            var files = request.attachments.DistinctBy(a => a.id).ToList();
            var ids = files.Select(a => a.id!.Value).ToList();
            if (note is null && ids.Count == 0)
                throw ApiProblemException.BadRequest("Write a note or attach a file.");

            var refId = dispatchId.ToString();
            var found = ids.Count == 0
                ? []
                : await db.Attachments
                    .AsNoTracking()
                    .Where(a => a.refId == refId && ids.Contains(a.ObjId))
                    .ToDictionaryAsync(a => a.ObjId, ct);
            var missing = ids.Where(id => !found.ContainsKey(id)).Select(id => (Guid?)id).FirstOrDefault();
            if (missing is not null)
                throw ApiProblemException.BadRequest("Unknown attachment.", $"'{missing}' wasn't uploaded for this dispatch.");

            await CheckLabelsAsync(files.Select(a => a.optionId).OfType<Guid>().Distinct().ToList(), ct);

            var log = new CheckpointLog
            {
                ObjId = Guid.CreateVersion7(),
                dispatchId = dispatchId,
                note = note,
                internalOnly = request.internalOnly,
                attachments = JsonSerializer.Serialize(files.Select(a => AttachmentResponse.From(found[a.id!.Value], a.optionId)), Json),
            };
            db.CheckpointLogs.Add(log);
            await db.SaveChangesAsync(ct);
            return CheckpointLogResponse.From(log);
        }

        private async Task CheckLabelsAsync(List<Guid> labelIds, CancellationToken ct)
        {
            if (labelIds.Count == 0) return;
            var labelFieldId = await db.DispatchSettings
                .AsNoTracking()
                .Where(s => s.shipmentSidebarId == options.Value.ShipmentSidebarId)
                .Select(s => s.attachmentLabelFieldId)
                .FirstOrDefaultAsync(ct);
            var known = labelFieldId is null
                ? []
                : await db.SidebarFieldOptions
                    .AsNoTracking()
                    .Where(o => o.fieldObjId == labelFieldId)
                    .Select(o => o.ObjId)
                    .ToListAsync(ct);
            var unknown = labelIds.Where(id => !known.Contains(id)).Select(id => (Guid?)id).FirstOrDefault();
            if (unknown is not null)
                throw ApiProblemException.BadRequest("Unknown label.", $"'{unknown}' isn't one of the attachment labels in the dispatch settings.");
        }

        private async Task EnsureDispatchAsync(Guid dispatchId, CancellationToken ct)
        {
            if (!await db.Dispatches.AnyAsync(d => d.ObjId == dispatchId, ct))
                throw ApiProblemException.NotFound("Dispatch not found.");
        }
    }
}
