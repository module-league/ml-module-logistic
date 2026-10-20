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

        /// <summary>Any text, e.g. "Proof of delivery"; blank for none.</summary>
        [MaxLength(60)]
        public string? label { get; set; }
    }

    /// <summary>Changes the label of one file of a posted entry.</summary>
    public class CheckpointLabelRequest
    {
        /// <summary>Blank removes the label.</summary>
        [MaxLength(60)]
        public string? label { get; set; }
    }
}
