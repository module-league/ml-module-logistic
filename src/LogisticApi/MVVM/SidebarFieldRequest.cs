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

    public class SidebarNumberSettingsRequest
    {
        /// <summary>Currency fields only.</summary>
        [MaxLength(5)]
        public string? symbol { get; set; }

        [Range(0, 8)]
        public int? decimalPlaces { get; set; }

        /// <summary>none, thousand, million or billion.</summary>
        public string? abbreviation { get; set; }
    }

    public class SidebarLookupSettingsRequest
    {
        /// <summary>Link fields only: the sidebarId whose records are linked, the field's own allowed. Can't change once the field exists.</summary>
        [MaxLength(100), RegularExpression("^[a-z0-9]+(-[a-z0-9]+)*$")]
        public string? categoryId { get; set; }

        /// <summary>Link fields only: each record can link to several records. Turning it off keeps only the first link of each record.</summary>
        public bool? multiple { get; set; }

        /// <summary>Lookup fields only: the link field of the same sidebar whose linked records are looked up.</summary>
        public Guid? linkFieldId { get; set; }

        /// <summary>The field of the linked sidebar shown for each linked record. Required for a lookup; optional for a link, where the primary or first field shows when left out.</summary>
        public Guid? lookupFieldId { get; set; }

        /// <summary>Lookup fields only: linked records can be previewed from an open record.</summary>
        public bool? previewEnabled { get; set; }

        /// <summary>Lookup fields only: the fields shown in the preview: field ObjIds of the linked sidebar, or "ds_create_time".</summary>
        [MaxLength(200)]
        public List<string>? previewFieldIds { get; set; }
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

        /// <summary>Only for number and currency fields.</summary>
        public SidebarNumberSettingsRequest? numberSettings { get; set; }

        /// <summary>Only for link and lookup fields; required when one is created.</summary>
        public SidebarLookupSettingsRequest? lookupSettings { get; set; }

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
