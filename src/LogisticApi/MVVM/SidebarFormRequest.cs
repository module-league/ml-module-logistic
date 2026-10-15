using System.ComponentModel.DataAnnotations;

namespace LogisticApi.MVVM
{
    public class SidebarFormRequest
    {
        [Required, MaxLength(80)]
        public string formTitle { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? formDescription { get; set; }

        /// <summary>Hidden forms aren't offered to people; a hidden form can't be the default.</summary>
        public bool isHidden { get; set; }

        /// <summary>Makes this the sidebar's default form; the previous default stops being one.</summary>
        public bool isDefault { get; set; }

        /// <summary>An image uploaded to /attachments with the sidebar as refId; null removes the cover.</summary>
        public Guid? coverImageId { get; set; }

        /// <summary>An image uploaded to /attachments with the sidebar as refId; null removes the logo.</summary>
        public Guid? logoId { get; set; }

        /// <summary>The fields on the form, in order: field ObjIds of the sidebar that can be filled in.</summary>
        [MaxLength(200)]
        public List<Guid> fieldIds { get; set; } = [];

        /// <summary>Update only: the versionNo the client last read; a stale value returns 409.</summary>
        public int? versionNo { get; set; }
    }

    public class SidebarFormOrderRequest
    {
        /// <summary>Every form of the sidebar exactly once, in the new order.</summary>
        [Required, MinLength(1)]
        public List<Guid> formIds { get; set; } = [];
    }
}
