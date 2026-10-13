using ModuleLeague.Core.Entities;

namespace LogisticApi.Models
{
    public class SidebarFieldOption : MLEntityBase
    {
        public Guid fieldObjId { get; set; }
        public string value { get; set; } = string.Empty;
        public string? colorCode { get; set; }
        public int displayOrder { get; set; }
        public SidebarField? field { get; set; }
    }
}
