using System.Text.Json;
using LogisticApi.Models;

namespace LogisticApi.MVVM
{
    /// <summary>Matches ICheckpointLog in web/src/services/checkpoints/checkpoint.types.ts.</summary>
    public class CheckpointLogResponse
    {
        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        public Guid objId { get; set; }
        public Guid dispatchId { get; set; }
        public string? note { get; set; }
        public bool internalOnly { get; set; }
        public List<AttachmentResponse> attachments { get; set; } = [];
        /// <summary>The user who posted it; Guid.Empty until sign-in is wired up.</summary>
        public Guid createdBy { get; set; }
        public DateTime createTime { get; set; }

        public static CheckpointLogResponse From(CheckpointLog log) => new()
        {
            objId = log.ObjId,
            dispatchId = log.dispatchId,
            note = log.note,
            internalOnly = log.internalOnly,
            attachments = JsonSerializer.Deserialize<List<AttachmentResponse>>(log.attachments, Json) ?? [],
            createdBy = log.CreatedBy,
            // Saved as UTC (SYSUTCDATETIME) but read back without a kind; mark it so it serializes with a Z
            createTime = DateTime.SpecifyKind(log.CreateTime, DateTimeKind.Utc),
        };
    }
}
