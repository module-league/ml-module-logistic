namespace LogisticApi.Models
{
    /// <summary>
    /// The IField["type"] values from web/src/services/fields/field.types.ts, and the flags that follow from a type.
    /// </summary>
    public static class FieldTypes
    {
        public static readonly string[] All =
        [
            "text", "long_text", "number", "single_select", "multi_select", "checkbox",
            "date", "time", "member", "link_table", "lookup", "mirror", "templating", "currency", "associate", "attachment",
            "record_attachment", "sys_creator_id", "sys_create_time", "sys_updater_id",
            "sys_update_time", "sys_running_number",
        ];

        public static bool IsKnown(string type) => All.Contains(type);

        public static bool HasOptions(string type) => type is "single_select" or "multi_select";

        public static bool IsSelection(string type) => type == "single_select";

        public static bool IsMultiSelect(string type) => type == "multi_select";

        /// <summary>Stores links to records of one sidebar, its own included.</summary>
        public static bool IsLink(string type) => type == "link_table";

        /// <summary>Stores nothing: shows a field of the records a link field of the same sidebar links to.</summary>
        public static bool IsLookup(string type) => type == "lookup";

        /// <summary>The field types a lookup can show for each linked record: plain values that read as text.</summary>
        public static bool CanShowInLookup(string type) => IsPlain(type) && type is not ("attachment" or "checkbox");

        public static bool IsDate(string type) => type is "date" or "sys_create_time" or "sys_update_time";

        public static bool IsUser(string type) => type is "member" or "sys_creator_id" or "sys_updater_id";

        public static bool IsNumeric(string type) => type is "number" or "currency" or "sys_running_number";

        public static bool IsVirtual(string type) => type is "lookup" or "mirror" or "templating";

        public static bool IsForeign(string type) => type is "link_table" or "lookup" or "mirror";

        public static bool IsPlain(string type) =>
            type is "text" or "long_text" or "number" or "single_select" or "multi_select" or "checkbox" or "date" or "time" or "member" or "currency" or "attachment";
    }
}
