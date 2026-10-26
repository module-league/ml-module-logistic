using System.Text.Json;
using LogisticApi.Context;
using LogisticApi.MVVM;
using Microsoft.EntityFrameworkCore;

namespace LogisticApi.Services
{
    /// <summary>A record (lg_logistic) with its values by field id, for services that read records without the record API.</summary>
    public sealed record RecordRow(Guid Id, DateTime CreateTime, Dictionary<Guid, string?> Values)
    {
        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        public static async Task<List<RecordRow>> LoadAsync(ContextDb db, string sidebarId, CancellationToken ct, ICollection<Guid>? ids = null)
        {
            var query = db.SidebarRecords.AsNoTracking().Where(r => r.sidebarId == sidebarId);
            if (ids is not null) query = query.Where(r => ids.Contains(r.ObjId));
            var records = await query.Select(r => new { r.ObjId, r.CreateTime, r.Metadata }).ToListAsync(ct);
            return records
                .Select(r => new RecordRow(
                    r.ObjId,
                    DateTime.SpecifyKind(r.CreateTime, DateTimeKind.Utc),
                    (string.IsNullOrWhiteSpace(r.Metadata) ? [] : JsonSerializer.Deserialize<List<SidebarRecordValue>>(r.Metadata, Json) ?? [])
                        .GroupBy(v => v.fieldId)
                        .ToDictionary(g => g.Key, g => g.First().value)))
                .ToList();
        }

        /// <summary>The raw value, or null when the field isn't set or is empty.</summary>
        public string? Value(Guid? fieldId) =>
            fieldId is { } id && Values.GetValueOrDefault(id) is { Length: > 0 } text ? text : null;

        /// <summary>The first record a link field points to.</summary>
        public Guid? Link(Guid? fieldId)
        {
            var text = Value(fieldId);
            var first = text?.StartsWith('[') == true ? Read<List<string>>(fieldId)?.FirstOrDefault() : text;
            return Guid.TryParse(first, out var id) ? id : null;
        }

        /// <summary>A JSON value, e.g. an attachment field's files; null when it isn't valid JSON.</summary>
        public T? Read<T>(Guid? fieldId)
        {
            var text = Value(fieldId);
            if (text is null) return default;
            try
            {
                return JsonSerializer.Deserialize<T>(text, Json);
            }
            catch (JsonException)
            {
                return default;
            }
        }
    }
}
