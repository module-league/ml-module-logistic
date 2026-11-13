using System.ComponentModel.DataAnnotations;

namespace LogisticApi.MVVM
{
    /// <summary>Drafts a message to the customer about an exception, in the language asked for.</summary>
    public class CustomerUpdateRequest
    {
        /// <summary>en, ms or zh; left out, en.</summary>
        [MaxLength(5)]
        public string? language { get; set; }
    }

    /// <summary>
    /// A draft message to the customer about an exception. Nothing is sent: a person edits it, sends it from their own email or chat,
    /// and logs that it went. Matches ICustomerUpdate in web/src/services/exceptions/exception.types.ts.
    /// </summary>
    public class CustomerUpdateResponse
    {
        public Guid exceptionId { get; set; }
        public string language { get; set; } = string.Empty;
        /// <summary>The shipment's Bill To party; left out when the shipment has none or Billing settings don't name it.</summary>
        public string? recipientName { get; set; }
        /// <summary>Left out when the party has no email or Billing settings have no email field.</summary>
        public string? recipientEmail { get; set; }
        public string subject { get; set; } = string.Empty;
        /// <summary>The email body.</summary>
        public string message { get; set; } = string.Empty;
        /// <summary>A few lines for WhatsApp or SMS.</summary>
        public string shortMessage { get; set; } = string.Empty;
        /// <summary>The redelivery slots the message offers, worked out by the API from the receiver's opening time.</summary>
        public List<string> slots { get; set; } = [];
        /// <summary>What to confirm before sending, e.g. "Check a driver is free on Monday morning".</summary>
        public List<string> checks { get; set; } = [];
        public AiUsageResponse usage { get; set; } = new();
    }
}
