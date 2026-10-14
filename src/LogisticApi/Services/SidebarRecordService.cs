using System.Globalization;
using System.Text.Json;
using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.EntityFrameworkCore;

namespace LogisticApi.Services
{
    public class SidebarRecordService(ContextDb db)
    {
        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        public async Task<List<SidebarRecordResponse>> ListAsync(string sidebarId, CancellationToken ct)
        {
            var records = await db.SidebarRecords
                .AsNoTracking()
                .Where(r => r.sidebarId == sidebarId)
                .OrderByDescending(r => r.DocId)
                .ToListAsync(ct);
            return records.Select(ToResponse).ToList();
        }

        public async Task<SidebarRecordResponse> CreateAsync(string sidebarId, SidebarRecordCreateRequest request, CancellationToken ct)
        {
            var metadata = await BuildMetadataAsync(sidebarId, request.values, ct);
            var record = new SidebarRecord
            {
                ObjId = Guid.CreateVersion7(),
                sidebarId = sidebarId,
                //what the client sent, keep for auditing
                RawMetadata = JsonSerializer.Serialize(request.values, Json),
                Metadata = JsonSerializer.Serialize(metadata, Json),
            };
            db.SidebarRecords.Add(record);
            await db.SaveChangesAsync(ct);
            return ToResponse(record);
        }

        /// <summary>Replaces every value of the record; fields left out become empty. Send the versionNo you last read.</summary>
        public async Task<SidebarRecordResponse> UpdateAsync(string sidebarId, Guid objId, SidebarRecordUpdateRequest request, CancellationToken ct)
        {
            var record = await db.SidebarRecords
                .FirstOrDefaultAsync(r => r.ObjId == objId && r.sidebarId == sidebarId, ct)
                ?? throw ApiProblemException.NotFound("Record not found.");

            if (record.VersionNo != request.versionNo)
                throw StaleVersion();
            db.Entry(record).Property(r => r.VersionNo).OriginalValue = request.versionNo;

            var metadata = await BuildMetadataAsync(sidebarId, request.values, ct);
            record.RawMetadata = JsonSerializer.Serialize(request.values, Json);
            record.Metadata = JsonSerializer.Serialize(metadata, Json);

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                throw StaleVersion();
            }
            return ToResponse(record);
        }

        private async Task<List<SidebarRecordValue>> BuildMetadataAsync(string sidebarId, Dictionary<Guid, string?> values, CancellationToken ct)
        {
            var fields = await db.SidebarFields
                .AsNoTracking()
                .Include(f => f.options)
                .Where(f => f.sidebarId == sidebarId)
                .OrderBy(f => f.displayOrder)
                .ToListAsync(ct);
            var fieldIds = fields.Select(f => f.ObjId).ToHashSet();

            var unknown = values.Keys.Where(id => !fieldIds.Contains(id)).ToList();
            if (unknown.Count > 0)
                throw ApiProblemException.BadRequest("Unknown field.", $"Field '{unknown[0]}' isn't part of this sidebar.");

            var attachmentIds = fields
                .Where(f => f.type == "attachment")
                .ToDictionary(f => f.ObjId, f => ReadAttachmentIds(f, values.GetValueOrDefault(f.ObjId)));
            var wanted = attachmentIds.Values.SelectMany(ids => ids).Distinct().ToList();
            var attachments = wanted.Count == 0
                ? []
                : await db.Attachments
                    .AsNoTracking()
                    .Where(a => a.refId == sidebarId && wanted.Contains(a.ObjId))
                    .ToDictionaryAsync(a => a.ObjId, ct);

            return fields.Select(f => new SidebarRecordValue
            {
                fieldId = f.ObjId,
                type = f.type,
                value = attachmentIds.TryGetValue(f.ObjId, out var ids)
                    ? AttachmentsValue(f, ids, attachments)
                    : CleanValue(f, values.GetValueOrDefault(f.ObjId)),
            }).ToList();
        }

        /// <summary>The attachment ids in a value: a JSON array of attachment objects (or of bare ids), in order, without repeats.</summary>
        private static List<Guid> ReadAttachmentIds(SidebarField field, string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return [];
            var invalid = ApiProblemException.BadRequest("Invalid attachments.", $"'{field.sidebarName}' needs a list of uploaded attachments.");
            List<Guid> ids = [];
            try
            {
                using var json = JsonDocument.Parse(value);
                if (json.RootElement.ValueKind != JsonValueKind.Array) throw invalid;
                foreach (var item in json.RootElement.EnumerateArray())
                {
                    var text = item.ValueKind == JsonValueKind.Object && item.TryGetProperty("id", out var id)
                        ? id.GetString()
                        : item.ValueKind == JsonValueKind.String ? item.GetString() : null;
                    if (!Guid.TryParse(text, out var attachmentId)) throw invalid;
                    if (!ids.Contains(attachmentId)) ids.Add(attachmentId);
                }
            }
            catch (Exception error) when (error is JsonException or InvalidOperationException)
            {
                throw invalid;
            }
            return ids;
        }

        /// <summary>Stores each attachment's name, size and type from the database, not from what the client sent.</summary>
        private static string? AttachmentsValue(SidebarField field, List<Guid> ids, Dictionary<Guid, Attachment> attachments)
        {
            if (ids.Count == 0) return null;
            var missing = ids.Where(id => !attachments.ContainsKey(id)).Select(id => (Guid?)id).FirstOrDefault();
            if (missing is not null)
                throw ApiProblemException.BadRequest("Unknown attachment.", $"'{field.sidebarName}' has no uploaded attachment '{missing}'.");
            return JsonSerializer.Serialize(ids.Select(id => AttachmentResponse.From(attachments[id])), Json);
        }

        private static ApiProblemException StaleVersion() =>
            ApiProblemException.Conflict("Record was changed by someone else.", "Reload the record and apply your change again.");

        private static string? CleanValue(SidebarField field, string? value)
        {
            var text = value?.Trim();
            if (string.IsNullOrEmpty(text)) return null;

            switch (field.type)
            {
                case "number":
                case "currency":
                    if (!decimal.TryParse(text, NumberStyles.Number, CultureInfo.InvariantCulture, out var number))
                        throw ApiProblemException.BadRequest("Invalid number.", $"'{field.sidebarName}' needs a number.");
                    return number.ToString(CultureInfo.InvariantCulture);

                case "checkbox":
                    if (!bool.TryParse(text, out var ticked))
                        throw ApiProblemException.BadRequest("Invalid checkbox value.", $"'{field.sidebarName}' needs true or false.");
                    return ticked ? "true" : null;

                case "date":
                    if (FieldSettings.Read(field.settings).displayTime)
                    {
                        if (!DateTimeOffset.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var at))
                            throw ApiProblemException.BadRequest("Invalid date.", $"'{field.sidebarName}' needs a date and time.");
                        return at.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture);
                    }
                    if (!DateOnly.TryParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day))
                        throw ApiProblemException.BadRequest("Invalid date.", $"'{field.sidebarName}' needs a date like 2026-10-13.");
                    return day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

                case "member":
                    var memberIds = ReadMemberIds(field, text);
                    if (memberIds.Count == 0) return null;
                    if (FieldSettings.Read(field.settings).multipleMembers)
                        return JsonSerializer.Serialize(memberIds, Json);
                    if (memberIds.Count > 1)
                        throw ApiProblemException.BadRequest("Too many members.", $"'{field.sidebarName}' takes one person.");
                    return memberIds[0];

                case "single_select":
                    if (!Guid.TryParse(text, out var optionId) || field.options.All(o => o.ObjId != optionId))
                        throw ApiProblemException.BadRequest("Invalid option.", $"'{field.sidebarName}' has no such option.");
                    return optionId.ToString();

                case "multi_select":
                    var optionIds = ReadOptionIds(field, text);
                    return optionIds.Count == 0 ? null : JsonSerializer.Serialize(optionIds, Json);

                default:
                    if (text.Length > 1000)
                        throw ApiProblemException.BadRequest("Value too long.", $"'{field.sidebarName}' allows up to 1000 characters.");
                    return text;
            }
        }

        /// <summary>One option id, or a JSON array of them; each must be one of the field's options.</summary>
        private static List<string> ReadOptionIds(SidebarField field, string text)
        {
            List<string>? raw;
            try
            {
                raw = text.StartsWith('[') ? JsonSerializer.Deserialize<List<string>>(text, Json) : [text];
            }
            catch (JsonException)
            {
                raw = null;
            }
            if (raw is null)
                throw ApiProblemException.BadRequest("Invalid option.", $"'{field.sidebarName}' needs an option id or a list of option ids.");

            var ids = new List<string>();
            foreach (var item in raw)
            {
                if (!Guid.TryParse(item, out var id) || field.options.All(o => o.ObjId != id))
                    throw ApiProblemException.BadRequest("Invalid option.", $"'{field.sidebarName}' has no option '{item}'.");
                var normalized = id.ToString();
                if (!ids.Contains(normalized)) ids.Add(normalized);
            }
            return ids;
        }

        /// <summary>One user id, or a JSON array of them; each must be a Guid (the Keycloak "sub").</summary>
        private static List<string> ReadMemberIds(SidebarField field, string text)
        {
            List<string>? raw;
            try
            {
                raw = text.StartsWith('[') ? JsonSerializer.Deserialize<List<string>>(text, Json) : [text];
            }
            catch (JsonException)
            {
                raw = null;
            }
            if (raw is null)
                throw ApiProblemException.BadRequest("Invalid member.", $"'{field.sidebarName}' needs a user id or a list of user ids.");

            var ids = new List<string>();
            foreach (var item in raw)
            {
                if (!Guid.TryParse(item, out var id))
                    throw ApiProblemException.BadRequest("Invalid member.", $"'{item}' isn't a user id.");
                var normalized = id.ToString();
                if (!ids.Contains(normalized)) ids.Add(normalized);
            }
            return ids;
        }

        private static SidebarRecordResponse ToResponse(SidebarRecord record)
        {
            var values = string.IsNullOrWhiteSpace(record.Metadata)
                ? []
                : JsonSerializer.Deserialize<List<SidebarRecordValue>>(record.Metadata, Json) ?? [];
            return new()
            {
                objId = record.ObjId,
                docId = record.DocId,
                sidebarId = record.sidebarId,
                values = values.ToDictionary(v => v.fieldId, v => v.value),
                versionNo = record.VersionNo,
                // Saved as UTC (SYSUTCDATETIME) but read back without a kind; mark it so it serializes with a Z
                createTime = DateTime.SpecifyKind(record.CreateTime, DateTimeKind.Utc),
            };
        }

        public async Task<SidebarRecordResponse> GetAsync(string sidebarId, Guid objId, CancellationToken ct)
        {
            var record = await db.SidebarRecords
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ObjId == objId && r.sidebarId == sidebarId, ct)
                ?? throw ApiProblemException.NotFound("Record not found.");
            return ToResponse(record);
        }

    }
}
