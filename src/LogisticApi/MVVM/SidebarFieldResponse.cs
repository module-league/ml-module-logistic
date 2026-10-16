using LogisticApi.Models;

namespace LogisticApi.MVVM
{
    /// <summary>Matches IFieldDropDownValue in web/src/services/fields/field.types.ts.</summary>
    public class SidebarFieldOptionResponse
    {
        public Guid id { get; set; }
        public string value { get; set; } = string.Empty;
        public Guid fieldId { get; set; }
        public string? colorCode { get; set; }
        public DateTime createDate { get; set; }
        public int displayOrder { get; set; }

        public static SidebarFieldOptionResponse From(SidebarFieldOption option) => new()
        {
            id = option.ObjId,
            value = option.value,
            fieldId = option.fieldObjId,
            colorCode = option.colorCode,
            createDate = option.CreateTime,
            displayOrder = option.displayOrder,
        };
    }

    /// <summary>Matches IField in web/src/services/fields/field.types.ts, plus objId and versionNo.</summary>
    public class SidebarMemberSettingsResponse
    {
        public bool multiple { get; set; }
    }

    public class SidebarNumberSettingsResponse
    {
        /// <summary>Only set for currency fields.</summary>
        public string? symbol { get; set; }
        /// <summary>Null shows the decimals as typed.</summary>
        public int? decimalPlaces { get; set; }
        public string abbreviation { get; set; } = string.Empty;
    }

    public class SidebarFormulaSettingsResponse
    {
        public string expression { get; set; } = string.Empty;
    }

    public class SidebarLookupSettingsResponse
    {
        /// <summary>The sidebarId whose records are linked; for a lookup, the sidebar of its link field.</summary>
        public string? categoryId { get; set; }
        /// <summary>Link fields only.</summary>
        public bool? multiple { get; set; }
        /// <summary>Lookup fields only: the link field it looks up through.</summary>
        public Guid? linkFieldId { get; set; }
        public Guid? lookupFieldId { get; set; }
        public bool previewEnabled { get; set; } = true;
        /// <summary>Null when never picked: the preview shows every field.</summary>
        public List<string>? previewFieldIds { get; set; }
    }

    public class SidebarFieldResponse
    {
        public Guid objId { get; set; }
        public string sidebarId { get; set; } = string.Empty;
        public string name { get; set; } = string.Empty;
        public string? description { get; set; }
        public string type { get; set; } = string.Empty;
        public int displayOrder { get; set; }

        public bool isPrimaryField { get; set; }
        public bool isEditable { get; set; }
        public bool isSystemField { get; set; }
        public bool isSelectionField { get; set; }
        public bool isMultiSelectField { get; set; }
        public bool isDateField { get; set; }
        public bool isUserField { get; set; }
        public bool isNumeric { get; set; }
        public bool isVirtualField { get; set; }
        public bool isForeignField { get; set; }
        public bool isPlainField { get; set; }

        public string dateFormat { get; set; } = string.Empty;
        public bool displayTime { get; set; }
        public string timeFormat { get; set; } = string.Empty;
        public string? color { get; set; }
        /// <summary>Only set for member fields.</summary>
        public SidebarMemberSettingsResponse? memberSettings { get; set; }
        /// <summary>Only set for number, currency and formula fields.</summary>
        public SidebarNumberSettingsResponse? numberSettings { get; set; }
        /// <summary>Only set for formula fields.</summary>
        public SidebarFormulaSettingsResponse? formulaSettings { get; set; }
        /// <summary>Only set for link and lookup fields.</summary>
        public SidebarLookupSettingsResponse? lookupSettings { get; set; }

        public List<SidebarFieldOptionResponse> dropDownValues { get; set; } = [];

        public int versionNo { get; set; }
        public DateTime createTime { get; set; }
        public DateTime? updateTime { get; set; }

        public static SidebarFieldResponse From(SidebarField field)
        {
            var settings = FieldSettings.Read(field.settings);
            return new()
            {
                objId = field.ObjId,
                sidebarId = field.sidebarId,
                name = field.sidebarName,
                description = field.sidebarDescription,
                type = field.type,
                displayOrder = field.displayOrder,
                isPrimaryField = field.isPrimaryField,
                isEditable = field.isEditable,
                isSystemField = field.isSystemField,
                isSelectionField = FieldTypes.IsSelection(field.type),
                isMultiSelectField = FieldTypes.IsMultiSelect(field.type),
                isDateField = FieldTypes.IsDate(field.type),
                isUserField = FieldTypes.IsUser(field.type),
                isNumeric = FieldTypes.IsNumeric(field.type),
                isVirtualField = FieldTypes.IsVirtual(field.type),
                isForeignField = FieldTypes.IsForeign(field.type),
                isPlainField = FieldTypes.IsPlain(field.type),
                dateFormat = settings.dateFormat,
                displayTime = settings.displayTime,
                timeFormat = settings.timeFormat,
                color = settings.color,
                memberSettings = field.type == "member" ? new() { multiple = settings.multipleMembers } : null,
                numberSettings = field.type is "number" or "currency" or "formula"
                    ? new()
                    {
                        symbol = field.type == "currency" ? settings.currencySymbol : null,
                        decimalPlaces = settings.decimalPlaces ?? (field.type == "currency" ? 2 : null),
                        abbreviation = settings.abbreviation,
                    }
                    : null,
                formulaSettings = FieldTypes.IsFormula(field.type)
                    ? new() { expression = settings.formulaExpression ?? string.Empty }
                    : null,
                lookupSettings = FieldTypes.IsLink(field.type)
                    ? new()
                    {
                        categoryId = settings.lookupSidebarId,
                        multiple = settings.linkMultiple,
                        lookupFieldId = settings.lookupFieldId,
                        previewFieldIds = settings.lookupPreviewFieldIds,
                    }
                    : FieldTypes.IsLookup(field.type)
                        ? new()
                        {
                            categoryId = settings.lookupSidebarId,
                            linkFieldId = settings.lookupLinkFieldId,
                            lookupFieldId = settings.lookupFieldId,
                            previewEnabled = settings.lookupPreview,
                            previewFieldIds = settings.lookupPreviewFieldIds,
                        }
                        : null,
                dropDownValues = field.options
                    .Where(option => !option.IsDeleted)
                    .OrderBy(option => option.displayOrder)
                    .Select(SidebarFieldOptionResponse.From)
                    .ToList(),
                versionNo = field.VersionNo,
                createTime = field.CreateTime,
                updateTime = field.UpdateTime,
            };
        }
    }
}
