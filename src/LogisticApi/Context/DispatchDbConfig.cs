using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ModuleLeague.Core.Context;

namespace LogisticApi.Context.Configurations
{
    public class DispatchDbConfig : MLEntityConfig<Dispatch>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "dispatch";

        protected override void ConfigureEntity(EntityTypeBuilder<Dispatch> b)
        {
            b.Property(e => e.shipmentId)
             .HasColumnName("shipment_id")
             .IsRequired();

            b.Property(e => e.driverId)
             .HasColumnName("driver_id")
             .IsRequired();

            b.Property(e => e.vehicleId)
             .HasColumnName("vehicle_id")
             .IsRequired();

            b.Property(e => e.originId)
             .HasColumnName("origin_id")
             .IsRequired();

            b.Property(e => e.destinationId)
             .HasColumnName("destination_id")
             .IsRequired();

            b.Property(e => e.plannedPickupAt)
             .HasColumnName("planned_pickup_at")
             .IsRequired();

            b.Property(e => e.plannedDeliveryAt)
             .HasColumnName("planned_delivery_at");

            b.Property(e => e.actualPickupAt)
             .HasColumnName("actual_pickup_at");

            b.Property(e => e.actualDeliveryAt)
             .HasColumnName("actual_delivery_at");

            b.Property(e => e.status)
             .HasColumnName("status")
             .HasMaxLength(20)
             .HasDefaultValue(Dispatch.DefaultStatus)
             .IsRequired();

            b.Property(e => e.notes)
             .HasColumnName("notes")
             .HasMaxLength(1000);

            b.ToTable(t =>
            {
                t.HasCheckConstraint(Ck("status"), $"[status] IN ({string.Join(", ", Dispatch.Statuses.Select(s => $"'{s}'"))})");
                t.HasCheckConstraint(Ck("origin_destination"), "[origin_id] <> [destination_id]");
            });

            b.HasIndex(e => e.shipmentId).HasDatabaseName(Ix("shipment_id"));
            b.HasIndex(e => e.driverId).HasDatabaseName(Ix("driver_id"));
            b.HasIndex(e => e.vehicleId).HasDatabaseName(Ix("vehicle_id"));
            b.HasIndex(e => e.status).HasDatabaseName(Ix("status"));
            b.HasIndex(e => e.plannedPickupAt).HasDatabaseName(Ix("planned_pickup_at"));
        }
    }
}
