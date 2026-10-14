using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ModuleLeague.Core.Context;

namespace LogisticApi.Context.Configurations
{
    public class AttachmentDbConfig : MLEntityConfig<Attachment>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "attachment";

        protected override void ConfigureEntity(EntityTypeBuilder<Attachment> b)
        {
            b.Property(e => e.refId)
             .HasColumnName("ref_id")
             .HasMaxLength(100)
             .IsRequired();

            b.Property(e => e.fileName)
             .HasColumnName("file_name")
             .HasMaxLength(255)
             .IsRequired();

            b.Property(e => e.fileType)
             .HasColumnName("file_type")
             .HasMaxLength(100)
             .IsRequired();

            b.Property(e => e.fileExtension)
             .HasColumnName("file_extension")
             .HasMaxLength(20)
             .IsRequired();

            b.Property(e => e.fileSize)
             .HasColumnName("file_size")
             .HasPrecision(18, 2);

            b.Property(e => e.attachmentVersion)
             .HasColumnName("attachment_version")
             .HasDefaultValue(1);

            b.Property(e => e.storagePath)
             .HasColumnName("storage_path")
             .HasMaxLength(260)
             .IsRequired();

            b.HasIndex(e => e.refId)
             .HasDatabaseName(Ix("ref_id"));
        }
    }
}
