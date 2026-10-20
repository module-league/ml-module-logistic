using LogisticApi.MVVM;
using LogisticApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogisticApi.Controllers
{
    /// <summary>The checkpoint log of a dispatch. Upload files to POST /api/attachments with refId set to the dispatch's objId first.</summary>
    [ApiController]
    [Route("api/dispatches/{dispatchId:guid}/checkpoints")]
    [Produces("application/json")]
    public class CheckpointLogController(CheckpointLogService checkpoints) : ControllerBase
    {
        /// <summary>Newest first.</summary>
        [HttpGet]
        [ProducesResponseType<List<CheckpointLogResponse>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        public Task<List<CheckpointLogResponse>> GetCheckpoints(Guid dispatchId, CancellationToken ct) =>
            checkpoints.ListAsync(dispatchId, ct);

        [HttpPost]
        [ProducesResponseType<CheckpointLogResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<CheckpointLogResponse>> CreateCheckpoint(
            Guid dispatchId,
            [FromBody] CheckpointLogRequest request,
            CancellationToken ct)
        {
            var created = await checkpoints.CreateAsync(dispatchId, request, ct);
            return StatusCode(StatusCodes.Status201Created, created);
        }

        /// <summary>Sets or clears the label of one file of a posted entry.</summary>
        [HttpPut("{objId:guid}/attachments/{attachmentId:guid}/label")]
        [ProducesResponseType<CheckpointLogResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<CheckpointLogResponse> UpdateLabel(
            Guid dispatchId,
            Guid objId,
            Guid attachmentId,
            [FromBody] CheckpointLabelRequest request,
            CancellationToken ct) =>
            checkpoints.UpdateLabelAsync(dispatchId, objId, attachmentId, request, ct);
    }
}
