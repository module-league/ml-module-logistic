using ModuleLeague.Core.Entities;

namespace LogisticApi.Models
{
    /// <summary>The widget overview of one sidebar page: its title, the date range it opens with and its widgets in order.</summary>
    public class SidebarDashboard : MLEntityBase
    {
        public const string DefaultDateRange = "next_7_days";
        public static readonly string[] DateRanges = ["today", "next_7_days", "next_30_days"];

        public string sidebarId { get; set; } = string.Empty;
        /// <summary>Shown instead of the sidebar's own text; null shows the sidebar text.</summary>
        public string? title { get; set; }
        /// <summary>Shown under the title; null shows the sidebar description.</summary>
        public string? description { get; set; }
        /// <summary>One of DateRanges: the range the page opens with.</summary>
        public string dateRange { get; set; } = DefaultDateRange;
        /// <summary>The sidebar whose date field the page range filters, with rangeFieldId.</summary>
        public string? rangeSidebarId { get; set; }
        public Guid? rangeFieldId { get; set; }
        /// <summary>The sidebar the page's New button adds a record to; null hides the button.</summary>
        public string? newRecordSidebarId { get; set; }
        public string? newRecordLabel { get; set; }
        /// <summary>JSON array of widgets, in display order. Each one's settings are owned by the web app.</summary>
        public string widgets { get; set; } = "[]";
    }
}
