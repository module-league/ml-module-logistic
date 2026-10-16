using System.Text.Json.Serialization;
using LogisticApi.Models;

namespace LogisticApi.MVVM
{
    /// <summary>Matches IAttachment in web/src/services/attachments/attachment.types.ts; an attachment field stores a JSON array of these.</summary>
    public class AttachmentResponse
    {
        public Guid id { get; set; }
        public string name { get; set; } = string.Empty;
        public string fileType { get; set; } = string.Empty;
        public string fileExtension { get; set; } = string.Empty;
        /// <summary>In KB.</summary>
        public decimal fileSize { get; set; }
        public int attachmentVersion { get; set; }
        /// <summary>The label picked for the file in a record: one of the attachment field's options; left out when none.</summary>
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public Guid? optionId { get; set; }

        public static AttachmentResponse From(Attachment attachment, Guid? optionId = null) => new()
        {
            id = attachment.ObjId,
            name = attachment.fileName,
            fileType = attachment.fileType,
            fileExtension = attachment.fileExtension,
            fileSize = attachment.fileSize,
            attachmentVersion = attachment.attachmentVersion,
            optionId = optionId,
        };
    }
}
