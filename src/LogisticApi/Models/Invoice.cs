using ModuleLeague.Core.Entities;

namespace LogisticApi.Models
{
    /// <summary>
    /// An invoice for one delivered shipment (lg_invoice). Its lines, party and pricing are copied when it's created, so later rate
    /// card or party changes never change it. Only a draft changes; a sent one is read-only, and a shipment has at most one that
    /// isn't void.
    /// </summary>
    public class Invoice : MLEntityBase
    {
        public const string Draft = "draft";
        public const string Sent = "sent";
        public const string Paid = "paid";
        public const string Void = "void";
        /// <summary>Not stored: a sent invoice past its due date.</summary>
        public const string Overdue = "overdue";
        public static readonly string[] Statuses = [Draft, Sent, Paid, Void];

        /// <summary>From a sequence, so a number is never reused, even when the invoice is voided.</summary>
        public int sequenceNo { get; set; }
        public Guid shipmentId { get; set; }
        public Guid? dispatchId { get; set; }
        /// <summary>A record of BillingOptions.PartySidebarId.</summary>
        public Guid partyId { get; set; }
        public string partyName { get; set; } = string.Empty;
        public string? partyRegistrationNo { get; set; }
        public string? partyTaxId { get; set; }
        public string? partyAddress { get; set; }
        public string? partyEmail { get; set; }
        public int creditTermsDays { get; set; }
        public string status { get; set; } = Draft;
        /// <summary>Set when it's sent; the due date is that plus creditTermsDays.</summary>
        public DateOnly? issueDate { get; set; }
        public DateOnly? dueDate { get; set; }
        public string currency { get; set; } = "MYR";
        public decimal subtotal { get; set; }
        public decimal taxAmount { get; set; }
        public decimal total { get; set; }
        public DateTime? sentAt { get; set; }
        public DateTime? paidAt { get; set; }
        /// <summary>LHDN MyInvois reference, once that's integrated.</summary>
        public string? eInvoiceRef { get; set; }
        public DateTime? voidedAt { get; set; }
        public string? voidReason { get; set; }
        /// <summary>JSON of what freight was priced from: rate card, zones and weight.</summary>
        public string pricing { get; set; } = "{}";

        public string InvoiceNo => $"INV-{sequenceNo:000000}";
    }

    /// <summary>One charge of an invoice, with how it was worked out.</summary>
    public class InvoiceLine : MLEntityBase
    {
        /// <summary>The charge key of the freight line, priced from the rate card; every invoice has one.</summary>
        public const string Freight = "freight";

        public Guid invoiceId { get; set; }
        public Guid shipmentId { get; set; }
        /// <summary>freight or a ChargeType key.</summary>
        public string chargeKey { get; set; } = string.Empty;
        public string description { get; set; } = string.Empty;
        /// <summary>e.g. "123 kg × RM 6.80 (min RM 150.00)".</summary>
        public string basis { get; set; } = string.Empty;
        public decimal qty { get; set; }
        public decimal unitPrice { get; set; }
        public decimal amount { get; set; }
        /// <summary>In percent; 0 for a line that isn't taxable.</summary>
        public decimal taxRate { get; set; }
        /// <summary>The resolved exception that suggested it, e.g. a failed delivery attempt.</summary>
        public Guid? sourceExceptionId { get; set; }
        public int sortOrder { get; set; }
    }

    /// <summary>Money received for an invoice.</summary>
    public class Payment : MLEntityBase
    {
        public Guid invoiceId { get; set; }
        public decimal amount { get; set; }
        public DateTime paidAt { get; set; }
        /// <summary>e.g. bank transfer.</summary>
        public string method { get; set; } = string.Empty;
        public string? reference { get; set; }
    }

    /// <summary>Which fields billing reads besides the exception and document roles, one row per shipment sidebar.</summary>
    public class BillingSetting : MLEntityBase
    {
        public string shipmentSidebarId { get; set; } = string.Empty;
        /// <summary>A link field of the shipment table to the party table.</summary>
        public Guid? billToFieldId { get; set; }
        /// <summary>A text field of the location table.</summary>
        public Guid? zoneFieldId { get; set; }
        /// <summary>Fields of the party table: text, text, text, text, text and number. Without a name field, parties go by their title.</summary>
        public Guid? partyNameFieldId { get; set; }
        public Guid? partyAddressFieldId { get; set; }
        public Guid? partyEmailFieldId { get; set; }
        public Guid? partyTaxIdFieldId { get; set; }
        public Guid? partyRegistrationFieldId { get; set; }
        public Guid? partyCreditTermsFieldId { get; set; }
    }
}
