using System.ComponentModel.DataAnnotations;
using LogisticApi.MVVM;
using LogisticApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogisticApi.Controllers
{
    [ApiController]
    [Route("api/sidebars/{sidebarId}/records")]
    [Produces("application/json")]
    public class RecordController(LogisticRecordService records) : ControllerBase
    {
        private const string SidebarIdPattern = "^[a-z0-9]+(-[a-z0-9]+)*$";

        [HttpGet]
        public Task<List<LogisticRecordResponse>> GetRecords(
            [FromRoute, MaxLength(100), RegularExpression(SidebarIdPattern)] string sidebarId,
            CancellationToken ct) =>
            records.ListAsync(sidebarId, ct);

        [HttpPost]
        [ProducesResponseType<LogisticRecordResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<LogisticRecordResponse>> CreateRecord(
            [FromRoute, MaxLength(100), RegularExpression(SidebarIdPattern)] string sidebarId,
            [FromBody] LogisticRecordCreateRequest request,
            CancellationToken ct)
        {
            var created = await records.CreateAsync(sidebarId, request, ct);
            return StatusCode(StatusCodes.Status201Created, created);
        }

        [HttpGet("{objId:guid}")]
        [ProducesResponseType<LogisticRecordResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        public Task<LogisticRecordResponse> GetRecord(
    [FromRoute, MaxLength(100), RegularExpression(SidebarIdPattern)] string sidebarId,
    Guid objId,
    CancellationToken ct) =>
    records.GetAsync(sidebarId, objId, ct);

        /// <summary>Replaces the record's values. Send the versionNo you last read; a stale one is rejected with 409.</summary>
        [HttpPut("{objId:guid}")]
        [ProducesResponseType<LogisticRecordResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<LogisticRecordResponse> UpdateRecord(
            [FromRoute, MaxLength(100), RegularExpression(SidebarIdPattern)] string sidebarId,
            Guid objId,
            [FromBody] LogisticRecordUpdateRequest request,
            CancellationToken ct) =>
            records.UpdateAsync(sidebarId, objId, request, ct);

    }
}
