using LogisticApi.MVVM;
using LogisticApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogisticApi.Controllers
{
    /// <summary>Bookings: customer emails and purchase orders turned into new shipments.</summary>
    [ApiController]
    [Route("api/bookings")]
    [Produces("application/json")]
    public class BookingController(BookingIntakeService intake) : ControllerBase
    {
        /// <summary>The AI reads a booking email and its files into shipment values to review. Nothing is saved; it costs one AI call.</summary>
        [HttpPost("intake")]
        [ProducesResponseType<BookingIntakeResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status502BadGateway)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status503ServiceUnavailable)]
        public Task<BookingIntakeResponse> Intake([FromBody] BookingIntakeRequest request, CancellationToken ct) => intake.ReadAsync(request, ct);
    }
}
