using ModuleLeague.Core.Entities;

namespace LogisticApi.Models
{
    /// <summary>A note or files someone posted on a dispatch's timeline.</summary>
    public class CheckpointLog : MLEntityBase
    {
        public const int MaxAttachments = 10;
        /// <summary>The status of the entry sending the shipment's invoice posts; the dispatch itself stays delivered.</summary>
        public const string Billed = "billed";
        public static readonly string[] Statuses = [.. Dispatch.Statuses, Billed];

        public Guid dispatchId { get; set; }
        /// <summary>The Dispatch status this entry moved the dispatch to, or Billed; null for a note or files.</summary>
        public string? status { get; set; }
        public string? note { get; set; }
        /// <summary>Seen by the team only, not shared with the customer.</summary>
        public bool internalOnly { get; set; }
        /// <summary>JSON array of AttachmentResponse, uploaded with refId set to the dispatch's ObjId.</summary>
        public string attachments { get; set; } = "[]";
    }
}
