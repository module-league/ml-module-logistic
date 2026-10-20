using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ModuleLeague.Core.Context;

namespace LogisticApi.Context.Configurations
{
    public class DispatchSettingDbConfig : MLEntityConfig<DispatchSetting>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "dispatch_setting";

        protected override void ConfigureEntity(EntityTypeBuilder<DispatchSetting> b)
        {
            b.Property(e => e.shipmentSidebarId)
             .HasColumnName("shipment_sidebar_id")
             .HasMaxLength(100)
             .IsRequired();

            b.Property(e => e.titleFieldId)
             .HasColumnName("title_field_id");

            b.Property(e => e.originFieldId)
             .HasColumnName("origin_field_id");

            b.Property(e => e.destinationFieldId)
             .HasColumnName("destination_field_id");

            b.Property(e => e.badgeFieldId)
             .HasColumnName("badge_field_id");

            b.Property(e => e.weightFieldId)
             .HasColumnName("weight_field_id");

            b.Property(e => e.detailFieldIds)
             .HasColumnName("detail_field_ids")
             .IsRequired();

            b.ToTable(t => t.HasCheckConstraint(Ck("detail_field_ids_json"), "ISJSON([detail_field_ids]) = 1"));

            // One setting per shipment sidebar
            b.HasIndex(e => e.shipmentSidebarId)
             .IsUnique()
             .HasFilter("[ds_is_deleted] = 0")
             .HasDatabaseName(Ux("shipment_sidebar_id"));
        }
    }
}
