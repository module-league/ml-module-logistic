using System.Text.Json;
using LogisticApi.Models;

namespace LogisticApi.MVVM
{
    /// <summary>Matches IBillingOverview in web/src/services/billing/billing.types.ts: everything the Billing page shows.</summary>
    public class BillingOverviewResponse
    {
        public List<BillingQuoteResponse> ready { get; set; } = [];
        /// <summary>Delivered and not invoiced, but held back, with why.</summary>
        public List<BillingWaitingResponse> waiting { get; set; } = [];
        /// <summary>Newest first, void ones included.</summary>
        public List<InvoiceResponse> invoices { get; set; } = [];
        /// <summary>The bill-to companies, by title.</summary>
        public List<BillingPartyResponse> parties { get; set; } = [];
        public BillingTotalsResponse totals { get; set; } = new();
        public string currencySymbol { get; set; } = string.Empty;
        public decimal taxPercent { get; set; }
    }

    public class BillingTotalsResponse
    {
        public decimal readyAmount { get; set; }
        public int readyCount { get; set; }
        public decimal draftAmount { get; set; }
        public int draftCount { get; set; }
        public decimal overdueAmount { get; set; }
        public int overdueCount { get; set; }
        /// <summary>Payments received this calendar month, in the configured zone.</summary>
        public decimal paidThisMonthAmount { get; set; }
        public int paidThisMonthCount { get; set; }
    }

    /// <summary>Matches IBillingQuote: a ready shipment priced from the rate card, before it's invoiced.</summary>
    public class BillingQuoteResponse
    {
        public Guid shipmentId { get; set; }
        public Guid? dispatchId { get; set; }
        public DateTime? deliveredAt { get; set; }
        public string? mode { get; set; }
        public string? incoterm { get; set; }
        public decimal? weight { get; set; }
        public string? fromZone { get; set; }
        public string? toZone { get; set; }
        /// <summary>The shipment's Bill To party; what decides who's billed.</summary>
        public Guid? billToId { get; set; }
        /// <summary>consignee or shipper, as the Incoterm suggests.</summary>
        public string? suggestedPayer { get; set; }
        /// <summary>e.g. "Consignee · FCA, buyer pays main carriage".</summary>
        public string? payerHint { get; set; }
        public BillingRateCardResponse? rateCard { get; set; }
        public List<BillingLineResponse> lines { get; set; } = [];
        /// <summary>For the lines selected by default.</summary>
        public decimal subtotal { get; set; }
        public decimal taxAmount { get; set; }
        public decimal total { get; set; }
        /// <summary>What keeps it from being priced, e.g. no rate card for the zones; empty when it can be invoiced.</summary>
        public List<string> problems { get; set; } = [];
    }

    /// <summary>Matches IBillingLine: one quoted or invoiced charge.</summary>
    public class BillingLineResponse
    {
        /// <summary>Unique within a quote: the charge key, plus the exception id for a suggested line.</summary>
        public string key { get; set; } = string.Empty;
        public string chargeKey { get; set; } = string.Empty;
        public string description { get; set; } = string.Empty;
        public string basis { get; set; } = string.Empty;
        public decimal qty { get; set; }
        public decimal unitPrice { get; set; }
        public decimal amount { get; set; }
        public decimal taxRate { get; set; }
        /// <summary>Freight: always on the invoice.</summary>
        public bool required { get; set; }
        public Guid? sourceExceptionId { get; set; }
        /// <summary>EXC-0012, for a line a resolved exception suggested.</summary>
        public string? sourceExceptionNo { get; set; }

        public static BillingLineResponse From(InvoiceLine line, string? exceptionNo = null) => new()
        {
            key = line.sourceExceptionId is { } id ? $"{line.chargeKey}:{id}" : line.chargeKey,
            chargeKey = line.chargeKey,
            description = line.description,
            basis = line.basis,
            qty = line.qty,
            unitPrice = line.unitPrice,
            amount = line.amount,
            taxRate = line.taxRate,
            required = line.chargeKey == InvoiceLine.Freight,
            sourceExceptionId = line.sourceExceptionId,
            sourceExceptionNo = exceptionNo,
        };
    }

    public class BillingRateCardResponse
    {
        public string name { get; set; } = string.Empty;
        public string mode { get; set; } = string.Empty;
        public string fromZone { get; set; } = string.Empty;
        public string toZone { get; set; } = string.Empty;
        public decimal ratePerKg { get; set; }
        public decimal minCharge { get; set; }
        public decimal fuelPct { get; set; }
        public string currency { get; set; } = string.Empty;
        public DateOnly? validFrom { get; set; }
        public DateOnly? validTo { get; set; }

        public static BillingRateCardResponse From(RateCard card) => new()
        {
            name = card.Name,
            mode = card.Mode,
            fromZone = card.FromZone,
            toZone = card.ToZone,
            ratePerKg = card.RatePerKg,
            minCharge = card.MinCharge,
            fuelPct = card.FuelPct,
            currency = card.Currency,
            validFrom = card.ValidFrom,
            validTo = card.ValidTo,
        };
    }

    public class BillingWaitingResponse
    {
        public Guid shipmentId { get; set; }
        public DateTime? deliveredAt { get; set; }
        /// <summary>e.g. "Proof of delivery isn't verified".</summary>
        public List<string> reasons { get; set; } = [];
    }

    public class BillingPartyResponse
    {
        public Guid id { get; set; }
        public string name { get; set; } = string.Empty;
    }

    /// <summary>Matches IInvoice. status is overdue for a sent invoice past its due date.</summary>
    public class InvoiceResponse
    {
        public Guid objId { get; set; }
        public string invoiceNo { get; set; } = string.Empty;
        public Guid shipmentId { get; set; }
        public Guid? dispatchId { get; set; }
        public Guid partyId { get; set; }
        public string partyName { get; set; } = string.Empty;
        public string? partyAddress { get; set; }
        public string? partyEmail { get; set; }
        public string? partyTaxId { get; set; }
        public string? partyRegistrationNo { get; set; }
        public int creditTermsDays { get; set; }
        public string status { get; set; } = string.Empty;
        public DateOnly? issueDate { get; set; }
        public DateOnly? dueDate { get; set; }
        public string currency { get; set; } = string.Empty;
        public decimal subtotal { get; set; }
        public decimal taxAmount { get; set; }
        public decimal total { get; set; }
        public DateTime createdAt { get; set; }
        public DateTime? sentAt { get; set; }
        public DateTime? paidAt { get; set; }
        public DateTime? voidedAt { get; set; }
        public string? voidReason { get; set; }
        public string? eInvoiceRef { get; set; }
        /// <summary>What freight was priced from: rate card, zones and weight.</summary>
        public JsonElement pricing { get; set; }
        public List<BillingLineResponse> lines { get; set; } = [];
        public int versionNo { get; set; }

        public static InvoiceResponse From(Invoice invoice, IEnumerable<InvoiceLine> lines, DateOnly today, IReadOnlyDictionary<Guid, string> exceptionNos) => new()
        {
            objId = invoice.ObjId,
            invoiceNo = invoice.InvoiceNo,
            shipmentId = invoice.shipmentId,
            dispatchId = invoice.dispatchId,
            partyId = invoice.partyId,
            partyName = invoice.partyName,
            partyAddress = invoice.partyAddress,
            partyEmail = invoice.partyEmail,
            partyTaxId = invoice.partyTaxId,
            partyRegistrationNo = invoice.partyRegistrationNo,
            creditTermsDays = invoice.creditTermsDays,
            status = invoice.status == Invoice.Sent && invoice.dueDate < today ? Invoice.Overdue : invoice.status,
            issueDate = invoice.issueDate,
            dueDate = invoice.dueDate,
            currency = invoice.currency,
            subtotal = invoice.subtotal,
            taxAmount = invoice.taxAmount,
            total = invoice.total,
            createdAt = ExceptionResponse.Utc(invoice.CreateTime),
            sentAt = ExceptionResponse.Utc(invoice.sentAt),
            paidAt = ExceptionResponse.Utc(invoice.paidAt),
            voidedAt = ExceptionResponse.Utc(invoice.voidedAt),
            voidReason = invoice.voidReason,
            eInvoiceRef = invoice.eInvoiceRef,
            pricing = JsonSerializer.Deserialize<JsonElement>(invoice.pricing),
            lines = lines
                .OrderBy(l => l.sortOrder)
                .Select(l => BillingLineResponse.From(l, l.sourceExceptionId is { } id ? exceptionNos.GetValueOrDefault(id) : null))
                .ToList(),
            versionNo = invoice.VersionNo,
        };
    }

    /// <summary>Matches IBillingSettings; versionNo 0 until first saved. Weight and mode come from the exception rules, the Incoterm from documents.</summary>
    public class BillingSettingsResponse
    {
        public Guid? billToFieldId { get; set; }
        public Guid? zoneFieldId { get; set; }
        public Guid? partyNameFieldId { get; set; }
        public Guid? partyAddressFieldId { get; set; }
        public Guid? partyEmailFieldId { get; set; }
        public Guid? partyTaxIdFieldId { get; set; }
        public Guid? partyRegistrationFieldId { get; set; }
        public Guid? partyCreditTermsFieldId { get; set; }
        public Guid? chargeableWeightFieldId { get; set; }
        public Guid? modeFieldId { get; set; }
        public Guid? incotermFieldId { get; set; }
        public string partySidebarId { get; set; } = string.Empty;
        public int versionNo { get; set; }
    }

    /// <summary>Matches IBillingRates: the rate cards, charge types and tax from the workflow config.</summary>
    public class BillingRatesResponse
    {
        public List<BillingRateCardResponse> rateCards { get; set; } = [];
        public List<ChargeType> chargeTypes { get; set; } = [];
        public decimal taxPercent { get; set; }
        public bool freightTaxable { get; set; }
        public string currencySymbol { get; set; } = string.Empty;
        public int defaultCreditTermsDays { get; set; }
        public Dictionary<string, string> payerByIncoterm { get; set; } = [];
    }
}
