using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ModuleLeague.Core.Context;

namespace LogisticApi.Context.Configurations
{
    public class ShipmentDocumentDbConfig : MLEntityConfig<ShipmentDocument>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "shipment_document";

        protected override void ConfigureEntity(EntityTypeBuilder<ShipmentDocument> b)
        {
            b.Property(e => e.shipmentId).HasColumnName("shipment_id").IsRequired();
            b.Property(e => e.dispatchId).HasColumnName("dispatch_id");
            b.Property(e => e.docType).HasColumnName("doc_type").HasMaxLength(40).IsRequired();
            b.Property(e => e.status).HasColumnName("status").HasMaxLength(20).HasDefaultValue(ShipmentDocument.Missing).IsRequired();
            b.Property(e => e.currentAttachmentId).HasColumnName("current_attachment_id");
            b.Property(e => e.version).HasColumnName("version").HasDefaultValue(0);
            b.Property(e => e.source).HasColumnName("source").HasMaxLength(20);
            b.Property(e => e.verifiedBy).HasColumnName("verified_by");
            b.Property(e => e.verifiedAt).HasColumnName("verified_at");
            b.Property(e => e.rejectReason).HasColumnName("reject_reason").HasMaxLength(500);
            b.Property(e => e.expiresAt).HasColumnName("expires_at");

            b.ToTable(t =>
            {
                t.HasCheckConstraint(Ck("status"), $"[status] IN ({ExceptionCaseDbConfig.InList(ShipmentDocument.Statuses)})");
                t.HasCheckConstraint(Ck("source"), $"[source] IS NULL OR [source] IN ({ExceptionCaseDbConfig.InList(ShipmentDocument.Sources)})");
                t.HasCheckConstraint(Ck("file"), $"[status] = '{ShipmentDocument.Missing}' OR [current_attachment_id] IS NOT NULL");
                t.HasCheckConstraint(Ck("verified"), $"[status] <> '{ShipmentDocument.Verified}' OR [verified_at] IS NOT NULL");
                t.HasCheckConstraint(Ck("rejected"), $"[status] <> '{ShipmentDocument.Rejected}' OR [reject_reason] IS NOT NULL");
            });

            // One document per type and shipment; Other holds any number of files
            b.HasIndex(e => new { e.shipmentId, e.docType })
             .HasDatabaseName(Ux("shipment_doc_type"))
             .IsUnique()
             .HasFilter($"[doc_type] <> '{ShipmentDocument.Other}' AND [ds_is_deleted] = 0");
            b.HasIndex(e => e.status).HasDatabaseName(Ix("status"));
        }
    }

    public class DocumentActivityDbConfig : MLEntityConfig<DocumentActivity>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "document_activity";

        protected override void ConfigureEntity(EntityTypeBuilder<DocumentActivity> b)
        {
            b.Property(e => e.documentId).HasColumnName("document_id").IsRequired();
            b.Property(e => e.shipmentId).HasColumnName("shipment_id").IsRequired();
            b.Property(e => e.kind).HasColumnName("kind").HasMaxLength(20).IsRequired();
            b.Property(e => e.actorId).HasColumnName("actor_id");
            b.Property(e => e.attachmentId).HasColumnName("attachment_id");
            b.Property(e => e.version).HasColumnName("version");
            b.Property(e => e.source).HasColumnName("source").HasMaxLength(20);
            b.Property(e => e.body).HasColumnName("body").HasMaxLength(500);

            b.ToTable(t =>
            {
                t.HasCheckConstraint(Ck("kind"), $"[kind] IN ({ExceptionCaseDbConfig.InList(DocumentActivity.Kinds)})");
                t.HasCheckConstraint(Ck("upload_file"), $"[kind] <> '{DocumentActivity.Uploaded}' OR [attachment_id] IS NOT NULL");
            });
            b.HasIndex(e => e.documentId).HasDatabaseName(Ix("document_id"));
            b.HasIndex(e => e.shipmentId).HasDatabaseName(Ix("shipment_id"));
        }
    }

    public class DocumentSettingDbConfig : MLEntityConfig<DocumentSetting>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "document_setting";

        protected override void ConfigureEntity(EntityTypeBuilder<DocumentSetting> b)
        {
            b.Property(e => e.shipmentSidebarId).HasColumnName("shipment_sidebar_id").HasMaxLength(100).IsRequired();
            b.Property(e => e.incotermFieldId).HasColumnName("incoterm_field_id");
            b.Property(e => e.attachmentFieldId).HasColumnName("attachment_field_id");
            b.Property(e => e.rules)
             .HasColumnName("rules")
             .HasColumnType("nvarchar(max)")
             .HasDefaultValue(DocumentRules.EmptyJson)
             .IsRequired();

            b.ToTable(t => t.HasCheckConstraint(Ck("rules_json"), "ISJSON([rules]) = 1"));
            b.HasIndex(e => e.shipmentSidebarId)
             .HasDatabaseName(Ux("shipment_sidebar_id"))
             .IsUnique()
             .HasFilter("[ds_is_deleted] = 0");
        }
    }
}
