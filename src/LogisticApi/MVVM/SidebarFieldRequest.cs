using System.ComponentModel.DataAnnotations;

namespace LogisticApi.MVVM
{
    public class SidebarFieldOptionRequest
    {
        /// <summary>An existing option's ObjId; leave empty for a new option.</summary>
        public Guid? id { get; set; }

        [Required, MaxLength(100)]
        public string value { get; set; } = string.Empty;

        [RegularExpression("^#[0-9A-Fa-f]{6}$", ErrorMessage = "colorCode must be a 6-digit hex color, e.g. #047857.")]
        public string? colorCode { get; set; }

        /// <summary>Optional; options are sorted by it, then by list position, and renumbered from 0.</summary>
        public int? displayOrder { get; set; }
    }

    public class SidebarMemberSettingsRequest
    {
        /// <summary>Several people can be picked; the value is then a JSON array of user ids.</summary>
        public bool? multiple { get; set; }
    }

    public abstract class SidebarFieldSettingsRequest
    {
        [MaxLength(500)]
        public string? description { get; set; }

        public bool? isPrimaryField { get; set; }

        public string? dateFormat { get; set; }

        public bool? displayTime { get; set; }

        public string? timeFormat { get; set; }

        [RegularExpression("^#[0-9A-Fa-f]{6}$", ErrorMessage = "color must be a 6-digit hex color, e.g. #047857.")]
        public string? color { get; set; }

        /// <summary>Only for member fields.</summary>
        public SidebarMemberSettingsRequest? memberSettings { get; set; }

        /// <summary>Only for select fields. On update, the full list: options left out are deleted.</summary>
        public List<SidebarFieldOptionRequest>? dropDownValues { get; set; }
    }

    public class SidebarFieldCreateRequest : SidebarFieldSettingsRequest
    {
        [Required, MaxLength(40)]
        public string name { get; set; } = string.Empty;

        [Required, MaxLength(30)]
        public string type { get; set; } = string.Empty;
    }

    /// <summary>The type can't change once a field exists; delete it and add a new one instead.</summary>
    public class SidebarFieldUpdateRequest : SidebarFieldSettingsRequest
    {
        [Required, MaxLength(40)]
        public string name { get; set; } = string.Empty;

        /// <summary>The versionNo the client last read; a stale value returns 409.</summary>
        [Range(1, int.MaxValue)]
        public int versionNo { get; set; }
    }

    public class SidebarFieldOrderRequest
    {
        /// <summary>Every field of the sidebar exactly once, in the new order.</summary>
        [Required, MinLength(1)]
        public List<Guid> fieldIds { get; set; } = [];
    }
}
