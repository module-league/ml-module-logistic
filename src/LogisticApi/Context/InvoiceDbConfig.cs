using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ModuleLeague.Core.Context;

namespace LogisticApi.Context.Configurations
{
    public class InvoiceDbConfig : MLEntityConfig<Invoice>
    {
        public const string NumberSequence = "lg_invoice_no_seq";

        protected override string TablePrefix => "lg_";
        protected override string TableName => "invoice";

        protected override void ConfigureEntity(EntityTypeBuilder<Invoice> b)
        {
            b.Property(e => e.sequenceNo).HasColumnName("sequence_no").HasDefaultValueSql($"NEXT VALUE FOR [{NumberSequence}]");
            b.Property(e => e.shipmentId).HasColumnName("shipment_id").IsRequired();
            b.Property(e => e.dispatchId).HasColumnName("dispatch_id");
            b.Property(e => e.partyId).HasColumnName("party_id").IsRequired();
            b.Property(e => e.partyName).HasColumnName("party_name").HasMaxLength(200).IsRequired();
            b.Property(e => e.partyRegistrationNo).HasColumnName("party_registration_no").HasMaxLength(100);
            b.Property(e => e.partyTaxId).HasColumnName("party_tax_id").HasMaxLength(100);
            b.Property(e => e.partyAddress).HasColumnName("party_address").HasMaxLength(1000);
            b.Property(e => e.partyEmail).HasColumnName("party_email").HasMaxLength(200);
            b.Property(e => e.creditTermsDays).HasColumnName("credit_terms_days");
            b.Property(e => e.status).HasColumnName("status").HasMaxLength(10).HasDefaultValue(Invoice.Draft).IsRequired();
            b.Property(e => e.issueDate).HasColumnName("issue_date");
            b.Property(e => e.dueDate).HasColumnName("due_date");
            b.Property(e => e.currency).HasColumnName("currency").HasMaxLength(3).IsRequired();
            b.Property(e => e.subtotal).HasColumnName("subtotal").HasPrecision(18, 2);
            b.Property(e => e.taxAmount).HasColumnName("tax_amount").HasPrecision(18, 2);
            b.Property(e => e.total).HasColumnName("total").HasPrecision(18, 2);
            b.Property(e => e.sentAt).HasColumnName("sent_at");
            b.Property(e => e.paidAt).HasColumnName("paid_at");
            b.Property(e => e.eInvoiceRef).HasColumnName("e_invoice_ref").HasMaxLength(100);
            b.Property(e => e.voidedAt).HasColumnName("voided_at");
            b.Property(e => e.voidReason).HasColumnName("void_reason").HasMaxLength(500);
            b.Property(e => e.pricing).HasColumnName("pricing").IsRequired();
            b.Ignore(e => e.InvoiceNo);

            b.ToTable(t =>
            {
                t.HasCheckConstraint(Ck("status"), $"[status] IN ({ExceptionCaseDbConfig.InList(Invoice.Statuses)})");
                t.HasCheckConstraint(Ck("sent"), $"[status] = '{Invoice.Draft}' OR [status] = '{Invoice.Void}' OR ([sent_at] IS NOT NULL AND [issue_date] IS NOT NULL AND [due_date] IS NOT NULL)");
                t.HasCheckConstraint(Ck("paid"), $"[status] <> '{Invoice.Paid}' OR [paid_at] IS NOT NULL");
                t.HasCheckConstraint(Ck("void"), $"[status] <> '{Invoice.Void}' OR [void_reason] IS NOT NULL");
                t.HasCheckConstraint(Ck("total"), "[total] = [subtotal] + [tax_amount]");
                t.HasCheckConstraint(Ck("pricing_json"), "ISJSON([pricing]) = 1");
            });

            b.HasIndex(e => e.sequenceNo).HasDatabaseName(Ux("sequence_no")).IsUnique();
            // One shipment, one invoice that isn't void
            b.HasIndex(e => e.shipmentId)
             .HasDatabaseName(Ux("shipment_not_void"))
             .IsUnique()
             .HasFilter($"[status] <> '{Invoice.Void}' AND [ds_is_deleted] = 0");
            b.HasIndex(e => e.status).HasDatabaseName(Ix("status"));
        }
    }

    public class InvoiceLineDbConfig : MLEntityConfig<InvoiceLine>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "invoice_line";

        protected override void ConfigureEntity(EntityTypeBuilder<InvoiceLine> b)
        {
            b.Property(e => e.invoiceId).HasColumnName("invoice_id").IsRequired();
            b.Property(e => e.shipmentId).HasColumnName("shipment_id").IsRequired();
            b.Property(e => e.chargeKey).HasColumnName("charge_key").HasMaxLength(40).IsRequired();
            b.Property(e => e.description).HasColumnName("description").HasMaxLength(200).IsRequired();
            b.Property(e => e.basis).HasColumnName("basis").HasMaxLength(200).IsRequired();
            b.Property(e => e.qty).HasColumnName("qty").HasPrecision(18, 3);
            b.Property(e => e.unitPrice).HasColumnName("unit_price").HasPrecision(18, 4);
            b.Property(e => e.amount).HasColumnName("amount").HasPrecision(18, 2);
            b.Property(e => e.taxRate).HasColumnName("tax_rate").HasPrecision(5, 2);
            b.Property(e => e.sourceExceptionId).HasColumnName("source_exception_id");
            b.Property(e => e.sortOrder).HasColumnName("sort_order");

            b.HasIndex(e => e.invoiceId).HasDatabaseName(Ix("invoice_id"));
            b.HasIndex(e => e.shipmentId).HasDatabaseName(Ix("shipment_id"));
        }
    }

    public class PaymentDbConfig : MLEntityConfig<Payment>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "payment";

        protected override void ConfigureEntity(EntityTypeBuilder<Payment> b)
        {
            b.Property(e => e.invoiceId).HasColumnName("invoice_id").IsRequired();
            b.Property(e => e.amount).HasColumnName("amount").HasPrecision(18, 2);
            b.Property(e => e.paidAt).HasColumnName("paid_at").IsRequired();
            b.Property(e => e.method).HasColumnName("method").HasMaxLength(50).IsRequired();
            b.Property(e => e.reference).HasColumnName("reference").HasMaxLength(100);

            b.ToTable(t => t.HasCheckConstraint(Ck("amount"), "[amount] > 0"));
            b.HasIndex(e => e.invoiceId).HasDatabaseName(Ix("invoice_id"));
        }
    }

    public class BillingSettingDbConfig : MLEntityConfig<BillingSetting>
    {
        protected override string TablePrefix => "lg_";
        protected override string TableName => "billing_setting";

        protected override void ConfigureEntity(EntityTypeBuilder<BillingSetting> b)
        {
            b.Property(e => e.shipmentSidebarId).HasColumnName("shipment_sidebar_id").HasMaxLength(100).IsRequired();
            b.Property(e => e.billToFieldId).HasColumnName("bill_to_field_id");
            b.Property(e => e.zoneFieldId).HasColumnName("zone_field_id");
            b.Property(e => e.partyNameFieldId).HasColumnName("party_name_field_id");
            b.Property(e => e.partyAddressFieldId).HasColumnName("party_address_field_id");
            b.Property(e => e.partyEmailFieldId).HasColumnName("party_email_field_id");
            b.Property(e => e.partyTaxIdFieldId).HasColumnName("party_tax_id_field_id");
            b.Property(e => e.partyRegistrationFieldId).HasColumnName("party_registration_field_id");
            b.Property(e => e.partyCreditTermsFieldId).HasColumnName("party_credit_terms_field_id");

            b.HasIndex(e => e.shipmentSidebarId)
             .HasDatabaseName(Ux("shipment_sidebar_id"))
             .IsUnique()
             .HasFilter("[ds_is_deleted] = 0");
        }
    }
}
