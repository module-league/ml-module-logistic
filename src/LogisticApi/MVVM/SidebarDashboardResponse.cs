using System.Text.Json;
using LogisticApi.Models;

namespace LogisticApi.MVVM
{
    /// <summary>Matches ISidebarDashboard in web/src/services/dashboards/dashboard.types.ts.</summary>
    public class SidebarDashboardResponse
    {
        /// <summary>Null until the overview is first saved.</summary>
        public Guid? objId { get; set; }
        public string sidebarId { get; set; } = string.Empty;
        public string? title { get; set; }
        public string? description { get; set; }
        public string dateRange { get; set; } = SidebarDashboard.DefaultDateRange;
        public string? rangeSidebarId { get; set; }
        public Guid? rangeFieldId { get; set; }
        public string? newRecordSidebarId { get; set; }
        public string? newRecordLabel { get; set; }
        public JsonElement widgets { get; set; }
        /// <summary>0 until the overview is first saved.</summary>
        public int versionNo { get; set; }
        public DateTime? updateTime { get; set; }

        public static SidebarDashboardResponse Empty(string sidebarId) => new()
        {
            sidebarId = sidebarId,
            widgets = JsonDocument.Parse("[]").RootElement.Clone(),
        };

        public static SidebarDashboardResponse From(SidebarDashboard dashboard) => new()
        {
            objId = dashboard.ObjId,
            sidebarId = dashboard.sidebarId,
            title = dashboard.title,
            description = dashboard.description,
            dateRange = dashboard.dateRange,
            rangeSidebarId = dashboard.rangeSidebarId,
            rangeFieldId = dashboard.rangeFieldId,
            newRecordSidebarId = dashboard.newRecordSidebarId,
            newRecordLabel = dashboard.newRecordLabel,
            widgets = JsonDocument.Parse(dashboard.widgets).RootElement.Clone(),
            versionNo = dashboard.VersionNo,
            updateTime = DateTime.SpecifyKind(dashboard.UpdateTime ?? dashboard.CreateTime, DateTimeKind.Utc),
        };
    }
}
