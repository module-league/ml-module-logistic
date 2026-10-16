using System.Text.Json;
using System.Text.RegularExpressions;
using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace LogisticApi.Services
{
    /// <summary>
    /// The widget overview of a sidebar page, one per sidebar. Widgets read records of any sidebar; their settings are stored as the web app sends them.
    /// </summary>
    public partial class SidebarDashboardService(ContextDb db)
    {
        private static readonly string[] WidgetTypes = ["metric", "board", "list", "breakdown", "trend", "map", "attention"];
        private static readonly string[] WidgetWidths = ["s", "m", "l", "full"];
        private const int WidgetsMaxLength = 200_000;

        public async Task<SidebarDashboardResponse> GetAsync(string sidebarId, CancellationToken ct)
        {
            var dashboard = await db.SidebarDashboards
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.sidebarId == sidebarId, ct);
            return dashboard is null ? SidebarDashboardResponse.Empty(sidebarId) : SidebarDashboardResponse.From(dashboard);
        }

        /// <summary>Adds the overview on the first save (versionNo 0) and replaces it after that.</summary>
        public async Task<SidebarDashboardResponse> SaveAsync(string sidebarId, SidebarDashboardRequest request, CancellationToken ct)
        {
            var dashboard = await db.SidebarDashboards.FirstOrDefaultAsync(d => d.sidebarId == sidebarId, ct);
            if (dashboard is null)
            {
                if (request.versionNo != 0) throw StaleVersion();
                dashboard = new SidebarDashboard { ObjId = Guid.CreateVersion7(), sidebarId = sidebarId };
                db.SidebarDashboards.Add(dashboard);
            }
            else
            {
                if (dashboard.VersionNo != request.versionNo) throw StaleVersion();
                db.Entry(dashboard).Property(d => d.VersionNo).OriginalValue = request.versionNo;
            }

            await ApplyAsync(dashboard, request, ct);
            await SaveChangesAsync(ct);
            return SidebarDashboardResponse.From(dashboard);
        }

        private async Task ApplyAsync(SidebarDashboard dashboard, SidebarDashboardRequest request, CancellationToken ct)
        {
            if (!SidebarDashboard.DateRanges.Contains(request.dateRange))
                throw ApiProblemException.BadRequest("Unknown date range.", $"Use one of {string.Join(", ", SidebarDashboard.DateRanges)}.");
            if ((request.rangeSidebarId is null) != (request.rangeFieldId is null))
                throw ApiProblemException.BadRequest("Pick a table and a date field for the date range.", "Send rangeSidebarId and rangeFieldId together, or neither.");
            if (request.rangeFieldId is { } rangeFieldId)
            {
                var rangeField = await db.SidebarFields
                    .AsNoTracking()
                    .FirstOrDefaultAsync(f => f.ObjId == rangeFieldId && f.sidebarId == request.rangeSidebarId, ct)
                    ?? throw ApiProblemException.BadRequest("Unknown date field.", $"'{request.rangeSidebarId}' has no field '{rangeFieldId}'.");
                if (!FieldTypes.IsDate(rangeField.type))
                    throw ApiProblemException.BadRequest("The date range needs a date field.", $"'{rangeField.sidebarName}' is a {rangeField.type} field.");
            }
            if (request.newRecordSidebarId is { } newRecordSidebarId) CheckSidebarId(newRecordSidebarId);

            dashboard.title = Clean(request.title);
            dashboard.description = Clean(request.description);
            dashboard.dateRange = request.dateRange;
            dashboard.rangeSidebarId = request.rangeSidebarId;
            dashboard.rangeFieldId = request.rangeFieldId;
            dashboard.newRecordSidebarId = request.newRecordSidebarId;
            dashboard.newRecordLabel = request.newRecordSidebarId is null ? null : Clean(request.newRecordLabel);
            dashboard.widgets = CleanWidgets(request.widgets);
        }

        /// <summary>Each widget needs its own id, a known type and width, and a sidebar to read; the rest is kept as sent.</summary>
        private static string CleanWidgets(List<JsonElement> widgets)
        {
            var ids = new HashSet<string>();
            foreach (var widget in widgets)
            {
                if (widget.ValueKind != JsonValueKind.Object)
                    throw ApiProblemException.BadRequest("Invalid widget.", "Each widget must be an object.");
                var id = Text(widget, "id");
                if (id is null || id.Length > 40 || !ids.Add(id))
                    throw ApiProblemException.BadRequest("Invalid widget.", "Each widget needs its own id of up to 40 characters.");
                if (!WidgetTypes.Contains(Text(widget, "type")))
                    throw ApiProblemException.BadRequest("Unknown widget type.", $"Widget '{id}' must be one of {string.Join(", ", WidgetTypes)}.");
                if (!WidgetWidths.Contains(Text(widget, "width")))
                    throw ApiProblemException.BadRequest("Unknown widget width.", $"Widget '{id}' must be one of {string.Join(", ", WidgetWidths)}.");
                CheckSidebarId(Text(widget, "sidebarId") ?? string.Empty);
            }

            var json = JsonSerializer.Serialize(widgets);
            if (json.Length > WidgetsMaxLength)
                throw ApiProblemException.BadRequest("The overview is too large.", "Remove some widgets or conditions and save again.");
            return json;
        }

        private static string? Text(JsonElement element, string name) =>
            element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;

        private static void CheckSidebarId(string sidebarId)
        {
            if (sidebarId.Length > 100 || !SidebarIdPattern().IsMatch(sidebarId))
                throw ApiProblemException.BadRequest("Unknown table.", $"'{sidebarId}' isn't a sidebar id.");
        }

        private static string? Clean(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

        private async Task SaveChangesAsync(CancellationToken ct)
        {
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                throw StaleVersion();
            }
            // Two first saves at once: the one-overview index keeps the second out
            catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
            {
                throw StaleVersion();
            }
        }

        private static ApiProblemException StaleVersion() =>
            ApiProblemException.Conflict("The overview was changed by someone else.", "Reload the page and customize it again.");

        [GeneratedRegex("^[a-z0-9]+(-[a-z0-9]+)*$")]
        private static partial Regex SidebarIdPattern();
    }
}
