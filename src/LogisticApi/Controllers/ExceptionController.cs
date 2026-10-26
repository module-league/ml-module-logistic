using LogisticApi.MVVM;
using LogisticApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogisticApi.Controllers
{
    /// <summary>Shipment exceptions. Rules open and auto-close them; people own, snooze and resolve them.</summary>
    [ApiController]
    [Route("api/exceptions")]
    [Produces("application/json")]
    public class ExceptionController(ExceptionCaseService exceptions) : ControllerBase
    {
        /// <summary>Every exception, newest first, resolved ones included.</summary>
        [HttpGet]
        public Task<List<ExceptionResponse>> GetExceptions(CancellationToken ct) => exceptions.ListAsync(ct);

        /// <summary>The rules from the workflow config.</summary>
        [HttpGet("rules")]
        public List<ExceptionRuleResponse> GetRules() => exceptions.Rules();

        /// <summary>Runs the rules now.</summary>
        [HttpPost("evaluate")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Evaluate(CancellationToken ct)
        {
            await exceptions.EvaluateAsync(ct);
            return NoContent();
        }

        /// <summary>Which fields the rules read; versionNo 0 until first saved.</summary>
        [HttpGet("settings")]
        public Task<ExceptionSettingsResponse> GetSettings(CancellationToken ct) => exceptions.GetSettingsAsync(ct);

        [HttpPut("settings")]
        [ProducesResponseType<ExceptionSettingsResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<ExceptionSettingsResponse> SaveSettings([FromBody] ExceptionSettingsRequest request, CancellationToken ct) =>
            exceptions.SaveSettingsAsync(request, ct);

        /// <summary>Raises one by hand under a manual rule.</summary>
        [HttpPost]
        [ProducesResponseType<ExceptionChangeResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<ExceptionChangeResponse>> CreateException([FromBody] ExceptionCreateRequest request, CancellationToken ct)
        {
            var created = await exceptions.CreateAsync(request, ct);
            return StatusCode(StatusCodes.Status201Created, created);
        }

        /// <summary>Its timeline, oldest first.</summary>
        [HttpGet("{objId:guid}/activity")]
        [ProducesResponseType<List<ExceptionActivityResponse>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        public Task<List<ExceptionActivityResponse>> GetActivity(Guid objId, CancellationToken ct) => exceptions.ActivityAsync(objId, ct);

        /// <summary>Posts a note or a fix step.</summary>
        [HttpPost("{objId:guid}/activity")]
        [ProducesResponseType<ExceptionActivityResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ExceptionActivityResponse>> AddActivity(Guid objId, [FromBody] ExceptionActivityRequest request, CancellationToken ct)
        {
            var created = await exceptions.AddActivityAsync(objId, request, ct);
            return StatusCode(StatusCodes.Status201Created, created);
        }

        [HttpPut("{objId:guid}/owner")]
        [ProducesResponseType<ExceptionChangeResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<ExceptionChangeResponse> Assign(Guid objId, [FromBody] ExceptionAssignRequest request, CancellationToken ct) =>
            exceptions.AssignAsync(objId, request, ct);

        [HttpPut("{objId:guid}/snooze")]
        [ProducesResponseType<ExceptionChangeResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<ExceptionChangeResponse> Snooze(Guid objId, [FromBody] ExceptionSnoozeRequest request, CancellationToken ct) =>
            exceptions.SnoozeAsync(objId, request, ct);

        [HttpPut("{objId:guid}/wake")]
        [ProducesResponseType<ExceptionChangeResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<ExceptionChangeResponse> Wake(Guid objId, [FromBody] ExceptionVersionRequest request, CancellationToken ct) =>
            exceptions.WakeAsync(objId, request, ct);

        /// <summary>Resolving always needs a reason.</summary>
        [HttpPut("{objId:guid}/resolve")]
        [ProducesResponseType<ExceptionChangeResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<ExceptionChangeResponse> Resolve(Guid objId, [FromBody] ExceptionResolveRequest request, CancellationToken ct) =>
            exceptions.ResolveAsync(objId, request, ct);
    }
}
