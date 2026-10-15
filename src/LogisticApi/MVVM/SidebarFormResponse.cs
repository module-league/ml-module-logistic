using System.Text.Json;
using LogisticApi.Models;

namespace LogisticApi.MVVM
{
    /// <summary>Matches ISidebarForm in web/src/services/forms/form.types.ts.</summary>
    public class SidebarFormResponse
    {
        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        public Guid objId { get; set; }
        public string sidebarId { get; set; } = string.Empty;
        public string formTitle { get; set; } = string.Empty;
        public string? formDescription { get; set; }
        public bool isHidden { get; set; }
        public bool isDefault { get; set; }
        public int displayOrder { get; set; }
        public Guid? coverImageId { get; set; }
        public Guid? logoId { get; set; }
        public string submitLabel { get; set; } = SidebarForm.DefaultSubmitLabel;
        public string clearLabel { get; set; } = SidebarForm.DefaultClearLabel;
        /// <summary>Fields deleted since the form was saved are left out.</summary>
        public List<SidebarFormField> fields { get; set; } = [];
        public int versionNo { get; set; }
        public DateTime createTime { get; set; }
        public DateTime? updateTime { get; set; }

        public static SidebarFormResponse From(SidebarForm form, ISet<Guid> liveFieldIds) => new()
        {
            objId = form.ObjId,
            sidebarId = form.sidebarId,
            formTitle = form.formTitle,
            formDescription = form.formDescription,
            isHidden = form.isHidden,
            isDefault = form.isDefault,
            displayOrder = form.displayOrder,
            coverImageId = form.coverImageId,
            logoId = form.logoId,
            submitLabel = form.submitLabel ?? SidebarForm.DefaultSubmitLabel,
            clearLabel = form.clearLabel ?? SidebarForm.DefaultClearLabel,
            fields = (JsonSerializer.Deserialize<List<SidebarFormField>>(form.fields, Json) ?? []).Where(f => liveFieldIds.Contains(f.fieldId)).ToList(),
            versionNo = form.VersionNo,
            createTime = DateTime.SpecifyKind(form.CreateTime, DateTimeKind.Utc),
            updateTime = form.UpdateTime is { } updated ? DateTime.SpecifyKind(updated, DateTimeKind.Utc) : null,
        };
    }
}
