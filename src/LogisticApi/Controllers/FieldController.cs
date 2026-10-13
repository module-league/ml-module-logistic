using LogisticApi.MVVM;
using LogisticApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogisticApi.Controllers
{
    /// <summary>
    /// One field template, addressed by its ObjId.
    /// </summary>
    [ApiController]
    [Route("api/fields")]
    [Produces("application/json")]
    public class FieldController(SidebarFieldService fields) : ControllerBase
    {
        [HttpGet("{objId:guid}")]
        [ProducesResponseType<SidebarFieldResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        public Task<SidebarFieldResponse> GetField(Guid objId, CancellationToken ct) =>
            fields.GetAsync(objId, ct);

        /// <summary>Renames the field, changes its settings, or replaces its dropDownValues. Send the versionNo you last read.</summary>
        [HttpPut("{objId:guid}")]
        [ProducesResponseType<SidebarFieldResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<SidebarFieldResponse> UpdateField(Guid objId, [FromBody] SidebarFieldUpdateRequest request, CancellationToken ct) =>
            fields.UpdateAsync(objId, request, ct);

        /// <summary>Soft-deletes the field and its options. System fields can't be deleted.</summary>
        [HttpDelete("{objId:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> DeleteField(Guid objId, CancellationToken ct)
        {
            await fields.DeleteAsync(objId, ct);
            return NoContent();
        }
    }
}
