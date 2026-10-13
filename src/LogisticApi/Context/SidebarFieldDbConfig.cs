using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ModuleLeague.Core.Context;

namespace LogisticApi.Context.Configurations
{
    public class SidebarFieldDbConfig : MLEntityConfig<SidebarField>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "sidebar_field";

        protected override void ConfigureEntity(EntityTypeBuilder<SidebarField> b)
        {
            // Columns
            b.Property(e => e.sidebarId)
             .HasColumnName("sidebar_id")
             .HasMaxLength(100)
             .IsRequired();

            b.Property(e => e.sidebarName)
             .HasColumnName("name")
             .HasMaxLength(40)
             .IsRequired();

            b.Property(e => e.sidebarDescription)
             .HasColumnName("description")
             .HasMaxLength(500);

            b.Property(e => e.type)
             .HasColumnName("type")
             .HasMaxLength(30)
             .IsRequired();

            b.Property(e => e.displayOrder)
             .HasColumnName("display_order");

            b.Property(e => e.isPrimaryField)
             .HasColumnName("is_primary_field");

            b.Property(e => e.isEditable)
             .HasColumnName("is_editable");

            b.Property(e => e.isSystemField)
             .HasColumnName("is_system_field");

            b.Property(e => e.settings)
             .HasColumnName("settings");

            b.ToTable(t =>
            {
                t.HasCheckConstraint(Ck("type"), $"[type] IN ({string.Join(", ", FieldTypes.All.Select(type => $"'{type}'"))})");
                t.HasCheckConstraint(Ck("settings_json"), "ISJSON([settings]) = 1");
            });

            // A name is unique within one sidebar; deleted fields free their name
            b.HasIndex(e => new { e.sidebarId, e.sidebarName })
             .IsUnique()
             .HasFilter("[ds_is_deleted] = 0")
             .HasDatabaseName(Ux("sidebar_id_name"));

            b.HasIndex(e => new { e.sidebarId, e.displayOrder })
             .HasDatabaseName(Ix("sidebar_id_display_order"));
        }
    }
}
