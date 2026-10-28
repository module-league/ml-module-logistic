using System.ComponentModel.DataAnnotations;

namespace LogisticApi.MVVM
{
    /// <summary>
    /// Invoices a ready shipment. The API prices it again from the rate card; freight is always on it, and lineKeys picks the
    /// other quoted lines. partyId left out bills the shipment's Bill To.
    /// </summary>
    public class InvoiceCreateRequest
    {
        [Required]
        public Guid? shipmentId { get; set; }

        public Guid? partyId { get; set; }

        public List<string> lineKeys { get; set; } = [];
    }

    /// <summary>Every change sends the versionNo last read; a stale one is rejected with 409.</summary>
    public class InvoiceVersionRequest
    {
        [Required]
        public int? versionNo { get; set; }
    }

    public class InvoicePayRequest : InvoiceVersionRequest
    {
        /// <summary>e.g. bank transfer.</summary>
        [Required, MaxLength(50)]
        public string? method { get; set; }

        [MaxLength(100)]
        public string? reference { get; set; }

        /// <summary>Left out, now; never in the future.</summary>
        public DateTimeOffset? paidAt { get; set; }
    }

    public class InvoiceVoidRequest : InvoiceVersionRequest
    {
        [Required, MaxLength(500)]
        public string? reason { get; set; }
    }

    /// <summary>Which fields billing reads. Send the versionNo you last read, 0 for the first save.</summary>
    public class BillingSettingsRequest
    {
        public Guid? billToFieldId { get; set; }
        public Guid? zoneFieldId { get; set; }
        public Guid? partyNameFieldId { get; set; }
        public Guid? partyAddressFieldId { get; set; }
        public Guid? partyEmailFieldId { get; set; }
        public Guid? partyTaxIdFieldId { get; set; }
        public Guid? partyRegistrationFieldId { get; set; }
        public Guid? partyCreditTermsFieldId { get; set; }

        [Required]
        public int? versionNo { get; set; }
    }
}
