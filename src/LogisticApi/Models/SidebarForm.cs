using ModuleLeague.Core.Entities;

namespace LogisticApi.Models
{
    /// <summary>A form of one sidebar: a title, a description and the fields people fill in, in order.</summary>
    public class SidebarForm : MLEntityBase
    {
        public string sidebarId { get; set; } = string.Empty;
        public string formTitle { get; set; } = string.Empty;
        public string? formDescription { get; set; }
        public bool isHidden { get; set; }
        public bool isDefault { get; set; }
        public int displayOrder { get; set; }
        /// <summary>JSON array of the field ObjIds on the form, in the order they show.</summary>
        public string fields { get; set; } = "[]";
    }
}
