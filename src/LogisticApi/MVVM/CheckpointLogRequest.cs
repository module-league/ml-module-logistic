using System.ComponentModel.DataAnnotations;

namespace LogisticApi.MVVM
{
    /// <summary>A note, files, or both, posted on a dispatch's timeline.</summary>
    public class CheckpointLogRequest
    {
        [MaxLength(2000)]
        public string? note { get; set; }

        public bool internalOnly { get; set; }

        /// <summary>Files uploaded to POST /api/attachments with refId set to the dispatch's objId, each with its label.</summary>
        [MaxLength(10)]
        public List<CheckpointAttachmentRequest> attachments { get; set; } = [];
    }

    public class CheckpointAttachmentRequest
    {
        [Required]
        public Guid? id { get; set; }

        /// <summary>One of the labels of the dispatch settings' attachmentLabelFieldId; null for none.</summary>
        public Guid? optionId { get; set; }
    }
}
