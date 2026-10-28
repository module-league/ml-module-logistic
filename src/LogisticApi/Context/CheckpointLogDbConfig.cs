using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ModuleLeague.Core.Context;

namespace LogisticApi.Context.Configurations
{
    public class CheckpointLogDbConfig : MLEntityConfig<CheckpointLog>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "checkpoint_log";

        protected override void ConfigureEntity(EntityTypeBuilder<CheckpointLog> b)
        {
            b.Property(e => e.dispatchId)
             .HasColumnName("dispatch_id")
             .IsRequired();

            b.Property(e => e.status)
             .HasColumnName("status")
             .HasMaxLength(20);

            b.Property(e => e.note)
             .HasColumnName("note")
             .HasMaxLength(2000);

            b.Property(e => e.internalOnly)
             .HasColumnName("internal_only")
             .HasDefaultValue(false)
             .IsRequired();

            b.Property(e => e.attachments)
             .HasColumnName("attachments")
             .IsRequired();

            b.ToTable(t =>
            {
                t.HasCheckConstraint(Ck("attachments_json"), "ISJSON([attachments]) = 1");
                t.HasCheckConstraint(Ck("status"), $"[status] IS NULL OR [status] IN ({string.Join(", ", CheckpointLog.Statuses.Select(s => $"'{s}'"))})");
            });

            b.HasIndex(e => e.dispatchId).HasDatabaseName(Ix("dispatch_id"));
        }
    }
}
