using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ModuleLeague.Core.Context;

namespace LogisticApi.Context.Configurations
{
    public class ExceptionCaseDbConfig : MLEntityConfig<ExceptionCase>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "shipment_exception";

        protected override void ConfigureEntity(EntityTypeBuilder<ExceptionCase> b)
        {
            b.Property(e => e.shipmentId).HasColumnName("shipment_id").IsRequired();
            b.Property(e => e.dispatchId).HasColumnName("dispatch_id");
            b.Property(e => e.ruleKey).HasColumnName("rule_key").HasMaxLength(40).IsRequired();
            b.Property(e => e.type).HasColumnName("type").HasMaxLength(30).IsRequired();
            b.Property(e => e.severity).HasColumnName("severity").HasMaxLength(10).IsRequired();
            b.Property(e => e.status).HasColumnName("status").HasMaxLength(20).HasDefaultValue(ExceptionCase.Open).IsRequired();
            b.Property(e => e.title).HasColumnName("title").HasMaxLength(200).IsRequired();
            b.Property(e => e.ownerId).HasColumnName("owner_id");
            b.Property(e => e.respondBy).HasColumnName("respond_by").IsRequired();
            b.Property(e => e.snoozedUntil).HasColumnName("snoozed_until");
            b.Property(e => e.resolvedAt).HasColumnName("resolved_at");
            b.Property(e => e.resolvedBy).HasColumnName("resolved_by");
            b.Property(e => e.resolutionReason).HasColumnName("resolution_reason").HasMaxLength(200);
            b.Property(e => e.facts).HasColumnName("facts").IsRequired();
            b.Property(e => e.factsKey).HasColumnName("facts_key").HasMaxLength(1000).IsRequired();

            b.ToTable(t =>
            {
                t.HasCheckConstraint(Ck("severity"), $"[severity] IN ({InList(ExceptionCase.Severities)})");
                t.HasCheckConstraint(Ck("status"), $"[status] IN ({InList(ExceptionCase.Statuses)})");
                t.HasCheckConstraint(Ck("resolved_reason"), $"[status] <> '{ExceptionCase.Resolved}' OR [resolution_reason] IS NOT NULL");
                t.HasCheckConstraint(Ck("snoozed_until"), $"[status] <> '{ExceptionCase.Snoozed}' OR [snoozed_until] IS NOT NULL");
                t.HasCheckConstraint(Ck("facts_json"), "ISJSON([facts]) = 1");
            });

            // Never a second unresolved exception for the same shipment and rule
            b.HasIndex(e => new { e.shipmentId, e.ruleKey })
             .HasDatabaseName(Ux("shipment_rule_unresolved"))
             .IsUnique()
             .HasFilter($"[status] <> '{ExceptionCase.Resolved}' AND [ds_is_deleted] = 0");
            b.HasIndex(e => e.dispatchId).HasDatabaseName(Ix("dispatch_id"));
            b.HasIndex(e => e.status).HasDatabaseName(Ix("status"));
            b.HasIndex(e => e.ruleKey).HasDatabaseName(Ix("rule_key"));
        }

        internal static string InList(string[] values) => string.Join(", ", values.Select(v => $"'{v}'"));
    }

    public class ExceptionActivityDbConfig : MLEntityConfig<ExceptionActivity>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "exception_activity";

        protected override void ConfigureEntity(EntityTypeBuilder<ExceptionActivity> b)
        {
            b.Property(e => e.exceptionId).HasColumnName("exception_id").IsRequired();
            b.Property(e => e.kind).HasColumnName("kind").HasMaxLength(20).IsRequired();
            b.Property(e => e.actorId).HasColumnName("actor_id");
            b.Property(e => e.body).HasColumnName("body").HasMaxLength(2000);

            b.ToTable(t => t.HasCheckConstraint(Ck("kind"), $"[kind] IN ({ExceptionCaseDbConfig.InList(ExceptionActivity.Kinds)})"));
            b.HasIndex(e => e.exceptionId).HasDatabaseName(Ix("exception_id"));
        }
    }

    public class ExceptionSettingDbConfig : MLEntityConfig<ExceptionSetting>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "exception_setting";

        protected override void ConfigureEntity(EntityTypeBuilder<ExceptionSetting> b)
        {
            b.Property(e => e.shipmentSidebarId).HasColumnName("shipment_sidebar_id").HasMaxLength(100).IsRequired();
            b.Property(e => e.etaFieldId).HasColumnName("eta_field_id");
            b.Property(e => e.chargeableWeightFieldId).HasColumnName("chargeable_weight_field_id");
            b.Property(e => e.modeFieldId).HasColumnName("mode_field_id");
            b.Property(e => e.openingHourFieldId).HasColumnName("opening_hour_field_id");
            b.Property(e => e.locationPhoneFieldId).HasColumnName("location_phone_field_id");
            b.Property(e => e.driverPhoneFieldId).HasColumnName("driver_phone_field_id");

            b.HasIndex(e => e.shipmentSidebarId)
             .HasDatabaseName(Ux("shipment_sidebar_id"))
             .IsUnique()
             .HasFilter("[ds_is_deleted] = 0");
        }
    }
}
