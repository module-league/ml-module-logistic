using ModuleLeague.Core.Entities;

namespace LogisticApi.Models
{
    /// <summary>
    /// A file uploaded for an attachment field. The bytes live on disk under <see cref="AttachmentStorageOptions.Path"/>.
    /// </summary>
    public class Attachment : MLEntityBase
    {
        /// <summary>What the file was uploaded for, e.g. a sidebar id; a record only takes attachments whose refId is its sidebar.</summary>
        public string refId { get; set; } = string.Empty;
        public string fileName { get; set; } = string.Empty;
        /// <summary>The MIME type the browser sent, e.g. image/png; decides whether the file opens in the browser.</summary>
        public string fileType { get; set; } = string.Empty;
        /// <summary>Lowercase, without the dot, e.g. docx, png; empty when the name has none.</summary>
        public string fileExtension { get; set; } = string.Empty;
        /// <summary>In KB, 2 decimal places, rounded up so a non-empty file is never 0.</summary>
        public decimal fileSize { get; set; }
        /// <summary>Starts at 1.</summary>
        public int attachmentVersion { get; set; } = 1;
        /// <summary>Relative to the storage folder, without the file's extension so nothing on disk can run.</summary>
        public string storagePath { get; set; } = string.Empty;
    }
}
