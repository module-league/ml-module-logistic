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

        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        public string dateFormat { get; set; } = "dd/MM/yyyy";
        public bool displayTime { get; set; }
        public string timeFormat { get; set; } = "hh:mm a";
        public string? color { get; set; }

        public static FieldSettings Read(string? json) =>
            string.IsNullOrWhiteSpace(json) ? new() : JsonSerializer.Deserialize<FieldSettings>(json, Json) ?? new();

        public string Write() => JsonSerializer.Serialize(this, Json);
    }
}
