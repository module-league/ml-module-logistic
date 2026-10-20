using System.Text.Json;
using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.EntityFrameworkCore;

namespace LogisticApi.Services
{
    /// <summary>The checkpoint log (lg_checkpoint_log) of a dispatch: notes and labelled files posted on its timeline.</summary>
    public class CheckpointLogService(ContextDb db)
    {
        private static readonly JsonSerializerOptions Json = CheckpointLogResponse.Json;

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

        /// <summary>Needs a note or a file. Each file must be uploaded for this dispatch; its name, size and type come from the database.</summary>
        public async Task<CheckpointLogResponse> CreateAsync(Guid dispatchId, CheckpointLogRequest request, CancellationToken ct)
        {
            await EnsureDispatchAsync(dispatchId, ct);
            var note = Clean(request.note);
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

            var log = new CheckpointLog
            {
                ObjId = Guid.CreateVersion7(),
                dispatchId = dispatchId,
                note = note,
                internalOnly = request.internalOnly,
                attachments = JsonSerializer.Serialize(
                    files.Select(a => CheckpointAttachmentResponse.From(found[a.id!.Value], Clean(a.label))), Json),
            };
            db.CheckpointLogs.Add(log);
            await db.SaveChangesAsync(ct);
            return CheckpointLogResponse.From(log);
        }

        /// <summary>Sets or clears the label of one file of a posted entry.</summary>
        public async Task<CheckpointLogResponse> UpdateLabelAsync(Guid dispatchId, Guid objId, Guid attachmentId, CheckpointLabelRequest request, CancellationToken ct)
        {
            var log = await db.CheckpointLogs
                .FirstOrDefaultAsync(l => l.ObjId == objId && l.dispatchId == dispatchId, ct)
                ?? throw ApiProblemException.NotFound("Checkpoint not found.");
            var files = JsonSerializer.Deserialize<List<CheckpointAttachmentResponse>>(log.attachments, Json) ?? [];
            var file = files.FirstOrDefault(f => f.id == attachmentId)
                ?? throw ApiProblemException.NotFound("Attachment not found.");

            file.label = Clean(request.label);
            log.attachments = JsonSerializer.Serialize(files, Json);
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                throw ApiProblemException.Conflict("The entry was changed by someone else.", "Reload it and change the label again.");
            }
            return CheckpointLogResponse.From(log);
        }

        private static string? Clean(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

        private async Task EnsureDispatchAsync(Guid dispatchId, CancellationToken ct)
        {
            if (!await db.Dispatches.AnyAsync(d => d.ObjId == dispatchId, ct))
                throw ApiProblemException.NotFound("Dispatch not found.");
        }
    }
}
