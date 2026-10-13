using System.Globalization;
using System.Text.Json;
using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.EntityFrameworkCore;

namespace LogisticApi.Services
{
    public class LogisticRecordService(ContextDb db)
    {
        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        public async Task<List<LogisticRecordResponse>> ListAsync(string sidebarId, CancellationToken ct)
        {
            var records = await db.Logistics
                .AsNoTracking()
                .Where(r => r.sidebarId == sidebarId)
                .OrderByDescending(r => r.DocId)
                .ToListAsync(ct);
            return records.Select(ToResponse).ToList();
        }

        public async Task<LogisticRecordResponse> CreateAsync(string sidebarId, LogisticRecordCreateRequest request, CancellationToken ct)
        {
            var metadata = await BuildMetadataAsync(sidebarId, request.values, ct);
            var record = new Logistic
            {
                ObjId = Guid.CreateVersion7(),
                sidebarId = sidebarId,
                //what the client sent, keep for auditing
                RawMetadata = JsonSerializer.Serialize(request.values, Json),
                Metadata = JsonSerializer.Serialize(metadata, Json),
            };
            db.Logistics.Add(record);
            await db.SaveChangesAsync(ct);
            return ToResponse(record);
        }

        /// <summary>Replaces every value of the record; fields left out become empty. Send the versionNo you last read.</summary>
        public async Task<LogisticRecordResponse> UpdateAsync(string sidebarId, Guid objId, LogisticRecordUpdateRequest request, CancellationToken ct)
        {
            var record = await db.Logistics
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

        private async Task<List<LogisticRecordValue>> BuildMetadataAsync(string sidebarId, Dictionary<Guid, string?> values, CancellationToken ct)
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

            return fields.Select(f => new LogisticRecordValue
            {
                fieldId = f.ObjId,
                type = f.type,
                value = CleanValue(f, values.GetValueOrDefault(f.ObjId)),
            }).ToList();
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
                    if (!decimal.TryParse(text, NumberStyles.Number, CultureInfo.InvariantCulture, out var number))
                        throw ApiProblemException.BadRequest("Invalid number.", $"'{field.sidebarName}' needs a number.");
                    return number.ToString(CultureInfo.InvariantCulture);

                case "single_select":
                    if (!Guid.TryParse(text, out var optionId) || field.options.All(o => o.ObjId != optionId))
                        throw ApiProblemException.BadRequest("Invalid option.", $"'{field.sidebarName}' has no such option.");
                    return optionId.ToString();

                default:
                    if (text.Length > 1000)
                        throw ApiProblemException.BadRequest("Value too long.", $"'{field.sidebarName}' allows up to 1000 characters.");
                    return text;
            }
        }

        private static LogisticRecordResponse ToResponse(Logistic record)
        {
            var values = string.IsNullOrWhiteSpace(record.Metadata)
                ? []
                : JsonSerializer.Deserialize<List<LogisticRecordValue>>(record.Metadata, Json) ?? [];
            return new()
            {
                objId = record.ObjId,
                docId = record.DocId,
                sidebarId = record.sidebarId,
                values = values.ToDictionary(v => v.fieldId, v => v.value),
                versionNo = record.VersionNo,
                createTime = record.CreateTime,
            };
        }

        public async Task<LogisticRecordResponse> GetAsync(string sidebarId, Guid objId, CancellationToken ct)
        {
            var record = await db.Logistics
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ObjId == objId && r.sidebarId == sidebarId, ct)
                ?? throw ApiProblemException.NotFound("Record not found.");
            return ToResponse(record);
        }

    }
}
