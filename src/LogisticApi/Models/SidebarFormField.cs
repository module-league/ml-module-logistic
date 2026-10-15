using System.ComponentModel.DataAnnotations;

namespace LogisticApi.Models
{
    /// <summary>One field on a form, stored in SidebarForm.fields: the field and how the form shows it.</summary>
    public class SidebarFormField
    {
        [Required]
        public Guid fieldId { get; set; }

        /// <summary>The empty answer box's hint; null shows the field type's hint.</summary>
        [MaxLength(100)]
        public string? placeholder { get; set; }

        /// <summary>The answer the form starts with, in the field's record value format. Link and attachment fields have none.</summary>
        [MaxLength(1000)]
        public string? defaultValue { get; set; }
    }
}
