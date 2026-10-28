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
        public virtual DbSet<SidebarForm> SidebarForms { get; set; } = null!;
        public virtual DbSet<SidebarDashboard> SidebarDashboards { get; set; } = null!;
        public virtual DbSet<Attachment> Attachments { get; set; } = null!;
        public virtual DbSet<Dispatch> Dispatches { get; set; } = null!;
        public virtual DbSet<DispatchSetting> DispatchSettings { get; set; } = null!;
        public virtual DbSet<CheckpointLog> CheckpointLogs { get; set; } = null!;
        public virtual DbSet<ExceptionCase> ExceptionCases { get; set; } = null!;
        public virtual DbSet<ExceptionActivity> ExceptionActivities { get; set; } = null!;
        public virtual DbSet<ExceptionSetting> ExceptionSettings { get; set; } = null!;
        public virtual DbSet<ShipmentDocument> ShipmentDocuments { get; set; } = null!;
        public virtual DbSet<DocumentActivity> DocumentActivities { get; set; } = null!;
        public virtual DbSet<DocumentSetting> DocumentSettings { get; set; } = null!;
        public virtual DbSet<Invoice> Invoices { get; set; } = null!;
        public virtual DbSet<InvoiceLine> InvoiceLines { get; set; } = null!;
        public virtual DbSet<Payment> Payments { get; set; } = null!;
        public virtual DbSet<BillingSetting> BillingSettings { get; set; } = null!;
        //public virtual DbSet<JobOrder> JobOrders { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.HasSequence<int>(Configurations.InvoiceDbConfig.NumberSequence).StartsAt(1);

            // MLAuditFieldsInterceptor (ModuleLeague.Core 1.0.3) soft-deletes by marking every column modified,
            // and SQL Server refuses to update the ds_doc_id identity column. Remove once fixed in ml-backend-base.
            foreach (var entity in modelBuilder.Model.GetEntityTypes().Where(t => typeof(MLEntityBase).IsAssignableFrom(t.ClrType)))
                entity.FindProperty(nameof(MLEntityBase.DocId))?.SetAfterSaveBehavior(PropertySaveBehavior.Ignore);
        }
    }
}
