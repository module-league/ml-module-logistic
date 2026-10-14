using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LogisticApi.Services
{
    public class AttachmentService(ContextDb db, IOptions<AttachmentStorageOptions> options, IWebHostEnvironment env)
    {
        private string Root => Path.GetFullPath(options.Value.Path, env.ContentRootPath);

        public async Task<AttachmentResponse> UploadAsync(string refId, IFormFile file, CancellationToken ct)
        {
            if (file.Length == 0)
                throw ApiProblemException.BadRequest("The file is empty.");
            if (file.Length > options.Value.MaxBytes)
                throw ApiProblemException.BadRequest("File too large.", $"Files can be up to {options.Value.MaxBytes / (1024 * 1024)} MB.");

            var objId = Guid.CreateVersion7();
            var storagePath = Path.Combine(DateTime.UtcNow.ToString("yyyy"), DateTime.UtcNow.ToString("MM"), objId.ToString("N"));
            var fullPath = Path.Combine(Root, storagePath);
            Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

            await using (var target = File.Create(fullPath))
            {
                await file.CopyToAsync(target, ct);
            }

            var fileName = CleanFileName(file.FileName);
            var attachment = new Attachment
            {
                ObjId = objId,
                refId = refId,
                fileName = fileName,
                fileType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
                fileExtension = ExtensionOf(fileName),
                fileSize = ToKilobytes(file.Length),
                attachmentVersion = 1,
                storagePath = storagePath,
            };
            db.Attachments.Add(attachment);
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch
            {
                File.Delete(fullPath);
                throw;
            }
            return AttachmentResponse.From(attachment);
        }

        public async Task<(Attachment attachment, Stream content)> OpenAsync(Guid objId, CancellationToken ct)
        {
            var attachment = await db.Attachments
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.ObjId == objId, ct)
                ?? throw ApiProblemException.NotFound("Attachment not found.");
            var fullPath = Path.Combine(Root, attachment.storagePath);
            if (!File.Exists(fullPath))
                throw ApiProblemException.NotFound("Attachment file is missing.");
            return (attachment, File.OpenRead(fullPath));
        }

        private static string ExtensionOf(string fileName)
        {
            var extension = Path.GetExtension(fileName).TrimStart('.').ToLowerInvariant();
            return extension.Length > 20 ? string.Empty : extension;
        }

        // 84 bytes is 0.09 KB, not 0.08: rounding up keeps a non-empty file above 0
        private static decimal ToKilobytes(long bytes) => Math.Ceiling(bytes / 1024m * 100) / 100;

        // Browsers send a bare name, but older ones send the whole client path
        private static string CleanFileName(string fileName)
        {
            var name = Path.GetFileName(fileName.Replace('\\', '/')).Trim();
            if (name.Length == 0) name = "file";
            return name.Length > 255 ? name[^255..] : name;
        }
    }
}
