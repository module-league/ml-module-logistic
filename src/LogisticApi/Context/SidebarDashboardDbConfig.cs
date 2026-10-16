using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ModuleLeague.Core.Context;

namespace LogisticApi.Context.Configurations
{
    public class SidebarDashboardDbConfig : MLEntityConfig<SidebarDashboard>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "sidebar_dashboard";

        protected override void ConfigureEntity(EntityTypeBuilder<SidebarDashboard> b)
        {
            b.Property(e => e.sidebarId)
             .HasColumnName("sidebar_id")
             .HasMaxLength(100)
             .IsRequired();

            b.Property(e => e.title)
             .HasColumnName("title")
             .HasMaxLength(80);

            b.Property(e => e.description)
             .HasColumnName("description")
             .HasMaxLength(200);

            b.Property(e => e.dateRange)
             .HasColumnName("date_range")
             .HasMaxLength(20)
             .IsRequired();

            b.Property(e => e.rangeSidebarId)
             .HasColumnName("range_sidebar_id")
             .HasMaxLength(100);

            b.Property(e => e.rangeFieldId)
             .HasColumnName("range_field_id");

            b.Property(e => e.newRecordSidebarId)
             .HasColumnName("new_record_sidebar_id")
             .HasMaxLength(100);

            b.Property(e => e.newRecordLabel)
             .HasColumnName("new_record_label")
             .HasMaxLength(40);

            b.Property(e => e.widgets)
             .HasColumnName("widgets")
             .IsRequired();

            b.ToTable(t => t.HasCheckConstraint(Ck("widgets_json"), "ISJSON([widgets]) = 1"));

            // One overview per sidebar
            b.HasIndex(e => e.sidebarId)
             .IsUnique()
             .HasFilter("[ds_is_deleted] = 0")
             .HasDatabaseName(Ux("sidebar_id"));
        }
    }
}
