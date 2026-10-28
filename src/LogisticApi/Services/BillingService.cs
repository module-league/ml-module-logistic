using System.Globalization;
using System.Text.Json;
using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LogisticApi.Services
{
    /// <summary>
    /// Billing: which delivered shipments are ready to bill, their price from the rate card, and their invoices (lg_invoice) from
    /// draft to sent to paid or void. A shipment is ready once it's delivered, the papers that gate billing are verified, no weight
    /// mismatch is open and no invoice that isn't void has it. Sending an invoice posts the Billed checkpoint on its dispatch.
    /// </summary>
    public class BillingService(
        ContextDb db,
        DocumentChecklistService checklists,
        RecordTextService texts,
        IOptions<BillingOptions> billingOptions,
        IOptions<DispatchOptions> dispatchOptions)
    {
        private const string WeightMismatchRule = "weight_mismatch";
        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
        private readonly BillingOptions config = billingOptions.Value;
        private readonly DispatchOptions sources = dispatchOptions.Value;

        /// <summary>A bill-to company with the details an invoice copies.</summary>
        private sealed record Party(Guid Id, string Name, string? RegistrationNo, string? TaxId, string? Address, string? Email, int? CreditTermsDays);

        /// <summary>What pricing reads, loaded once for the shipments asked for.</summary>
        private sealed record Context(
            Dictionary<Guid, Checklist> Checklists,
            BillingSetting? Setting,
            Guid? WeightFieldId,
            Dictionary<Guid, RecordRow> Places,
            ILookup<Guid, ExceptionCase> Exceptions,
            HashSet<Guid> Invoiced,
            Dictionary<Guid, Party> Parties);

        public async Task<BillingOverviewResponse> OverviewAsync(CancellationToken ct)
        {
            var context = await ContextAsync(null, ct);
            var ready = new List<BillingQuoteResponse>();
            var waiting = new List<BillingWaitingResponse>();
            foreach (var checklist in context.Checklists.Values.Where(c => c.Dispatch?.status == Dispatch.Delivered && !context.Invoiced.Contains(c.Shipment.Id)))
            {
                var reasons = HoldReasons(checklist, context);
                if (reasons.Count > 0)
                    waiting.Add(new BillingWaitingResponse { shipmentId = checklist.Shipment.Id, deliveredAt = Utc(checklist.Dispatch?.actualDeliveryAt), reasons = reasons });
                else
                    ready.Add(Quote(checklist, context));
            }

            var today = DateOnly.FromDateTime(texts.LocalNow);
            var invoices = await InvoicesAsync(null, today, ct);
            var monthStart = TimeZoneInfo.ConvertTimeToUtc(new DateTime(today.Year, today.Month, 1), texts.Zone);
            var paidThisMonth = await db.Payments.AsNoTracking().Where(p => p.paidAt >= monthStart).ToListAsync(ct);
            return new BillingOverviewResponse
            {
                ready = ready,
                waiting = waiting,
                invoices = invoices,
                parties = context.Parties.Values.OrderBy(p => p.Name).Select(p => new BillingPartyResponse { id = p.Id, name = p.Name }).ToList(),
                totals = new BillingTotalsResponse
                {
                    readyAmount = ready.Where(q => q.problems.Count == 0).Sum(q => q.total),
                    readyCount = ready.Count,
                    draftAmount = invoices.Where(i => i.status == Invoice.Draft).Sum(i => i.total),
                    draftCount = invoices.Count(i => i.status == Invoice.Draft),
                    overdueAmount = invoices.Where(i => i.status == Invoice.Overdue).Sum(i => i.total),
                    overdueCount = invoices.Count(i => i.status == Invoice.Overdue),
                    paidThisMonthAmount = paidThisMonth.Sum(p => p.amount),
                    paidThisMonthCount = paidThisMonth.Select(p => p.invoiceId).Distinct().Count(),
                },
                currencySymbol = config.CurrencySymbol,
                taxPercent = config.TaxPercent,
            };
        }

        public BillingRatesResponse Rates() => new()
        {
            rateCards = config.RateCards.Select(BillingRateCardResponse.From).ToList(),
            chargeTypes = config.ChargeTypes,
            taxPercent = config.TaxPercent,
            freightTaxable = config.FreightTaxable,
            currencySymbol = config.CurrencySymbol,
            defaultCreditTermsDays = config.DefaultCreditTermsDays,
            payerByIncoterm = config.PayerByIncoterm,
        };

        /// <summary>Prices the shipment again and saves a draft with freight and the picked lines.</summary>
        public async Task<InvoiceResponse> CreateAsync(InvoiceCreateRequest request, CancellationToken ct)
        {
            var (invoice, lines) = await BuildAsync(request, ct);
            db.Invoices.Add(invoice);
            db.InvoiceLines.AddRange(lines);
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
            {
                throw ApiProblemException.Conflict("This shipment is already on an invoice.", "Void that invoice first to bill it again.");
            }
            return (await InvoicesAsync([invoice.ObjId], DateOnly.FromDateTime(texts.LocalNow), ct)).Single();
        }

        /// <summary>The PDF an invoice would have, without saving it.</summary>
        public async Task<byte[]> PreviewPdfAsync(InvoiceCreateRequest request, CancellationToken ct)
        {
            var (invoice, lines) = await BuildAsync(request, ct);
            return await PdfAsync(invoice, lines, preview: true, ct);
        }

        public async Task<(string fileName, byte[] pdf)> InvoicePdfAsync(Guid objId, CancellationToken ct)
        {
            var invoice = await db.Invoices.AsNoTracking().FirstOrDefaultAsync(i => i.ObjId == objId, ct)
                ?? throw ApiProblemException.NotFound("Invoice not found.");
            var lines = await db.InvoiceLines.AsNoTracking().Where(l => l.invoiceId == objId).ToListAsync(ct);
            return ($"{invoice.InvoiceNo}.pdf", await PdfAsync(invoice, lines, preview: false, ct));
        }

        /// <summary>Issues it today, due after the party's credit terms, and posts the Billed checkpoint. It's read-only after this.</summary>
        public Task<InvoiceResponse> SendAsync(Guid objId, InvoiceVersionRequest request, CancellationToken ct) =>
            ChangeAsync(objId, request.versionNo!.Value, invoice =>
            {
                if (invoice.status != Invoice.Draft)
                    throw ApiProblemException.BadRequest($"It's already {invoice.status}.", "Only a draft can be sent.");
                var today = DateOnly.FromDateTime(texts.LocalNow);
                invoice.status = Invoice.Sent;
                invoice.sentAt = DateTime.UtcNow;
                invoice.issueDate = today;
                invoice.dueDate = today.AddDays(invoice.creditTermsDays);
                if (invoice.dispatchId is { } dispatchId)
                    db.CheckpointLogs.Add(new CheckpointLog
                    {
                        ObjId = Guid.CreateVersion7(),
                        dispatchId = dispatchId,
                        status = CheckpointLog.Billed,
                        note = $"Billed on {invoice.InvoiceNo}, {Money(invoice.total)}.",
                        internalOnly = true,
                    });
            }, ct);

        public Task<InvoiceResponse> PayAsync(Guid objId, InvoicePayRequest request, CancellationToken ct) =>
            ChangeAsync(objId, request.versionNo!.Value, invoice =>
            {
                if (invoice.status != Invoice.Sent)
                    throw ApiProblemException.BadRequest(invoice.status == Invoice.Draft ? "Send it first." : $"It's already {invoice.status}.");
                var paidAt = request.paidAt?.UtcDateTime ?? DateTime.UtcNow;
                if (paidAt > DateTime.UtcNow.AddMinutes(5))
                    throw ApiProblemException.BadRequest("The payment date is in the future.");
                invoice.status = Invoice.Paid;
                invoice.paidAt = paidAt;
                db.Payments.Add(new Payment
                {
                    ObjId = Guid.CreateVersion7(),
                    invoiceId = invoice.ObjId,
                    amount = invoice.total,
                    paidAt = paidAt,
                    method = request.method!.Trim(),
                    reference = string.IsNullOrWhiteSpace(request.reference) ? null : request.reference.Trim(),
                });
            }, ct);

        /// <summary>A draft or sent invoice can be voided; its number stays used and the shipment is ready to bill again.</summary>
        public Task<InvoiceResponse> VoidAsync(Guid objId, InvoiceVoidRequest request, CancellationToken ct) =>
            ChangeAsync(objId, request.versionNo!.Value, invoice =>
            {
                var reason = string.IsNullOrWhiteSpace(request.reason) ? throw ApiProblemException.BadRequest("Say why it's voided.") : request.reason.Trim();
                if (invoice.status is not (Invoice.Draft or Invoice.Sent))
                    throw ApiProblemException.BadRequest(
                        invoice.status == Invoice.Paid ? "A paid invoice can't be voided." : "It's already void.",
                        invoice.status == Invoice.Paid ? "Correct it with a credit note instead." : null);
                if (invoice.status == Invoice.Sent && invoice.dispatchId is { } dispatchId)
                    db.CheckpointLogs.Add(new CheckpointLog
                    {
                        ObjId = Guid.CreateVersion7(),
                        dispatchId = dispatchId,
                        note = $"{invoice.InvoiceNo} voided: {reason}. Ready to bill again.",
                        internalOnly = true,
                    });
                invoice.status = Invoice.Void;
                invoice.voidedAt = DateTime.UtcNow;
                invoice.voidReason = reason;
            }, ct);

        public async Task<BillingSettingsResponse> GetSettingsAsync(CancellationToken ct) =>
            await SettingsAsync(await db.BillingSettings.AsNoTracking().FirstOrDefaultAsync(s => s.shipmentSidebarId == sources.ShipmentSidebarId, ct), ct);

        /// <summary>Adds the setting on the first save (versionNo 0) and replaces it after that; each field must be of its table and type.</summary>
        public async Task<BillingSettingsResponse> SaveSettingsAsync(BillingSettingsRequest request, CancellationToken ct)
        {
            var sidebarIds = new[] { sources.ShipmentSidebarId, sources.LocationSidebarId, config.PartySidebarId };
            var fields = await db.SidebarFields.AsNoTracking().Where(f => sidebarIds.Contains(f.sidebarId)).ToDictionaryAsync(f => f.ObjId, ct);
            void Check(Guid? id, string role, string sidebarId, Func<SidebarField, bool> accepts, string kind)
            {
                if (id is not { } fieldId) return;
                if (fields.GetValueOrDefault(fieldId) is not { } field || field.sidebarId != sidebarId)
                    throw ApiProblemException.BadRequest($"Unknown {role} field.", $"'{sidebarId}' has no field '{fieldId}'.");
                if (!accepts(field))
                    throw ApiProblemException.BadRequest($"The {role} needs {kind} field.", $"'{field.sidebarName}' is a {field.type} field.");
            }
            bool Text(SidebarField field) => field.type == "text";
            Check(request.billToFieldId, "Bill To", sources.ShipmentSidebarId,
                f => FieldTypes.IsLink(f.type) && FieldSettings.Read(f.settings).lookupSidebarId == config.PartySidebarId, "a party link");
            Check(request.zoneFieldId, "Zone ID", sources.LocationSidebarId, Text, "a text");
            Check(request.partyNameFieldId, "party name", config.PartySidebarId, Text, "a text");
            Check(request.partyAddressFieldId, "billing address", config.PartySidebarId, Text, "a text");
            Check(request.partyEmailFieldId, "email", config.PartySidebarId, Text, "a text");
            Check(request.partyTaxIdFieldId, "tax ID", config.PartySidebarId, Text, "a text");
            Check(request.partyRegistrationFieldId, "registration no.", config.PartySidebarId, Text, "a text");
            Check(request.partyCreditTermsFieldId, "credit terms", config.PartySidebarId, f => f.type == "number", "a number");

            var setting = await db.BillingSettings.FirstOrDefaultAsync(s => s.shipmentSidebarId == sources.ShipmentSidebarId, ct);
            if (setting is null)
            {
                if (request.versionNo != 0) throw StaleSettings();
                setting = new BillingSetting { ObjId = Guid.CreateVersion7(), shipmentSidebarId = sources.ShipmentSidebarId };
                db.BillingSettings.Add(setting);
            }
            else
            {
                if (setting.VersionNo != request.versionNo) throw StaleSettings();
                db.Entry(setting).Property(s => s.VersionNo).OriginalValue = request.versionNo!.Value;
            }
            setting.billToFieldId = request.billToFieldId;
            setting.zoneFieldId = request.zoneFieldId;
            setting.partyNameFieldId = request.partyNameFieldId;
            setting.partyAddressFieldId = request.partyAddressFieldId;
            setting.partyEmailFieldId = request.partyEmailFieldId;
            setting.partyTaxIdFieldId = request.partyTaxIdFieldId;
            setting.partyRegistrationFieldId = request.partyRegistrationFieldId;
            setting.partyCreditTermsFieldId = request.partyCreditTermsFieldId;
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex) when (ex is DbUpdateConcurrencyException or DbUpdateException { InnerException: SqlException { Number: 2601 or 2627 } })
            {
                throw StaleSettings();
            }
            return await SettingsAsync(setting, ct);
        }

        private async Task<BillingSettingsResponse> SettingsAsync(BillingSetting? setting, CancellationToken ct)
        {
            var roles = await checklists.RolesAsync(ct);
            var weightFieldId = await WeightFieldAsync(ct);
            return new BillingSettingsResponse
            {
                billToFieldId = setting?.billToFieldId,
                zoneFieldId = setting?.zoneFieldId,
                partyNameFieldId = setting?.partyNameFieldId,
                partyAddressFieldId = setting?.partyAddressFieldId,
                partyEmailFieldId = setting?.partyEmailFieldId,
                partyTaxIdFieldId = setting?.partyTaxIdFieldId,
                partyRegistrationFieldId = setting?.partyRegistrationFieldId,
                partyCreditTermsFieldId = setting?.partyCreditTermsFieldId,
                chargeableWeightFieldId = weightFieldId,
                modeFieldId = roles.ModeFieldId,
                incotermFieldId = roles.IncotermFieldId,
                partySidebarId = config.PartySidebarId,
                versionNo = setting?.VersionNo ?? 0,
            };
        }

        private Task<Guid?> WeightFieldAsync(CancellationToken ct) =>
            db.ExceptionSettings.AsNoTracking().Where(s => s.shipmentSidebarId == sources.ShipmentSidebarId).Select(s => s.chargeableWeightFieldId).FirstOrDefaultAsync(ct);

        private async Task<Context> ContextAsync(ICollection<Guid>? shipmentIds, CancellationToken ct)
        {
            var built = await checklists.BuildAsync(ct, shipmentIds);
            var setting = await db.BillingSettings.AsNoTracking().FirstOrDefaultAsync(s => s.shipmentSidebarId == sources.ShipmentSidebarId, ct);
            var ids = built.Keys.ToList();
            Guid[] placeIds = [.. built.Values.SelectMany(c => c.Dispatch is { } d ? new[] { d.originId, d.destinationId } : []).Distinct()];
            var places = (await RecordRow.LoadAsync(db, sources.LocationSidebarId, ct, placeIds)).ToDictionary(r => r.Id);
            var exceptions = (await db.ExceptionCases.AsNoTracking().Where(e => ids.Contains(e.shipmentId)).OrderBy(e => e.DocId).ToListAsync(ct)).ToLookup(e => e.shipmentId);
            var invoiced = (await db.Invoices.AsNoTracking().Where(i => i.status != Invoice.Void && ids.Contains(i.shipmentId)).Select(i => i.shipmentId).ToListAsync(ct)).ToHashSet();

            var titles = await texts.TitlesAsync(config.PartySidebarId, ct);
            var parties = (await RecordRow.LoadAsync(db, config.PartySidebarId, ct)).ToDictionary(r => r.Id, r => new Party(
                r.Id,
                r.Value(setting?.partyNameFieldId) ?? (titles.GetValueOrDefault(r.Id) is { Length: > 0 } title ? title : "Unnamed party"),
                r.Value(setting?.partyRegistrationFieldId),
                r.Value(setting?.partyTaxIdFieldId),
                r.Value(setting?.partyAddressFieldId),
                r.Value(setting?.partyEmailFieldId),
                int.TryParse(r.Value(setting?.partyCreditTermsFieldId), NumberStyles.Number, CultureInfo.InvariantCulture, out var days) && days >= 0 ? days : null));
            return new Context(built, setting, await WeightFieldAsync(ct), places, exceptions, invoiced, parties);
        }

        /// <summary>Why a delivered, uninvoiced shipment can't be billed yet; empty when it's ready.</summary>
        private static List<string> HoldReasons(Checklist checklist, Context context)
        {
            List<string> reasons = [];
            var papers = checklist.Blocking(Dispatch.Delivered, DocumentSteps.Billed, DateTime.UtcNow);
            if (papers.Count > 0)
                reasons.Add($"{string.Join(", ", papers.Select(p => p.Type.Title))} {(papers.Count == 1 ? "isn't" : "aren't")} verified");
            foreach (var mismatch in context.Exceptions[checklist.Shipment.Id].Where(e => e.ruleKey == WeightMismatchRule && e.status != ExceptionCase.Resolved))
                reasons.Add($"Weight mismatch is open (EXC-{mismatch.DocId:0000})");
            return reasons;
        }

        /// <summary>Freight from the rate card, the automatic charges, and lines suggested by resolved exceptions, with how each was worked out.</summary>
        private BillingQuoteResponse Quote(Checklist checklist, Context context)
        {
            var shipment = checklist.Shipment;
            var dispatch = checklist.Dispatch;
            List<string> problems = [];
            var weight = decimal.TryParse(shipment.Value(context.WeightFieldId), NumberStyles.Number, CultureInfo.InvariantCulture, out var kg) && kg > 0 ? kg : (decimal?)null;
            if (context.WeightFieldId is null) problems.Add("Pick the chargeable weight field in Exceptions › Rules.");
            else if (weight is null) problems.Add("The shipment has no chargeable weight.");
            if (checklist.Mode is null) problems.Add("The shipment has no mode.");

            string? ZoneOf(Guid? placeId) => placeId is { } id ? context.Places.GetValueOrDefault(id)?.Value(context.Setting?.zoneFieldId) : null;
            var fromZone = ZoneOf(dispatch?.originId);
            var toZone = ZoneOf(dispatch?.destinationId);
            if (context.Setting?.zoneFieldId is null) problems.Add("Pick the Zone ID field in Billing settings.");
            else if (fromZone is null || toZone is null) problems.Add($"The {(fromZone is null ? "origin" : "destination")} has no Zone ID.");

            var deliveredOn = DateOnly.FromDateTime(dispatch?.actualDeliveryAt ?? DateTime.UtcNow);
            var card = checklist.Mode is null || fromZone is null || toZone is null
                ? null
                : config.RateCards
                    .Where(r => string.Equals(r.Mode, checklist.Mode, StringComparison.OrdinalIgnoreCase)
                        && (r.FromZone == "*" || string.Equals(r.FromZone, fromZone, StringComparison.OrdinalIgnoreCase))
                        && (r.ToZone == "*" || string.Equals(r.ToZone, toZone, StringComparison.OrdinalIgnoreCase))
                        && (r.ValidFrom is null || r.ValidFrom <= deliveredOn)
                        && (r.ValidTo is null || r.ValidTo >= deliveredOn))
                    .OrderByDescending(r => r.Specificity)
                    .FirstOrDefault();
            if (card is null && checklist.Mode is not null && fromZone is not null && toZone is not null)
                problems.Add($"No rate card for {checklist.Mode}, {fromZone} → {toZone}.");

            List<BillingLineResponse> lines = [];
            if (card is not null && weight is { } w)
            {
                var freight = Math.Max(Round(w * card.RatePerKg), card.MinCharge);
                lines.Add(new BillingLineResponse
                {
                    key = InvoiceLine.Freight,
                    chargeKey = InvoiceLine.Freight,
                    description = $"{card.Mode} freight",
                    basis = $"{w:0.###} kg × {Money(card.RatePerKg)}{(card.MinCharge > 0 ? $" (min {Money(card.MinCharge)})" : "")}",
                    qty = w,
                    unitPrice = card.RatePerKg,
                    amount = freight,
                    taxRate = config.FreightTaxable ? config.TaxPercent : 0,
                    required = true,
                });
                foreach (var charge in config.ChargeTypes.Where(c => c.Automatic))
                {
                    if (Line(charge, freight, w, card, hours: null, source: null) is { } line) lines.Add(line);
                }
                foreach (var charge in config.ChargeTypes.Where(c => c.FromRule is not null))
                {
                    foreach (var exception in context.Exceptions[shipment.Id].Where(e => Suggests(charge, e)))
                    {
                        if (Line(charge, freight, w, card, HoursOf(exception), exception) is { } line) lines.Add(line);
                    }
                }
            }

            var (subtotal, tax) = Totals(lines);
            var payer = checklist.Incoterm is { } code ? config.PayerByIncoterm.GetValueOrDefault(code.ToUpperInvariant()) : null;
            return new BillingQuoteResponse
            {
                shipmentId = shipment.Id,
                dispatchId = dispatch?.ObjId,
                deliveredAt = Utc(dispatch?.actualDeliveryAt),
                mode = checklist.Mode,
                incoterm = checklist.Incoterm,
                weight = weight,
                fromZone = fromZone,
                toZone = toZone,
                billToId = shipment.Link(context.Setting?.billToFieldId) is { } partyId && context.Parties.ContainsKey(partyId) ? partyId : null,
                suggestedPayer = payer,
                payerHint = payer is null
                    ? null
                    : $"{CultureInfo.InvariantCulture.TextInfo.ToTitleCase(payer)} · {checklist.Incoterm}, {(payer == "consignee" ? "buyer pays main carriage" : "seller pays carriage")}",
                rateCard = card is null ? null : BillingRateCardResponse.From(card),
                lines = lines,
                subtotal = subtotal,
                taxAmount = tax,
                total = subtotal + tax,
                problems = problems,
            };
        }

        private BillingLineResponse? Line(ChargeType charge, decimal freight, decimal weight, RateCard card, decimal? hours, ExceptionCase? source)
        {
            var exceptionNo = source is null ? null : $"EXC-{source.DocId:0000}";
            var from = exceptionNo is null ? "" : $" · {exceptionNo}";
            (decimal qty, decimal unit, decimal amount, string basis)? priced = charge.Basis switch
            {
                ChargeType.PercentOfFreight when (card.FuelPct > 0 ? card.FuelPct : charge.DefaultAmount) is var pct and > 0 =>
                    (1, Round(freight * pct / 100), Round(freight * pct / 100), $"{pct:0.##}% of freight{from}"),
                ChargeType.PerKg => (weight, charge.DefaultAmount, Round(weight * charge.DefaultAmount), $"{weight:0.###} kg × {Money(charge.DefaultAmount)}{from}"),
                ChargeType.PerHour when hours is { } h => (h, charge.DefaultAmount, Round(h * charge.DefaultAmount), $"{h:0.#} h × {Money(charge.DefaultAmount)}{from}"),
                ChargeType.Flat => (1, charge.DefaultAmount, charge.DefaultAmount, $"{charge.BasisText ?? "Flat"}{from}"),
                _ => null,
            };
            if (priced is not { } p || p.amount <= 0) return null;
            return new BillingLineResponse
            {
                key = source is null ? charge.Key : $"{charge.Key}:{source.ObjId}",
                chargeKey = charge.Key,
                description = charge.Title,
                basis = p.basis,
                qty = p.qty,
                unitPrice = p.unit,
                amount = p.amount,
                taxRate = charge.Taxable ? config.TaxPercent : 0,
                sourceExceptionId = source?.ObjId,
                sourceExceptionNo = exceptionNo,
            };
        }

        /// <summary>A resolved exception of the charge's rule, with one of its reasons; never a false alarm.</summary>
        private static bool Suggests(ChargeType charge, ExceptionCase exception) =>
            exception.ruleKey == charge.FromRule
            && exception.status == ExceptionCase.Resolved
            && exception.resolutionReason != ExceptionCase.FalseAlarmReason
            && (charge.FromReasons.Count == 0 || charge.FromReasons.Contains(exception.resolutionReason ?? ""));

        /// <summary>How long the driver waited, from arrival to opening, rounded up to the half hour.</summary>
        private static decimal? HoursOf(ExceptionCase exception)
        {
            using var facts = JsonDocument.Parse(exception.facts);
            if (!facts.RootElement.TryGetProperty("arrivedAt", out var arrived) || !facts.RootElement.TryGetProperty("opensAt", out var opens)
                || !arrived.TryGetDateTime(out var from) || !opens.TryGetDateTime(out var to) || to <= from)
                return null;
            return Math.Max(0.5m, Math.Ceiling((decimal)(to - from).TotalHours * 2) / 2);
        }

        private (decimal subtotal, decimal tax) Totals(IEnumerable<BillingLineResponse> lines)
        {
            var list = lines.ToList();
            return (list.Sum(l => l.amount), Round(list.Sum(l => l.amount * l.taxRate / 100)));
        }

        /// <summary>The unsaved invoice and lines for a ready shipment: priced now, with freight and the picked lines.</summary>
        private async Task<(Invoice invoice, List<InvoiceLine> lines)> BuildAsync(InvoiceCreateRequest request, CancellationToken ct)
        {
            var shipmentId = request.shipmentId!.Value;
            var context = await ContextAsync([shipmentId], ct);
            var checklist = context.Checklists.GetValueOrDefault(shipmentId)
                ?? throw ApiProblemException.BadRequest("Unknown shipment.", $"'{shipmentId}' isn't a record of '{sources.ShipmentSidebarId}'.");
            if (checklist.Dispatch?.status != Dispatch.Delivered)
                throw ApiProblemException.BadRequest("It isn't delivered yet.", "Only delivered shipments are billed.");
            if (context.Invoiced.Contains(shipmentId))
                throw ApiProblemException.Conflict("This shipment is already on an invoice.", "Void that invoice first to bill it again.");
            if (HoldReasons(checklist, context) is { Count: > 0 } reasons)
                throw ApiProblemException.BadRequest("It isn't ready to bill.", string.Join("; ", reasons) + ".");
            var quote = Quote(checklist, context);
            if (quote.problems.Count > 0)
                throw ApiProblemException.BadRequest("It can't be priced yet.", string.Join(" ", quote.problems));

            var unknown = request.lineKeys.Except(quote.lines.Select(l => l.key)).FirstOrDefault();
            if (unknown is not null)
                throw ApiProblemException.BadRequest("Unknown charge.", $"'{unknown}' isn't one of this shipment's charges; reload to price it again.");
            var partyId = request.partyId ?? quote.billToId
                ?? throw ApiProblemException.BadRequest("Pick who to bill.", "The shipment has no Bill To party.");
            var party = context.Parties.GetValueOrDefault(partyId)
                ?? throw ApiProblemException.BadRequest("Unknown party.", $"'{partyId}' isn't a record of '{config.PartySidebarId}'.");

            var picked = quote.lines.Where(l => l.required || request.lineKeys.Contains(l.key)).ToList();
            var (subtotal, tax) = Totals(picked);
            var invoice = new Invoice
            {
                ObjId = Guid.CreateVersion7(),
                shipmentId = shipmentId,
                dispatchId = quote.dispatchId,
                partyId = party.Id,
                partyName = party.Name,
                partyRegistrationNo = party.RegistrationNo,
                partyTaxId = party.TaxId,
                partyAddress = party.Address,
                partyEmail = party.Email,
                creditTermsDays = party.CreditTermsDays ?? config.DefaultCreditTermsDays,
                status = Invoice.Draft,
                currency = quote.rateCard?.currency ?? config.Currency,
                subtotal = subtotal,
                taxAmount = tax,
                total = subtotal + tax,
                pricing = JsonSerializer.Serialize(new { rateCard = quote.rateCard, quote.weight, quote.fromZone, quote.toZone, quote.mode, quote.incoterm, quote.deliveredAt }, Json),
            };
            var lines = picked.Select((l, i) => new InvoiceLine
            {
                ObjId = Guid.CreateVersion7(),
                invoiceId = invoice.ObjId,
                shipmentId = shipmentId,
                chargeKey = l.chargeKey,
                description = l.description,
                basis = l.basis,
                qty = l.qty,
                unitPrice = l.unitPrice,
                amount = l.amount,
                taxRate = l.taxRate,
                sourceExceptionId = l.sourceExceptionId,
                sortOrder = i,
            }).ToList();
            return (invoice, lines);
        }

        private async Task<List<InvoiceResponse>> InvoicesAsync(ICollection<Guid>? ids, DateOnly today, CancellationToken ct)
        {
            var query = db.Invoices.AsNoTracking();
            if (ids is not null) query = query.Where(i => ids.Contains(i.ObjId));
            var invoices = await query.OrderByDescending(i => i.DocId).ToListAsync(ct);
            var invoiceIds = invoices.Select(i => i.ObjId).ToList();
            var lines = (await db.InvoiceLines.AsNoTracking().Where(l => invoiceIds.Contains(l.invoiceId)).ToListAsync(ct)).ToLookup(l => l.invoiceId);
            var exceptionIds = lines.SelectMany(g => g).Select(l => l.sourceExceptionId).OfType<Guid>().Distinct().ToList();
            var exceptionNos = await db.ExceptionCases.AsNoTracking().Where(e => exceptionIds.Contains(e.ObjId))
                .ToDictionaryAsync(e => e.ObjId, e => $"EXC-{e.DocId:0000}", ct);
            return invoices.Select(i => InvoiceResponse.From(i, lines[i.ObjId], today, exceptionNos)).ToList();
        }

        /// <summary>Loads it, checks the version, applies the change and saves.</summary>
        private async Task<InvoiceResponse> ChangeAsync(Guid objId, int versionNo, Action<Invoice> apply, CancellationToken ct)
        {
            var invoice = await db.Invoices.FirstOrDefaultAsync(i => i.ObjId == objId, ct)
                ?? throw ApiProblemException.NotFound("Invoice not found.");
            if (invoice.VersionNo != versionNo) throw Stale();
            db.Entry(invoice).Property(i => i.VersionNo).OriginalValue = versionNo;
            apply(invoice);
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                throw Stale();
            }
            return (await InvoicesAsync([objId], DateOnly.FromDateTime(texts.LocalNow), ct)).Single();
        }

        private async Task<byte[]> PdfAsync(Invoice invoice, List<InvoiceLine> lines, bool preview, CancellationToken ct)
        {
            var card = await db.DispatchSettings.AsNoTracking().FirstOrDefaultAsync(s => s.shipmentSidebarId == sources.ShipmentSidebarId, ct);
            var shipmentTitle = (await texts.TitlesAsync(sources.ShipmentSidebarId, ct, [invoice.shipmentId], card?.titleFieldId)).GetValueOrDefault(invoice.shipmentId) ?? "";
            using var pricing = JsonDocument.Parse(invoice.pricing);
            string? Price(string name) => pricing.RootElement.TryGetProperty(name, out var value) && value.ValueKind != JsonValueKind.Null ? value.ToString() : null;
            var delivered = DateTime.TryParse(Price("deliveredAt"), CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal, out var at)
                ? TimeZoneInfo.ConvertTimeFromUtc(at, texts.Zone).ToString("dd MMM yyyy HH:mm", CultureInfo.InvariantCulture)
                : "";
            string Date(DateOnly? date) => date?.ToString("dd MMM yyyy", CultureInfo.InvariantCulture) ?? "";
            var issuer = config.Issuer;
            var title = preview ? "INVOICE PREVIEW" : invoice.status switch
            {
                Invoice.Draft => "INVOICE (DRAFT)",
                Invoice.Void => "INVOICE (VOID)",
                _ => "INVOICE",
            };
            var subtitle = preview
                ? $"Not saved · priced {texts.LocalNow:dd MMM yyyy HH:mm}"
                : invoice.issueDate is null
                    ? $"{invoice.InvoiceNo} · not sent yet · due {invoice.creditTermsDays} days after it's sent"
                    : $"{invoice.InvoiceNo} · issued {Date(invoice.issueDate)} · due {Date(invoice.dueDate)}";
            List<(string Label, string Value)> Rows(params (string, string?)[] rows) =>
                rows.Where(r => !string.IsNullOrWhiteSpace(r.Item2)).Select(r => (r.Item1, r.Item2!)).ToList();

            return PdfWriter.Pdf(
                title,
                subtitle,
                [
                    new PdfWriter.Section("From", Rows(("Company", issuer.Name), ("Registration no.", issuer.RegistrationNo), ("Tax ID", issuer.TaxId), ("Address", issuer.Address))),
                    new PdfWriter.Section("Bill to", Rows(("Company", invoice.partyName), ("Registration no.", invoice.partyRegistrationNo), ("Tax ID", invoice.partyTaxId), ("Address", invoice.partyAddress), ("Email", invoice.partyEmail))),
                    new PdfWriter.Section("Shipment", Rows(
                        ("Shipment", shipmentTitle),
                        ("Mode", Price("mode")),
                        ("Incoterm", Price("incoterm")),
                        ("Zones", Price("fromZone") is { } from ? $"{from} → {Price("toZone")}" : null),
                        ("Chargeable weight", Price("weight") is { } kg ? $"{kg} kg" : null),
                        ("Delivered", delivered))),
                    new PdfWriter.Table(
                        "Charges",
                        [new("Charge", 0), new("Basis", 150), new("Tax", 420, Right: true), new("Amount", 495, Right: true)],
                        lines.OrderBy(l => l.sortOrder).Select(l => (new[] { l.description, l.basis, $"{l.taxRate:0.##}%", Money(l.amount) }, false)).ToList()),
                    new PdfWriter.Table(
                        null,
                        [new("", 300), new("", 495, Right: true)],
                        [
                            (new[] { "Subtotal", Money(invoice.subtotal) }, false),
                            (new[] { $"Tax ({config.TaxPercent:0.##}%)", Money(invoice.taxAmount) }, false),
                            (new[] { "Total", Money(invoice.total) }, true),
                        ]),
                ],
                $"Priced from the rate card when invoiced. Tax rate from settings. {(invoice.voidReason is { } reason ? $"Voided: {reason}." : "")}");
        }

        private string Money(decimal amount) => $"{config.CurrencySymbol} {amount.ToString("N2", CultureInfo.InvariantCulture)}";

        private static decimal Round(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);

        private static DateTime? Utc(DateTime? value) => ExceptionResponse.Utc(value);

        private static ApiProblemException Stale() =>
            ApiProblemException.Conflict("The invoice was changed by someone else.", "Reload it and try again.");

        private static ApiProblemException StaleSettings() =>
            ApiProblemException.Conflict("The billing settings were changed by someone else.", "Reload the page and change them again.");
    }
}
