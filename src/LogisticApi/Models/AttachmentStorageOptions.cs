namespace LogisticApi.Models
{
    /// <summary>The "AttachmentStorage" section of appsettings.</summary>
    public class AttachmentStorageOptions
    {
        public const string Section = "AttachmentStorage";

        /// <summary>Folder for uploaded files; a relative path starts at the API's content root.</summary>
        public string Path { get; set; } = "App_Data/attachments";

        /// <summary>Largest file accepted, in bytes. Keep it under Kestrel's 30 MB request limit.</summary>
        public long MaxBytes { get; set; } = 15 * 1024 * 1024;
    }
}
