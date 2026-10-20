using System.ComponentModel.DataAnnotations;

namespace LogisticApi.MVVM
{
    /// <summary>A note, files, or both, posted on a dispatch's timeline.</summary>
    public class CheckpointLogRequest
    {
        [MaxLength(2000)]
        public string? note { get; set; }

        public bool internalOnly { get; set; }

        /// <summary>Files uploaded to POST /api/attachments with refId set to the dispatch's objId.</summary>
        [MaxLength(10)]
        public List<Guid> attachmentIds { get; set; } = [];
    }
}
