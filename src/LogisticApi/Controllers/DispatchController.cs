using LogisticApi.MVVM;
using LogisticApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogisticApi.Controllers
{
    [ApiController]
    [Route("api/dispatches")]
    [Produces("application/json")]
    public class DispatchController(DispatchService dispatches) : ControllerBase
    {
        /// <summary>Newest first.</summary>
        [HttpGet]
        public Task<List<DispatchResponse>> GetDispatches(CancellationToken ct) =>
            dispatches.ListAsync(ct);

        /// <summary>The sidebars a dispatch picks its shipment, driver, vehicle and locations from.</summary>
        [HttpGet("sources")]
        public DispatchSourcesResponse GetSources() => dispatches.Sources();

        /// <summary>Which shipment fields the board reads; versionNo 0 until first saved.</summary>
        [HttpGet("settings")]
        public Task<DispatchSettingsResponse> GetSettings(CancellationToken ct) =>
            dispatches.GetSettingsAsync(ct);

        /// <summary>Saves which shipment fields the board reads. Send the versionNo you last read, 0 for the first save.</summary>
        [HttpPut("settings")]
        [ProducesResponseType<DispatchSettingsResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<DispatchSettingsResponse> SaveSettings([FromBody] DispatchSettingsRequest request, CancellationToken ct) =>
            dispatches.SaveSettingsAsync(request, ct);

        [HttpGet("{objId:guid}")]
        [ProducesResponseType<DispatchResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        public Task<DispatchResponse> GetDispatch(Guid objId, CancellationToken ct) =>
            dispatches.GetAsync(objId, ct);

        [HttpPost]
        [ProducesResponseType<DispatchResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<DispatchResponse>> CreateDispatch(
            [FromBody] DispatchCreateRequest request,
            CancellationToken ct)
        {
            var created = await dispatches.CreateAsync(request, ct);
            return CreatedAtAction(nameof(GetDispatch), new { objId = created.objId }, created);
        }

        /// <summary>Moves the dispatch ahead (picked_up, in_transit, arrived, delivered) or cancels it, and posts the move to its checkpoint log.</summary>
        [HttpPut("{objId:guid}/status")]
        [ProducesResponseType<DispatchStatusResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<DispatchStatusResponse> MoveDispatch(Guid objId, [FromBody] DispatchStatusRequest request, CancellationToken ct) =>
            dispatches.MoveAsync(objId, request, ct);
    }
}
