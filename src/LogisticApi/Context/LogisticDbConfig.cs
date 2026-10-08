using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ModuleLeague.Core.Context;

namespace LogisticApi.Context.Configurations
{
    public class LogisticDbConfig : MLEntityConfig<Logistic>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "logistic";  

        protected override void ConfigureEntity(EntityTypeBuilder<Logistic> b)
        {
            // Columns
            b.Property(e => e.TrackingNo)
             .HasColumnName("tracking_no")
             .HasMaxLength(50)
             .IsRequired();

            b.Property(e => e.Origin)
             .HasColumnName("origin")
             .HasMaxLength(200)
             .IsRequired();

            b.Property(e => e.Destination)
             .HasColumnName("destination")
             .HasMaxLength(200)
             .IsRequired();

            b.Property(e => e.Status)
             .HasColumnName("status")
             .HasMaxLength(30)
             .IsRequired()
             .HasDefaultValue("Pending");

            b.HasIndex(e => e.Status)
             .HasDatabaseName(Ix("status"));

           
        }
    }
}