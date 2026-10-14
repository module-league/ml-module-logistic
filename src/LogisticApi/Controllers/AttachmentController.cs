using System.ComponentModel.DataAnnotations;
using LogisticApi.MVVM;
using LogisticApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogisticApi.Controllers
{
    /// <summary>
    /// Files for attachment fields: upload one, then put the returned object in the record's value.
    /// </summary>
    [ApiController]
    public class AttachmentController(AttachmentService attachments) : ControllerBase
    {
        private const string RefIdPattern = "^[A-Za-z0-9_-]+$";

        // Shown in the browser; anything else downloads, so an uploaded HTML or SVG file can't run scripts on this origin
        private static readonly string[] InlineTypes = ["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"];

        /// <summary>Uploads one file for refId, e.g. the sidebar whose records will hold it.</summary>
        [HttpPost("api/attachments")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType<AttachmentResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<AttachmentResponse>> Upload(
            [FromForm, Required, MaxLength(100), RegularExpression(RefIdPattern)] string refId,
            IFormFile file,
            CancellationToken ct)
        {
            var uploaded = await attachments.UploadAsync(refId, file, ct);
            return StatusCode(StatusCodes.Status201Created, uploaded);
        }

        /// <summary>The file itself. Images and PDFs open in the browser unless download is true.</summary>
        [HttpGet("api/attachments/{objId:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Get(Guid objId, [FromQuery] bool download, CancellationToken ct)
        {
            var (attachment, content) = await attachments.OpenAsync(objId, ct);
            Response.Headers.XContentTypeOptions = "nosniff";
            if (!download && InlineTypes.Contains(attachment.fileType))
                return File(content, attachment.fileType, enableRangeProcessing: true);
            return File(content, "application/octet-stream", attachment.fileName, enableRangeProcessing: true);
        }
    }
}
