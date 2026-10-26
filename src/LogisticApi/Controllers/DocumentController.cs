using LogisticApi.MVVM;
using LogisticApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogisticApi.Controllers
{
    /// <summary>Shipment documents: each shipment's checklist, filing and generating files, and verifying them.</summary>
    [ApiController]
    [Route("api/documents")]
    [Produces("application/json")]
    public class DocumentController(DocumentService documents) : ControllerBase
    {
        /// <summary>Every shipment's checklist and unclassified files.</summary>
        [HttpGet]
        public Task<List<ShipmentChecklistResponse>> GetChecklists(CancellationToken ct) => documents.ListAsync(ct);

        /// <summary>The document types and requirements from the workflow config.</summary>
        [HttpGet("rules")]
        public Task<DocumentRulesResponse> GetRules(CancellationToken ct) => documents.RulesAsync(ct);

        /// <summary>Which fields the checklist reads; versionNo 0 until first saved.</summary>
        [HttpGet("settings")]
        public Task<DocumentSettingsResponse> GetSettings(CancellationToken ct) => documents.GetSettingsAsync(ct);

        [HttpPut("settings")]
        [ProducesResponseType<DocumentSettingsResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<DocumentSettingsResponse> SaveSettings([FromBody] DocumentSettingsRequest request, CancellationToken ct) =>
            documents.SaveSettingsAsync(request, ct);

        /// <summary>Files an attachment as a document's new version; returns the shipment's checklist.</summary>
        [HttpPost("files")]
        [ProducesResponseType<ShipmentChecklistResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<ShipmentChecklistResponse> FileDocument([FromBody] DocumentFileRequest request, CancellationToken ct) =>
            documents.FileAsync(request, ct);

        /// <summary>Fills a draft from the shipment and its locations; returns the shipment's checklist.</summary>
        [HttpPost("generate")]
        [ProducesResponseType<ShipmentChecklistResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        public Task<ShipmentChecklistResponse> Generate([FromBody] DocumentGenerateRequest request, CancellationToken ct) =>
            documents.GenerateAsync(request, ct);

        /// <summary>Its versions, verifies and rejects, oldest first.</summary>
        [HttpGet("{objId:guid}/activity")]
        [ProducesResponseType<List<DocumentActivityResponse>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        public Task<List<DocumentActivityResponse>> GetActivity(Guid objId, CancellationToken ct) => documents.ActivityAsync(objId, ct);

        [HttpPut("{objId:guid}/verify")]
        [ProducesResponseType<ShipmentChecklistResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<ShipmentChecklistResponse> Verify(Guid objId, [FromBody] DocumentVerifyRequest request, CancellationToken ct) =>
            documents.VerifyAsync(objId, request, ct);

        [HttpPut("{objId:guid}/reject")]
        [ProducesResponseType<ShipmentChecklistResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<ShipmentChecklistResponse> Reject(Guid objId, [FromBody] DocumentRejectRequest request, CancellationToken ct) =>
            documents.RejectAsync(objId, request, ct);
    }
}
