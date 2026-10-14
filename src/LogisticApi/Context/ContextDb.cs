using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using ModuleLeague.Core.Context;
using ModuleLeague.Core.Entities;

namespace LogisticApi.Context
{
    public class ContextDb : MLDbContext
    {
        // The constructor passes configuration options down to the base context
        public ContextDb(DbContextOptions<ContextDb> options) : base(options)
        {
        }

        // Define your database tables here
        public virtual DbSet<SidebarRecord> SidebarRecords { get; set; } = null!;
        public virtual DbSet<SidebarField> SidebarFields { get; set; } = null!;
        public virtual DbSet<SidebarFieldOption> SidebarFieldOptions { get; set; } = null!;
        public virtual DbSet<Attachment> Attachments { get; set; } = null!;
        //public virtual DbSet<JobOrder> JobOrders { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // MLAuditFieldsInterceptor (ModuleLeague.Core 1.0.3) soft-deletes by marking every column modified,
            // and SQL Server refuses to update the ds_doc_id identity column. Remove once fixed in ml-backend-base.
            foreach (var entity in modelBuilder.Model.GetEntityTypes().Where(t => typeof(MLEntityBase).IsAssignableFrom(t.ClrType)))
                entity.FindProperty(nameof(MLEntityBase.DocId))?.SetAfterSaveBehavior(PropertySaveBehavior.Ignore);
        }
    }
}
