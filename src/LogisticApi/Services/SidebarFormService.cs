using System.Text.Json;
using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace LogisticApi.Services
{
    /// <summary>
    /// Forms of a sidebar: each lists the fields people fill in. The first form of a sidebar becomes its default.
    /// </summary>
    public class SidebarFormService(ContextDb db)
    {
        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        public async Task<List<SidebarFormResponse>> ListAsync(string sidebarId, CancellationToken ct)
        {
            var forms = await db.SidebarForms
                .AsNoTracking()
                .Where(f => f.sidebarId == sidebarId)
                .OrderBy(f => f.displayOrder)
                .ThenBy(f => f.DocId)
                .ToListAsync(ct);
            var liveFieldIds = await FieldIdsAsync(sidebarId, ct);
            return forms.Select(form => SidebarFormResponse.From(form, liveFieldIds)).ToList();
        }

        public async Task<SidebarFormResponse> CreateAsync(string sidebarId, SidebarFormRequest request, CancellationToken ct)
        {
            var hasForms = await db.SidebarForms.AnyAsync(f => f.sidebarId == sidebarId, ct);
            var lastOrder = await db.SidebarForms
                .Where(f => f.sidebarId == sidebarId)
                .MaxAsync(f => (int?)f.displayOrder, ct);
            var form = new SidebarForm
            {
                ObjId = Guid.CreateVersion7(),
                sidebarId = sidebarId,
                displayOrder = (lastOrder ?? -1) + 1,
            };
            await ApplyAsync(form, request, ct);
            if (!hasForms && !form.isHidden) form.isDefault = true;

            db.SidebarForms.Add(form);
            await SaveWithDefaultAsync(form, ct);
            return SidebarFormResponse.From(form, await FieldIdsAsync(sidebarId, ct));
        }

        public async Task<SidebarFormResponse> UpdateAsync(Guid objId, SidebarFormRequest request, CancellationToken ct)
        {
            var form = await db.SidebarForms.FirstOrDefaultAsync(f => f.ObjId == objId, ct)
                ?? throw ApiProblemException.NotFound("Form not found.");
            if (request.versionNo is not { } versionNo || form.VersionNo != versionNo)
                throw StaleVersion();
            db.Entry(form).Property(f => f.VersionNo).OriginalValue = versionNo;

            await ApplyAsync(form, request, ct);
            await SaveWithDefaultAsync(form, ct);
            return SidebarFormResponse.From(form, await FieldIdsAsync(form.sidebarId, ct));
        }

        public async Task DeleteAsync(Guid objId, CancellationToken ct)
        {
            var form = await db.SidebarForms.FirstOrDefaultAsync(f => f.ObjId == objId, ct)
                ?? throw ApiProblemException.NotFound("Form not found.");
            // MLAuditFieldsInterceptor turns the remove into a soft delete
            db.SidebarForms.Remove(form);
            await SaveAsync(ct);
        }

        public async Task<List<SidebarFormResponse>> ReorderAsync(string sidebarId, SidebarFormOrderRequest request, CancellationToken ct)
        {
            var forms = await db.SidebarForms
                .Where(f => f.sidebarId == sidebarId)
                .ToListAsync(ct);
            var sameSet = request.formIds.Count == forms.Count
                && request.formIds.Distinct().Count() == forms.Count
                && forms.All(f => request.formIds.Contains(f.ObjId));
            if (!sameSet)
                throw ApiProblemException.BadRequest("formIds must list every form of the sidebar exactly once.");

            var byId = forms.ToDictionary(f => f.ObjId);
            foreach (var (id, index) in request.formIds.Select((id, index) => (id, index)))
            {
                if (byId[id].displayOrder != index) byId[id].displayOrder = index;
            }
            await SaveAsync(ct);
            return await ListAsync(sidebarId, ct);
        }

        private async Task ApplyAsync(SidebarForm form, SidebarFormRequest request, CancellationToken ct)
        {
            var title = request.formTitle?.Trim() ?? string.Empty;
            if (title.Length == 0) throw ApiProblemException.BadRequest("Form title is required.");
            if (request.isHidden && request.isDefault)
                throw ApiProblemException.BadRequest("A hidden form can't be the default.", "Show the form, or pick another default.");

            form.formTitle = title;
            form.formDescription = string.IsNullOrWhiteSpace(request.formDescription) ? null : request.formDescription.Trim();
            form.submitLabel = Label(request.submitLabel, SidebarForm.DefaultSubmitLabel);
            form.clearLabel = Label(request.clearLabel, SidebarForm.DefaultClearLabel);
            form.isHidden = request.isHidden;
            form.isDefault = request.isDefault;
            form.fields = JsonSerializer.Serialize(await CleanFieldIdsAsync(form.sidebarId, request.fieldIds, ct), Json);
            form.coverImageId = await CheckImageAsync(form.sidebarId, request.coverImageId, "cover image", ct);
            form.logoId = await CheckImageAsync(form.sidebarId, request.logoId, "logo", ct);
        }

        /// <summary>A blank or default button label is stored as null.</summary>
        private static string? Label(string? label, string fallback) =>
            string.IsNullOrWhiteSpace(label) || label.Trim() == fallback ? null : label.Trim();

        /// <summary>The image must be an attachment uploaded for this sidebar.</summary>
        private async Task<Guid?> CheckImageAsync(string sidebarId, Guid? id, string what, CancellationToken ct)
        {
            if (id is not { } attachmentId) return null;
            var fileType = await db.Attachments
                .AsNoTracking()
                .Where(a => a.ObjId == attachmentId && a.refId == sidebarId)
                .Select(a => a.fileType)
                .FirstOrDefaultAsync(ct)
                ?? throw ApiProblemException.BadRequest($"Unknown {what}.", $"'{sidebarId}' has no uploaded attachment '{attachmentId}'.");
            if (!fileType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                throw ApiProblemException.BadRequest($"The {what} must be an image.", $"'{attachmentId}' is a {fileType} file.");
            return attachmentId;
        }

        /// <summary>Each field must belong to the sidebar and be one people fill in: not a system or lookup field. Repeats are dropped.</summary>
        private async Task<List<Guid>> CleanFieldIdsAsync(string sidebarId, List<Guid> ids, CancellationToken ct)
        {
            var fields = await db.SidebarFields
                .AsNoTracking()
                .Where(f => f.sidebarId == sidebarId)
                .Select(f => new { f.ObjId, f.sidebarName, f.type, f.isSystemField })
                .ToListAsync(ct);
            var byId = fields.ToDictionary(f => f.ObjId);
            var cleaned = new List<Guid>();
            foreach (var id in ids)
            {
                if (!byId.TryGetValue(id, out var field))
                    throw ApiProblemException.BadRequest("Unknown field.", $"'{sidebarId}' has no field '{id}'.");
                if (field.isSystemField || FieldTypes.IsLookup(field.type))
                    throw ApiProblemException.BadRequest("This field can't be on a form.", $"'{field.sidebarName}' is filled in automatically.");
                if (!cleaned.Contains(id)) cleaned.Add(id);
            }
            return cleaned;
        }

        /// <summary>A new default first clears the old one in its own statement, so the one-default index never sees two.</summary>
        private async Task SaveWithDefaultAsync(SidebarForm form, CancellationToken ct)
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            if (form.isDefault)
            {
                await db.SidebarForms
                    .Where(f => f.sidebarId == form.sidebarId && f.isDefault && f.ObjId != form.ObjId)
                    .ExecuteUpdateAsync(setter => setter.SetProperty(f => f.isDefault, false), ct);
            }
            await SaveAsync(ct);
            await transaction.CommitAsync(ct);
        }

        private async Task<HashSet<Guid>> FieldIdsAsync(string sidebarId, CancellationToken ct) =>
            (await db.SidebarFields
                .AsNoTracking()
                .Where(f => f.sidebarId == sidebarId)
                .Select(f => f.ObjId)
                .ToListAsync(ct))
            .ToHashSet();

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
                throw ApiProblemException.Conflict("Another default form was saved at the same time.", "Reload the forms and try again.");
            }
        }

        private static ApiProblemException StaleVersion() =>
            ApiProblemException.Conflict("Form was changed by someone else.", "Reload the form and apply your change again.");
    }
}
