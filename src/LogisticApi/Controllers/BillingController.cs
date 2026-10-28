using LogisticApi.MVVM;
using LogisticApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogisticApi.Controllers
{
    /// <summary>Billing: shipments ready to bill, priced from the rate card, and their invoices.</summary>
    [ApiController]
    [Route("api/billing")]
    [Produces("application/json")]
    public class BillingController(BillingService billing) : ControllerBase
    {
        /// <summary>Ready to bill with prices, held back with reasons, every invoice, the parties and the totals.</summary>
        [HttpGet]
        public Task<BillingOverviewResponse> GetOverview(CancellationToken ct) => billing.OverviewAsync(ct);

        /// <summary>The rate cards, charge types and tax from the workflow config.</summary>
        [HttpGet("rates")]
        public BillingRatesResponse GetRates() => billing.Rates();

        /// <summary>Which fields billing reads; versionNo 0 until first saved.</summary>
        [HttpGet("settings")]
        public Task<BillingSettingsResponse> GetSettings(CancellationToken ct) => billing.GetSettingsAsync(ct);

        [HttpPut("settings")]
        [ProducesResponseType<BillingSettingsResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<BillingSettingsResponse> SaveSettings([FromBody] BillingSettingsRequest request, CancellationToken ct) =>
            billing.SaveSettingsAsync(request, ct);

        /// <summary>The invoice's PDF without saving it.</summary>
        [HttpPost("preview")]
        [Produces("application/pdf", "application/problem+json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Preview([FromBody] InvoiceCreateRequest request, CancellationToken ct) =>
            File(await billing.PreviewPdfAsync(request, ct), "application/pdf");

        /// <summary>Saves a draft invoice for a ready shipment.</summary>
        [HttpPost("invoices")]
        [ProducesResponseType<InvoiceResponse>(StatusCodes.Status201Created)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<InvoiceResponse>> CreateInvoice([FromBody] InvoiceCreateRequest request, CancellationToken ct) =>
            StatusCode(StatusCodes.Status201Created, await billing.CreateAsync(request, ct));

        [HttpGet("invoices/{objId:guid}/pdf")]
        [Produces("application/pdf", "application/problem+json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> InvoicePdf(Guid objId, [FromQuery] bool download, CancellationToken ct)
        {
            var (fileName, pdf) = await billing.InvoicePdfAsync(objId, ct);
            Response.Headers.XContentTypeOptions = "nosniff";
            return download ? File(pdf, "application/pdf", fileName) : File(pdf, "application/pdf");
        }

        /// <summary>Issues a draft; it's read-only after this.</summary>
        [HttpPut("invoices/{objId:guid}/send")]
        [ProducesResponseType<InvoiceResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<InvoiceResponse> Send(Guid objId, [FromBody] InvoiceVersionRequest request, CancellationToken ct) =>
            billing.SendAsync(objId, request, ct);

        /// <summary>Records the payment of a sent invoice in full.</summary>
        [HttpPut("invoices/{objId:guid}/pay")]
        [ProducesResponseType<InvoiceResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<InvoiceResponse> Pay(Guid objId, [FromBody] InvoicePayRequest request, CancellationToken ct) =>
            billing.PayAsync(objId, request, ct);

        [HttpPut("invoices/{objId:guid}/void")]
        [ProducesResponseType<InvoiceResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
        [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
        public Task<InvoiceResponse> Void(Guid objId, [FromBody] InvoiceVoidRequest request, CancellationToken ct) =>
            billing.VoidAsync(objId, request, ct);
    }
}
