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

        // Same list as IField["type"] in web/src/services/fields/field.types.ts
        private static readonly string[] FieldTypes =
        [
            "text", "long_text", "number", "single_select", "multi_select", "checkbox",
            "date", "member", "lookup", "mirror", "templating", "associate", "attachment",
            "record_attachment", "sys_creator_id", "sys_create_time", "sys_updater_id",
            "sys_update_time", "sys_running_number",
        ];

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
                t.HasCheckConstraint(Ck("type"), $"[type] IN ({string.Join(", ", FieldTypes.Select(type => $"'{type}'"))})");
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
