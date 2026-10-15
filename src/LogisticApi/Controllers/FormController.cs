using LogisticApi.MVVM;
using LogisticApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogisticApi.Controllers
{
    /// <summary>
    /// One form, addressed by its ObjId.
    /// </summary>
    [ApiController]
    [Route("api/forms")]
    [Produces("application/json")]
    public class FormController(SidebarFormService forms) : ControllerBase
    {
        /// <summary>Replaces the form's title, description, flags and fields. Send the versionNo you last read.</summary>
        [HttpPut("{objId:guid}")]
        [ProducesResponseType<SidebarFormResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<SidebarFormResponse> UpdateForm(Guid objId, [FromBody] SidebarFormRequest request, CancellationToken ct) =>
            forms.UpdateAsync(objId, request, ct);

        /// <summary>Soft-deletes the form.</summary>
        [HttpDelete("{objId:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteForm(Guid objId, CancellationToken ct)
        {
            await forms.DeleteAsync(objId, ct);
            return NoContent();
        }
    }
}
