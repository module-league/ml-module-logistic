using ModuleLeague.Core.Entities;

namespace LogisticApi.Models
{
    /// <summary>A form of one sidebar: a title, a description and the fields people fill in, in order.</summary>
    public class SidebarForm : MLEntityBase
    {
        public const string DefaultSubmitLabel = "Submit";
        public const string DefaultClearLabel = "Clear form";

        public string sidebarId { get; set; } = string.Empty;
        public string formTitle { get; set; } = string.Empty;
        public string? formDescription { get; set; }
        public bool isHidden { get; set; }
        public bool isDefault { get; set; }
        public int displayOrder { get; set; }
        /// <summary>An image attachment of the sidebar shown across the top of the form.</summary>
        public Guid? coverImageId { get; set; }
        /// <summary>An image attachment of the sidebar shown under the cover.</summary>
        public Guid? logoId { get; set; }
        /// <summary>The submit button's text; null shows "Submit".</summary>
        public string? submitLabel { get; set; }
        /// <summary>The clear form button's text; null shows "Clear form".</summary>
        public string? clearLabel { get; set; }
        /// <summary>JSON array of SidebarFormField: the fields on the form, in the order they show.</summary>
        public string fields { get; set; } = "[]";
    }
}
