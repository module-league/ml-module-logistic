using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ModuleLeague.Core.Context;

namespace LogisticApi.Context.Configurations
{
    public class SidebarFormDbConfig : MLEntityConfig<SidebarForm>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "sidebar_form";

        protected override void ConfigureEntity(EntityTypeBuilder<SidebarForm> b)
        {
            b.Property(e => e.sidebarId)
             .HasColumnName("sidebar_id")
             .HasMaxLength(100)
             .IsRequired();

            b.Property(e => e.formTitle)
             .HasColumnName("form_title")
             .HasMaxLength(80)
             .IsRequired();

            b.Property(e => e.formDescription)
             .HasColumnName("form_description")
             .HasMaxLength(500);

            b.Property(e => e.isHidden)
             .HasColumnName("is_hidden");

            b.Property(e => e.isDefault)
             .HasColumnName("is_default");

            b.Property(e => e.displayOrder)
             .HasColumnName("display_order");

            b.Property(e => e.fields)
             .HasColumnName("fields")
             .IsRequired();

            b.ToTable(t => t.HasCheckConstraint(Ck("fields_json"), "ISJSON([fields]) = 1"));

            // One default form per sidebar
            b.HasIndex(e => e.sidebarId)
             .IsUnique()
             .HasFilter("[is_default] = 1 AND [ds_is_deleted] = 0")
             .HasDatabaseName(Ux("sidebar_id_default"));

            b.HasIndex(e => new { e.sidebarId, e.displayOrder })
             .HasDatabaseName(Ix("sidebar_id_display_order"));
        }
    }
}
