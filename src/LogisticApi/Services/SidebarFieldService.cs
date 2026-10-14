using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace LogisticApi.Services
{
    /// <summary>
    /// Field templates of a sidebar: one SidebarField per IField, select choices in SidebarFieldOption.
    /// </summary>
    public class SidebarFieldService(ContextDb db)
    {
        public async Task<List<SidebarFieldResponse>> ListAsync(string sidebarId, CancellationToken ct)
        {
            var fields = await db.SidebarFields
                .AsNoTracking()
                .Include(f => f.options)
                .Where(f => f.sidebarId == sidebarId)
                .OrderBy(f => f.displayOrder)
                .ThenBy(f => f.DocId)
                .ToListAsync(ct);
            return fields.Select(SidebarFieldResponse.From).ToList();
        }

        public async Task<SidebarFieldResponse> GetAsync(Guid objId, CancellationToken ct)
        {
            var field = await db.SidebarFields
                .AsNoTracking()
                .Include(f => f.options)
                .FirstOrDefaultAsync(f => f.ObjId == objId, ct)
                ?? throw ApiProblemException.NotFound("Field not found.");
            return SidebarFieldResponse.From(field);
        }

        public async Task<SidebarFieldResponse> CreateAsync(string sidebarId, SidebarFieldCreateRequest request, CancellationToken ct)
        {
            var type = request.type.Trim();
            if (!FieldTypes.IsKnown(type))
                throw ApiProblemException.BadRequest("Unknown field type.", $"'{type}' is not one of: {string.Join(", ", FieldTypes.All)}.");

            var name = CleanName(request.name);
            await EnsureNameFreeAsync(sidebarId, name, null, ct);
            var options = CleanOptions(type, request.dropDownValues);

            var lastOrder = await db.SidebarFields
                .Where(f => f.sidebarId == sidebarId)
                .MaxAsync(f => (int?)f.displayOrder, ct);

            var field = new SidebarField
            {
                ObjId = Guid.CreateVersion7(),
                sidebarId = sidebarId,
                sidebarName = name,
                sidebarDescription = CleanDescription(request.description),
                type = type,
                displayOrder = (lastOrder ?? -1) + 1,
                settings = ApplySettings(new FieldSettings(), request).Write(),
            };
            foreach (var (option, index) in options.Select((option, index) => (option, index)))
                field.options.Add(NewOption(field.ObjId, option, index));

            if (request.isPrimaryField == true)
                await MakePrimaryAsync(field, ct);

            db.SidebarFields.Add(field);
            await SaveAsync(ct);
            return SidebarFieldResponse.From(field);
        }

        public async Task<SidebarFieldResponse> UpdateAsync(Guid objId, SidebarFieldUpdateRequest request, CancellationToken ct)
        {
            var field = await db.SidebarFields
                .Include(f => f.options)
                .FirstOrDefaultAsync(f => f.ObjId == objId, ct)
                ?? throw ApiProblemException.NotFound("Field not found.");

            if (field.VersionNo != request.versionNo)
                throw StaleVersion();
            db.Entry(field).Property(f => f.VersionNo).OriginalValue = request.versionNo;

            var name = CleanName(request.name);
            if (!string.Equals(name, field.sidebarName, StringComparison.Ordinal))
            {
                await EnsureNameFreeAsync(field.sidebarId, name, field.ObjId, ct);
                field.sidebarName = name;
            }
            field.sidebarDescription = CleanDescription(request.description);
            field.settings = ApplySettings(FieldSettings.Read(field.settings), request).Write();

            if (request.isPrimaryField == true && !field.isPrimaryField)
                await MakePrimaryAsync(field, ct);
            else if (request.isPrimaryField == false)
                field.isPrimaryField = false;

            if (request.dropDownValues is not null)
                SyncOptions(field, CleanOptions(field.type, request.dropDownValues));

            await SaveAsync(ct);
            return SidebarFieldResponse.From(field);
        }

        public async Task DeleteAsync(Guid objId, CancellationToken ct)
        {
            var field = await db.SidebarFields
                .Include(f => f.options)
                .FirstOrDefaultAsync(f => f.ObjId == objId, ct)
                ?? throw ApiProblemException.NotFound("Field not found.");
            if (field.isSystemField)
                throw ApiProblemException.Conflict("System fields can't be deleted.");

            // MLAuditFieldsInterceptor turns both removes into soft deletes
            db.SidebarFieldOptions.RemoveRange(field.options);
            db.SidebarFields.Remove(field);
            await SaveAsync(ct);
        }

        public async Task<List<SidebarFieldResponse>> ReorderAsync(string sidebarId, SidebarFieldOrderRequest request, CancellationToken ct)
        {
            var fields = await db.SidebarFields
                .Where(f => f.sidebarId == sidebarId)
                .ToListAsync(ct);

            var sameSet = request.fieldIds.Count == fields.Count
                && request.fieldIds.Distinct().Count() == fields.Count
                && fields.All(f => request.fieldIds.Contains(f.ObjId));
            if (!sameSet)
                throw ApiProblemException.BadRequest("fieldIds must list every field of the sidebar exactly once.");

            var byId = fields.ToDictionary(f => f.ObjId);
            foreach (var (id, index) in request.fieldIds.Select((id, index) => (id, index)))
            {
                if (byId[id].displayOrder != index) byId[id].displayOrder = index;
            }

            await SaveAsync(ct);
            return await ListAsync(sidebarId, ct);
        }

        private static string CleanName(string name)
        {
            var cleaned = name?.Trim() ?? string.Empty;
            if (cleaned.Length == 0) throw ApiProblemException.BadRequest("Field name is required.");
            return cleaned;
        }

        private static string? CleanDescription(string? description) =>
            string.IsNullOrWhiteSpace(description) ? null : description.Trim();

        // The column's default collation is case-insensitive, so "carrier" clashes with "Carrier"
        private async Task EnsureNameFreeAsync(string sidebarId, string name, Guid? exceptObjId, CancellationToken ct)
        {
            var taken = await db.SidebarFields.AnyAsync(
                f => f.sidebarId == sidebarId && f.sidebarName == name && f.ObjId != exceptObjId, ct);
            if (taken) throw ApiProblemException.Conflict("Field name already used.", $"A field named '{name}' already exists in this sidebar.");
        }

        private async Task MakePrimaryAsync(SidebarField field, CancellationToken ct)
        {
            var current = await db.SidebarFields
                .Where(f => f.sidebarId == field.sidebarId && f.isPrimaryField && f.ObjId != field.ObjId)
                .ToListAsync(ct);
            current.ForEach(f => f.isPrimaryField = false);
            field.isPrimaryField = true;
        }

        private static FieldSettings ApplySettings(FieldSettings settings, SidebarFieldSettingsRequest request)
        {
            if (request.dateFormat is not null)
            {
                if (!FieldSettings.DateFormats.Contains(request.dateFormat))
                    throw ApiProblemException.BadRequest("Unknown dateFormat.", $"Use one of: {string.Join(", ", FieldSettings.DateFormats)}.");
                settings.dateFormat = request.dateFormat;
            }
            if (request.timeFormat is not null)
            {
                if (!FieldSettings.TimeFormats.Contains(request.timeFormat))
                    throw ApiProblemException.BadRequest("Unknown timeFormat.", $"Use one of: {string.Join(", ", FieldSettings.TimeFormats)}.");
                settings.timeFormat = request.timeFormat;
            }
            if (request.displayTime is not null) settings.displayTime = request.displayTime.Value;
            if (request.memberSettings?.multiple is not null) settings.multipleMembers = request.memberSettings.multiple.Value;
            if (request.color is not null) settings.color = request.color.ToUpperInvariant();
            return settings;
        }

        private static List<SidebarFieldOptionRequest> CleanOptions(string type, List<SidebarFieldOptionRequest>? options)
        {
            if (!FieldTypes.HasOptions(type))
            {
                if (options?.Count > 0) throw ApiProblemException.BadRequest("Only select fields have dropDownValues.");
                return [];
            }

            var cleaned = (options ?? [])
                .Select((option, index) => (option, index))
                .OrderBy(entry => entry.option.displayOrder ?? int.MaxValue)
                .ThenBy(entry => entry.index)
                .Select(entry => new SidebarFieldOptionRequest
                {
                    id = entry.option.id,
                    value = entry.option.value?.Trim() ?? string.Empty,
                    colorCode = entry.option.colorCode?.ToUpperInvariant(),
                })
                .ToList();

            if (cleaned.Count == 0)
                throw ApiProblemException.BadRequest("A select field needs at least one option.");
            if (cleaned.Any(option => option.value.Length == 0))
                throw ApiProblemException.BadRequest("Option values can't be empty.");

            var duplicate = cleaned
                .GroupBy(option => option.value, StringComparer.OrdinalIgnoreCase)
                .FirstOrDefault(group => group.Count() > 1);
            if (duplicate is not null)
                throw ApiProblemException.BadRequest("Option values must be unique.", $"'{duplicate.Key}' is listed more than once.");

            return cleaned;
        }

        private void SyncOptions(SidebarField field, List<SidebarFieldOptionRequest> options)
        {
            var existing = field.options.ToDictionary(option => option.ObjId);
            var unknown = options.FirstOrDefault(option => option.id is { } id && !existing.ContainsKey(id));
            if (unknown is not null)
                throw ApiProblemException.BadRequest("Unknown option id.", $"Option '{unknown.id}' doesn't belong to this field.");

            var kept = options.Where(option => option.id is not null).Select(option => option.id!.Value).ToHashSet();
            var removed = field.options.Where(option => !kept.Contains(option.ObjId)).ToList();
            db.SidebarFieldOptions.RemoveRange(removed);

            foreach (var (option, index) in options.Select((option, index) => (option, index)))
            {
                if (option.id is { } id)
                {
                    var current = existing[id];
                    current.value = option.value;
                    current.colorCode = option.colorCode;
                    current.displayOrder = index;
                }
                else
                {
                    field.options.Add(NewOption(field.ObjId, option, index));
                }
            }
        }

        // ObjId is set here, not left to the interceptor: two new rows with Guid.Empty would clash in the change tracker
        private static SidebarFieldOption NewOption(Guid fieldObjId, SidebarFieldOptionRequest option, int index) => new()
        {
            ObjId = Guid.CreateVersion7(),
            fieldObjId = fieldObjId,
            value = option.value,
            colorCode = option.colorCode,
            displayOrder = index,
        };

        private async Task SaveAsync(CancellationToken ct)
        {
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                throw StaleVersion();
            }
            catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
            {
                throw ApiProblemException.Conflict("Duplicate value.", "Another field or option with the same name was saved at the same time; reload and try again.");
            }
        }

        private static ApiProblemException StaleVersion() =>
            ApiProblemException.Conflict("Field was changed by someone else.", "Reload the field and apply your change again.");
    }
}
