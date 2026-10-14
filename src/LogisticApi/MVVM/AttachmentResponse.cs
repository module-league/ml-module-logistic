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

        public static AttachmentResponse From(Attachment attachment) => new()
        {
            id = attachment.ObjId,
            name = attachment.fileName,
            fileType = attachment.fileType,
            fileExtension = attachment.fileExtension,
            fileSize = attachment.fileSize,
            attachmentVersion = attachment.attachmentVersion,
        };
    }
}
