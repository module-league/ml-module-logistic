using System.Text.Json;
using LogisticApi.Models;

namespace LogisticApi.MVVM
{
    /// <summary>Matches IDispatchSettings in web/src/services/dispatches/dispatch.types.ts.</summary>
    public class DispatchSettingsResponse
    {
        /// <summary>Null until first saved.</summary>
        public Guid? objId { get; set; }
        public string shipmentSidebarId { get; set; } = string.Empty;
        public Guid? titleFieldId { get; set; }
        public Guid? originFieldId { get; set; }
        public Guid? destinationFieldId { get; set; }
        public Guid? badgeFieldId { get; set; }
        public Guid? weightFieldId { get; set; }
        public List<Guid> detailFieldIds { get; set; } = [];
        /// <summary>0 until first saved; the web app then picks the fields itself.</summary>
        public int versionNo { get; set; }

        public static DispatchSettingsResponse Empty(string shipmentSidebarId) => new() { shipmentSidebarId = shipmentSidebarId };

        public static DispatchSettingsResponse From(DispatchSetting setting) => new()
        {
            objId = setting.ObjId,
            shipmentSidebarId = setting.shipmentSidebarId,
            titleFieldId = setting.titleFieldId,
            originFieldId = setting.originFieldId,
            destinationFieldId = setting.destinationFieldId,
            badgeFieldId = setting.badgeFieldId,
            weightFieldId = setting.weightFieldId,
            detailFieldIds = JsonSerializer.Deserialize<List<Guid>>(setting.detailFieldIds) ?? [],
            versionNo = setting.VersionNo,
        };
    }
}
