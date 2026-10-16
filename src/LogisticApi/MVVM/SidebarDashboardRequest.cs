using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace LogisticApi.MVVM
{
    public class SidebarDashboardRequest
    {
        /// <summary>Blank shows the sidebar's own text.</summary>
        [MaxLength(80)]
        public string? title { get; set; }

        /// <summary>Blank shows the sidebar's own description.</summary>
        [MaxLength(200)]
        public string? description { get; set; }

        /// <summary>"today", "next_7_days" or "next_30_days".</summary>
        [Required, MaxLength(20)]
        public string dateRange { get; set; } = string.Empty;

        /// <summary>The sidebar and date field the page range filters; send both or neither.</summary>
        [MaxLength(100)]
        public string? rangeSidebarId { get; set; }

        public Guid? rangeFieldId { get; set; }

        /// <summary>The sidebar the New button adds to; null hides the button.</summary>
        [MaxLength(100)]
        public string? newRecordSidebarId { get; set; }

        /// <summary>The New button's text; blank shows "New record".</summary>
        [MaxLength(40)]
        public string? newRecordLabel { get; set; }

        /// <summary>The widgets in display order. Each needs an id, a type, a width and the sidebarId it reads; the rest is the web app's.</summary>
        [MaxLength(40)]
        public List<JsonElement> widgets { get; set; } = [];

        /// <summary>The versionNo you last read; 0 when the sidebar has no overview yet. A stale value returns 409.</summary>
        public int versionNo { get; set; }
    }
}
