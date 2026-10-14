using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ModuleLeague.Core.Context;

namespace LogisticApi.Context.Configurations
{
    public class SidebarRecordDbConfig : MLEntityConfig<SidebarRecord>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "logistic";  

        protected override void ConfigureEntity(EntityTypeBuilder<SidebarRecord> b)
        {
            // Columns
            b.Property(e => e.sidebarId)
             .HasColumnName("sidebar_id")
             .HasMaxLength(100)
             .IsRequired();

            b.HasIndex(e => e.sidebarId).HasDatabaseName(Ix("sidebar_id"));
        }
    }
}