using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ModuleLeague.Core.Context;

namespace LogisticApi.Context.Configurations
{
    public class SidebarFieldOptionDbConfig : MLEntityConfig<SidebarFieldOption>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "sidebar_field_option";

        protected override void ConfigureEntity(EntityTypeBuilder<SidebarFieldOption> b)
        {
            // Columns
            b.Property(e => e.fieldObjId)
             .HasColumnName("field_obj_id")
             .IsRequired();

            b.Property(e => e.value)
             .HasColumnName("value")
             .HasMaxLength(100)
             .IsRequired();

            b.Property(e => e.colorCode)
             .HasColumnName("color_code")
             .HasMaxLength(7);

            b.Property(e => e.displayOrder)
             .HasColumnName("display_order");

            b.ToTable(t =>
                t.HasCheckConstraint(Ck("color_code_hex"),
                    "[color_code] IS NULL OR [color_code] LIKE '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'"));

            // An option text is unique within one field; deleted options free their text
            b.HasIndex(e => new { e.fieldObjId, e.value })
             .IsUnique()
             .HasFilter("[ds_is_deleted] = 0")
             .HasDatabaseName(Ux("field_obj_id_value"));

            b.HasIndex(e => new { e.fieldObjId, e.displayOrder })
             .HasDatabaseName(Ix("field_obj_id_display_order"));

            // Options are soft deleted with their field in code, never cascaded
            b.HasOne(e => e.field)
             .WithMany(f => f.options)
             .HasForeignKey(e => e.fieldObjId)
             .HasPrincipalKey(f => f.ObjId)
             .OnDelete(DeleteBehavior.Restrict)
             .HasConstraintName(Fk("sidebar_field"));
        }
    }
}
