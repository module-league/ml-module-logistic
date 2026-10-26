using System.ComponentModel.DataAnnotations;

namespace LogisticApi.MVVM
{
    /// <summary>Raises an exception by hand under a manual rule, e.g. delivery_attempt_failed with the reason it failed.</summary>
    public class ExceptionCreateRequest
    {
        [Required]
        public Guid? shipmentId { get; set; }

        /// <summary>Must be a dispatch of the shipment.</summary>
        public Guid? dispatchId { get; set; }

        /// <summary>A manual rule: delivery_attempt_failed or manual.</summary>
        [Required]
        public string? ruleKey { get; set; }

        /// <summary>low, medium or high; left out, the rule's.</summary>
        public string? severity { get; set; }

        /// <summary>Left out, the rule's title.</summary>
        [MaxLength(200)]
        public string? title { get; set; }

        /// <summary>For delivery_attempt_failed: receiver_closed, refused, wrong_address or nobody_to_sign.</summary>
        [MaxLength(30)]
        public string? reason { get; set; }

        /// <summary>The first note on its timeline.</summary>
        [MaxLength(2000)]
        public string? note { get; set; }

        public Guid? ownerId { get; set; }
    }

    /// <summary>Every change to an exception sends the versionNo last read; a stale one is rejected with 409.</summary>
    public class ExceptionVersionRequest
    {
        [Required]
        public int? versionNo { get; set; }
    }

    public class ExceptionAssignRequest : ExceptionVersionRequest
    {
        /// <summary>Null takes the owner off.</summary>
        public Guid? ownerId { get; set; }
    }

    public class ExceptionSnoozeRequest : ExceptionVersionRequest
    {
        /// <summary>In the future and at most 30 days ahead.</summary>
        [Required]
        public DateTimeOffset? until { get; set; }

        [MaxLength(2000)]
        public string? note { get; set; }
    }

    public class ExceptionResolveRequest : ExceptionVersionRequest
    {
        /// <summary>Why, e.g. one of the rule's reasons or "False alarm".</summary>
        [Required]
        [MaxLength(200)]
        public string? reason { get; set; }

        [MaxLength(2000)]
        public string? note { get; set; }
    }

    /// <summary>A note, or a fix step someone took (e.g. "Called the driver"), on the exception's timeline.</summary>
    public class ExceptionActivityRequest
    {
        /// <summary>note or action.</summary>
        [Required]
        public string? kind { get; set; }

        [Required]
        [MaxLength(2000)]
        public string? body { get; set; }
    }

    /// <summary>Which fields the rules read. Send the versionNo you last read, 0 for the first save.</summary>
    public class ExceptionSettingsRequest
    {
        public Guid? etaFieldId { get; set; }
        public Guid? chargeableWeightFieldId { get; set; }
        public Guid? modeFieldId { get; set; }
        public Guid? openingHourFieldId { get; set; }
        public Guid? locationPhoneFieldId { get; set; }
        public Guid? driverPhoneFieldId { get; set; }

        [Required]
        public int? versionNo { get; set; }
    }
}
