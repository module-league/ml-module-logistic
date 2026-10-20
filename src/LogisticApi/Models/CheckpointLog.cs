using ModuleLeague.Core.Entities;

namespace LogisticApi.Models
{
    /// <summary>A note or files someone posted on a dispatch's timeline.</summary>
    public class CheckpointLog : MLEntityBase
    {
        public const int MaxAttachments = 10;

        public Guid dispatchId { get; set; }
        public string? note { get; set; }
        /// <summary>Seen by the team only, not shared with the customer.</summary>
        public bool internalOnly { get; set; }
        /// <summary>JSON array of AttachmentResponse, uploaded with refId set to the dispatch's ObjId.</summary>
        public string attachments { get; set; } = "[]";
    }
}
