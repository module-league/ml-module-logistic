using System.ComponentModel.DataAnnotations;
using LogisticApi.MVVM;
using LogisticApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogisticApi.Controllers
{
    /// <summary>
    /// The field set of one sidebar page. sidebarId is the kebab-case id from web/src/config/config.ts.
    /// </summary>
    [ApiController]
    [Route("api/sidebars/{sidebarId}")]
    [Produces("application/json")]
    public class SidebarController(SidebarFieldService fields) : ControllerBase
    {
        private const string SidebarIdPattern = "^[a-z0-9]+(-[a-z0-9]+)*$";

        /// <summary>Fields of the sidebar in display order, each with its dropDownValues.</summary>
        [HttpGet("fields")]
        [ProducesResponseType<List<SidebarFieldResponse>>(StatusCodes.Status200OK)]
        public Task<List<SidebarFieldResponse>> GetFields(
            [FromRoute, MaxLength(100), RegularExpression(SidebarIdPattern)] string sidebarId,
            CancellationToken ct) =>
            fields.ListAsync(sidebarId, ct);

        /// <summary>Adds a field at the end of the sidebar's field set.</summary>
        [HttpPost("fields")]
        [ProducesResponseType<SidebarFieldResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<SidebarFieldResponse>> CreateField(
            [FromRoute, MaxLength(100), RegularExpression(SidebarIdPattern)] string sidebarId,
            [FromBody] SidebarFieldCreateRequest request,
            CancellationToken ct)
        {
            var created = await fields.CreateAsync(sidebarId, request, ct);
            return CreatedAtAction(nameof(FieldController.GetField), "Field", new { objId = created.objId }, created);
        }

        /// <summary>Sets the display order of every field in the sidebar.</summary>
        [HttpPut("fields/order")]
        [ProducesResponseType<List<SidebarFieldResponse>>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        public Task<List<SidebarFieldResponse>> ReorderFields(
            [FromRoute, MaxLength(100), RegularExpression(SidebarIdPattern)] string sidebarId,
            [FromBody] SidebarFieldOrderRequest request,
            CancellationToken ct) =>
            fields.ReorderAsync(sidebarId, request, ct);
    }
}
