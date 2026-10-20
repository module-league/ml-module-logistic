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
    }
}
