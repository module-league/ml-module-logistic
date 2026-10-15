using System.Text.Json;

namespace LogisticApi.Models
{
    /// <summary>
    /// The type-specific parts of IField, stored as JSON in lg_sidebar_field.settings.
    /// </summary>
    public class FieldSettings
    {
        public static readonly string[] DateFormats = ["dd/MM/yyyy", "MM/dd/yyyy", "dd MMM yyyy", "yyyy-MM-dd"];
        public static readonly string[] TimeFormats = ["hh:mm a", "HH:mm"];
        public static readonly string[] Abbreviations = ["none", "thousand", "million", "billion"];

        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        public string dateFormat { get; set; } = "dd/MM/yyyy";
        public bool displayTime { get; set; }
        /// <summary>Date fields that display time, and time fields: 12-hour ("hh:mm a") or 24-hour ("HH:mm").</summary>
        public string timeFormat { get; set; } = "hh:mm a";
        public string? color { get; set; }
        /// <summary>Member fields only: several people can be picked.</summary>
        public bool multipleMembers { get; set; }
        /// <summary>Currency fields only: shown before the number.</summary>
        public string currencySymbol { get; set; } = "$";
        /// <summary>Number and currency fields: 0 to 8; null shows the decimals as typed.</summary>
        public int? decimalPlaces { get; set; }
        /// <summary>Number and currency fields: one of <see cref="Abbreviations"/>.</summary>
        public string abbreviation { get; set; } = "none";
        /// <summary>Link fields: the sidebar whose records are linked, fixed once set. Lookup fields: the sidebar of their link field.</summary>
        public string? lookupSidebarId { get; set; }
        /// <summary>Link fields only: each record can link to several records.</summary>
        public bool linkMultiple { get; set; } = true;
        /// <summary>Lookup fields only: the link field of the same sidebar whose linked records are looked up.</summary>
        public Guid? lookupLinkFieldId { get; set; }
        /// <summary>Link and lookup fields: the field of the linked sidebar shown for each linked record.</summary>
        public Guid? lookupFieldId { get; set; }
        /// <summary>Lookup fields only: linked records can be previewed from an open record.</summary>
        public bool lookupPreview { get; set; } = true;
        /// <summary>Lookup fields only: the looked-up fields shown in the preview; kept while the preview is off. Null shows every field.</summary>
        public List<string>? lookupPreviewFieldIds { get; set; }

        public static FieldSettings Read(string? json) =>
            string.IsNullOrWhiteSpace(json) ? new() : JsonSerializer.Deserialize<FieldSettings>(json, Json) ?? new();

        public string Write() => JsonSerializer.Serialize(this, Json);
    }
}
