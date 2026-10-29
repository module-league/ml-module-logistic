using System.Globalization;
using LogisticApi.Context;
using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LogisticApi.Services
{
    /// <summary>Records as people read them, for files the API writes such as drafts and invoices: titles and each field's value as text.</summary>
    public class RecordTextService(ContextDb db, IOptions<ExceptionRuleOptions> ruleOptions)
    {
        /// <summary>The zone dates are written in, the exception rules' TimeZone.</summary>
        public string ZoneName => ruleOptions.Value.TimeZone;
        public TimeZoneInfo Zone => TimeZoneInfo.FindSystemTimeZoneById(ZoneName);
        public DateTime LocalNow => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Zone);

        /// <summary>The record's title and each field with a value as text, in field order; links show the linked record's title.</summary>
        public async Task<(string title, List<(string label, string value)> rows)> TextRowsAsync(
            string sidebarId, RecordRow? row, CancellationToken ct, Guid? titleFieldId = null)
        {
            var (title, fields) = await FieldTextsAsync(sidebarId, row, ct, titleFieldId);
            return (title, fields.Select(f => (f.field.sidebarName, f.text)).ToList());
        }

        /// <summary>As TextRowsAsync, with each value's field, for callers that need its type.</summary>
        public async Task<(string title, List<(SidebarField field, string text)> fields)> FieldTextsAsync(
            string sidebarId, RecordRow? row, CancellationToken ct, Guid? titleFieldId = null)
        {
            if (row is null) return ("", []);
            var fields = await FieldsAsync(sidebarId, ct);
            var fieldIds = fields.Select(f => f.ObjId).ToList();
            var options = await db.SidebarFieldOptions.AsNoTracking().Where(o => fieldIds.Contains(o.fieldObjId)).ToDictionaryAsync(o => o.ObjId, o => o.value, ct);

            var links = fields.Where(f => FieldTypes.IsLink(f.type)).ToDictionary(f => f.ObjId, f => Ids(row, f.ObjId));
            var linkedIds = links.Values.SelectMany(ids => ids).Distinct().ToList();
            var linkedTitles = new Dictionary<Guid, string>();
            foreach (var target in fields.Where(f => FieldTypes.IsLink(f.type)).Select(f => FieldSettings.Read(f.settings).lookupSidebarId).OfType<string>().Distinct())
                foreach (var (id, title) in await TitlesAsync(target, ct, linkedIds))
                    linkedTitles[id] = title;

            var zone = Zone;
            string? Text(SidebarField field)
            {
                var raw = row.Value(field.ObjId);
                if (raw is null) return null;
                return field.type switch
                {
                    "single_select" => Guid.TryParse(raw, out var option) ? options.GetValueOrDefault(option) : null,
                    "multi_select" => string.Join(", ", Ids(row, field.ObjId).Select(id => options.GetValueOrDefault(id)).OfType<string>()),
                    "checkbox" => raw == "true" ? "Yes" : "No",
                    "link_table" => string.Join(", ", links[field.ObjId].Select(id => linkedTitles.GetValueOrDefault(id)).OfType<string>()),
                    "date" => DateTimeOffset.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var at)
                        ? raw.Length == 10 ? at.ToString("dd MMM yyyy", CultureInfo.InvariantCulture) : TimeZoneInfo.ConvertTime(at, zone).ToString("dd MMM yyyy HH:mm", CultureInfo.InvariantCulture)
                        : raw,
                    _ when FieldTypes.IsVirtual(field.type) || field.type == "attachment" => null,
                    _ => raw,
                };
            }
            var texts = fields
                .Select(f => (field: f, text: Text(f)))
                .Where(r => !string.IsNullOrWhiteSpace(r.text))
                .Select(r => (r.field, r.text!))
                .ToList();
            return (row.Value(TitleField(fields, titleFieldId)?.ObjId) ?? "", texts);
        }

        /// <summary>Each record's title, by the field the web names it by.</summary>
        public async Task<Dictionary<Guid, string>> TitlesAsync(string sidebarId, CancellationToken ct, ICollection<Guid>? ids = null, Guid? titleFieldId = null)
        {
            var titleField = TitleField(await FieldsAsync(sidebarId, ct), titleFieldId);
            return (await RecordRow.LoadAsync(db, sidebarId, ct, ids)).ToDictionary(r => r.Id, r => r.Value(titleField?.ObjId) ?? "");
        }

        private Task<List<SidebarField>> FieldsAsync(string sidebarId, CancellationToken ct) =>
            db.SidebarFields.AsNoTracking().Where(f => f.sidebarId == sidebarId && !f.isSystemField).OrderBy(f => f.displayOrder).ToListAsync(ct);

        /// <summary>The field a record is named by, as the web picks it: the one picked, else the primary field, else the first that can show in a lookup.</summary>
        private static SidebarField? TitleField(List<SidebarField> fields, Guid? pickedId = null) =>
            fields.FirstOrDefault(f => f.ObjId == pickedId)
            ?? fields.FirstOrDefault(f => f.isPrimaryField && FieldTypes.CanShowInLookup(f.type))
            ?? fields.FirstOrDefault(f => FieldTypes.CanShowInLookup(f.type));

        private static List<Guid> Ids(RecordRow row, Guid fieldId) =>
            (row.Read<List<string>>(fieldId) ?? []).Select(id => Guid.TryParse(id, out var parsed) ? parsed : Guid.Empty).Where(id => id != Guid.Empty).ToList();
    }
}
