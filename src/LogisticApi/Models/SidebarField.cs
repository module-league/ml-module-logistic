using ModuleLeague.Core.Entities;

namespace LogisticApi.Models
{
    public class SidebarField : MLEntityBase
    {
        public string sidebarId { get; set; } = string.Empty;
        public string sidebarName { get; set; } = string.Empty;
        public string? sidebarDescription { get; set; }
        public string type { get; set; } = string.Empty;
        public int displayOrder { get; set; }

        public bool isPrimaryField { get; set; }
        public bool isEditable { get; set; } = true;
        public bool isSystemField { get; set; }

        public string? settings { get; set; }
        public ICollection<SidebarFieldOption> options { get; set; } = new List<SidebarFieldOption>();
    }
}
