using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Anthropic.Models.Messages;
using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LogisticApi.Services
{
    /// <summary>
    /// Checks a ready shipment's charges with Claude before it's invoiced: the proof of delivery (the file itself), the quote, the
    /// rate card and charge types, the shipment's exceptions with their timelines and the dispatch's checkpoints go in; what the
    /// POD states and what's missing, doubtful or wrong on the invoice comes back. The API prices every suggested line itself and
    /// compares the weights itself; the model never sets an amount. Nothing is saved.
    /// </summary>
    public partial class BillingAuditService(
        ContextDb db,
        BillingService billing,
        DocumentChecklistService checklists,
        AttachmentService attachments,
        RecordTextService texts,
        ClaudeClient claude,
        IOptions<BillingOptions> billingOptions,
        IOptions<ExceptionRuleOptions> ruleOptions,
        IOptions<DispatchOptions> dispatchOptions,
        IOptions<BillingAuditOptions> auditOptions)
    {
        public const string LooksRight = "looks_right";
        public const string Review = "review";

        public const string AddCharge = "add_charge";
        public const string Weight = "weight";
        public const string RemoveCharge = "remove_charge";
        public const string CheckKind = "check";
        public const string Ok = "ok";

        private const string ProofOfDelivery = "proof_of_delivery";
        private const string WeightMismatchRule = "weight_mismatch";
        private const string NoCharge = "none";
        private const string Failure = "The charges couldn't be checked.";
        private const int MaxFindings = 8;
        private static readonly string[] Kinds = [AddCharge, Weight, RemoveCharge, CheckKind, Ok];

        // Kept word for word between calls: the shared start of every request
        private const string Instructions = """
            You audit invoices for a logistics company before they are sent. You get the proof of delivery (POD) as a file, the
            invoice draft priced from the rate card, the charge types that can be billed, and what the system knows about the shipment:
            its record, its dispatch with checkpoints, and its exceptions with their timelines.

            First read the POD and report what it states, as printed, stamped or handwritten: when it was delivered, who received it,
            whether it is signed or stamped, the weight, the number of pieces, and any remarks. Leave out what it doesn't say.

            Then check the draft. Work only from the facts given; don't invent events or amounts. Report under findings:
            - add_charge: a billable charge type that the POD, an exception or a checkpoint shows happened but that isn't on the draft,
              e.g. waiting time written on the POD, a redelivery noted on a checkpoint. Give its chargeKey and qty (hours for a per-hour
              charge, times for a flat one) and name the exception (EXC-0000) when it comes from one.
            - remove_charge: a line on the draft that the facts contradict, e.g. waiting time billed although the POD and timeline show
              none. Give its chargeKey.
            - check: something a person should look at before sending, e.g. damage noted on the POD, a partial delivery, a POD that
              names a different receiver, a delivery date far from the dispatch's.
            - ok: at most one, when a charge someone might doubt is right, with why.
            Don't report the weight; the API compares it. Don't repeat a charge the draft already has for the same exception. Each
            finding names its source: "POD remarks", "EXC-0022", "checkpoint 14:05". Write for a billing clerk: short and plain.
            summary says in one or two sentences whether the draft is ready to send.
            """;

        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
        private readonly BillingOptions config = billingOptions.Value;
        private readonly ExceptionRuleOptions rules = ruleOptions.Value;
        private readonly DispatchOptions sources = dispatchOptions.Value;
        private readonly BillingAuditOptions audit = auditOptions.Value;

        public async Task<BillingAuditResponse> AuditAsync(BillingAuditRequest request, CancellationToken ct)
        {
            var shipmentId = request.shipmentId!.Value;
            var quote = await billing.ReadyQuoteAsync(shipmentId, ct);
            var checklist = (await checklists.BuildAsync(ct, [shipmentId])).GetValueOrDefault(shipmentId)
                ?? throw ApiProblemException.BadRequest("Unknown shipment.");
            var ruleSet = (await checklists.RolesAsync(ct)).Rules;

            var pod = checklist.Documents.FirstOrDefault(d => d.docType == ProofOfDelivery && d.currentAttachmentId is not null)
                ?? throw ApiProblemException.BadRequest("There's no proof of delivery to check.", "File the POD under its document type first.");
            var (attachment, content) = await ReadFileAsync(pod.currentAttachmentId!.Value, ct);

            var exceptions = await db.ExceptionCases.AsNoTracking().Where(e => e.shipmentId == shipmentId).OrderBy(e => e.DocId).ToListAsync(ct);
            var exceptionIds = exceptions.Select(e => e.ObjId).ToList();
            var activity = (await db.ExceptionActivities.AsNoTracking().Where(a => exceptionIds.Contains(a.exceptionId)).OrderBy(a => a.DocId).ToListAsync(ct))
                .ToLookup(a => a.exceptionId);
            var checkpoints = checklist.Dispatch is { } dispatch
                ? await db.CheckpointLogs.AsNoTracking().Where(c => c.dispatchId == dispatch.ObjId).OrderByDescending(c => c.DocId).Take(audit.MaxCheckpoints).ToListAsync(ct)
                : [];
            var billable = config.ChargeTypes.Where(c => !c.Automatic).ToList();
            var exceptionNos = exceptions.ToDictionary(e => $"EXC-{e.DocId:0000}");

            var prompt = await PromptAsync(checklist, quote, attachment.fileName, exceptions, activity, checkpoints, billable, ruleSet, ct);
            var requestParams = new MessageCreateParams
            {
                Model = audit.Model,
                MaxTokens = audit.MaxTokens,
                System = Instructions,
                OutputConfig = new OutputConfig { Effort = ClaudeClient.EffortOf(audit.Effort), Format = new JsonOutputFormat { Schema = Schema(billable, quote) } },
                Messages =
                [
                    new UserMessageParam
                    {
                        Content = new List<ContentBlockParam> { FileBlock(content, attachment.fileExtension), new TextBlockParam { Text = prompt } },
                    },
                ],
            };
            var (text, inputTokens, outputTokens) = await claude.SendAsync(requestParams, Failure, ct);
            var answer = JsonSerializer.Deserialize<Answer>(text, Json)
                ?? throw new ApiProblemException(StatusCodes.Status502BadGateway, Failure, "The AI's answer was empty.");

            var podFacts = new BillingAuditPodResponse
            {
                deliveredAt = Clean(answer.pod.deliveredAt),
                receivedBy = Clean(answer.pod.receivedBy),
                signed = answer.pod.signature switch { "signed" => true, "unsigned" => false, _ => null },
                weight = Clean(answer.pod.weight),
                pieces = Clean(answer.pod.pieces),
                remarks = Clean(answer.pod.remarks),
            };

            // The API's own checks come first: they don't depend on the model's judgement
            List<BillingAuditFindingResponse> findings = [];
            if (WeightFinding(podFacts.weight, quote.weight, answer.pod.weightSource) is { } weight) findings.Add(weight);
            if (podFacts.signed == false)
                findings.Add(new BillingAuditFindingResponse { kind = CheckKind, title = "The POD isn't signed", detail = "No signature or stamp was found on it. Confirm the delivery with the receiver before billing.", source = "POD" });

            var freight = quote.lines.First(l => l.chargeKey == InvoiceLine.Freight).amount;
            foreach (var found in answer.findings)
            {
                if (findings.Count >= MaxFindings) break;
                if (!Kinds.Contains(found.kind) || found.kind == Weight || string.IsNullOrWhiteSpace(found.title)) continue;
                var finding = new BillingAuditFindingResponse { kind = found.kind, title = found.title.Trim(), detail = found.detail.Trim(), source = Clean(found.source) ?? "AI" };
                var charge = billable.FirstOrDefault(c => c.Key == found.chargeKey);
                var exception = exceptionNos.GetValueOrDefault(Clean(found.exceptionNo) ?? "");
                switch (found.kind)
                {
                    case AddCharge:
                        if (charge is null) continue;
                        // Already suggested by the same exception: the clerk only has to tick it
                        if (exception is not null && quote.lines.Any(l => l.chargeKey == charge.Key && l.sourceExceptionId == exception.ObjId)) continue;
                        var qty = found.qty is > 0 ? Math.Round(found.qty, 1) : 1;
                        var extra = new InvoiceExtraLineRequest { chargeKey = charge.Key, qty = qty, note = "From the AI check", sourceExceptionId = exception?.ObjId };
                        finding.line = billing.ExtraLine(charge, qty, freight, quote.weight ?? 0, quote.rateCard?.fuelPct ?? 0, extra.note, exception is null ? null : (exception.ObjId, $"EXC-{exception.DocId:0000}"));
                        if (finding.line is null) continue;
                        finding.extraLine = extra;
                        break;
                    case RemoveCharge:
                        var line = quote.lines.FirstOrDefault(l => !l.required && l.chargeKey == found.chargeKey && (exception is null || l.sourceExceptionId == exception.ObjId));
                        if (line is null) continue;
                        finding.lineKey = line.key;
                        break;
                }
                findings.Add(finding);
            }
            var ordered = findings.OrderBy(f => Array.IndexOf(Kinds, f.kind)).ToList();

            var changes = ordered.Count(f => f.kind is AddCharge or Weight or RemoveCharge);
            var checks = ordered.Count(f => f.kind == CheckKind);
            return new BillingAuditResponse
            {
                shipmentId = shipmentId,
                fileName = attachment.fileName,
                verdict = changes > 0 ? Review : LooksRight,
                verdictText = changes > 0
                    ? $"{Plural(changes, "finding changes", "findings change")} the invoice{(checks > 0 ? $", and {Plural(checks, "thing needs", "things need")} a look" : "")}. Go through them before creating it."
                    : checks > 0
                        ? $"The charges look right, but {Plural(checks, "thing needs", "things need")} a look before sending."
                        : "The charges agree with the POD, the exceptions and the checkpoints.",
                summary = answer.summary.Trim(),
                pod = podFacts,
                findings = ordered,
                usage = new AiUsageResponse { model = audit.Model, inputTokens = inputTokens, outputTokens = outputTokens },
            };
        }

        /// <summary>A weight finding when the POD's weight is outside the tolerance of the record's; the comparison is the API's, not the model's.</summary>
        private BillingAuditFindingResponse? WeightFinding(string? podWeight, decimal? recordWeight, string? source)
        {
            if (podWeight is null || recordWeight is not { } record || record <= 0 || NumberIn(podWeight) is not { } onPod || onPod <= 0) return null;
            var tolerance = rules.Find(WeightMismatchRule)?.TolerancePercent ?? audit.WeightTolerancePercent;
            var diff = Math.Abs(onPod - record) / record * 100;
            if (diff <= tolerance) return null;
            return new BillingAuditFindingResponse
            {
                kind = Weight,
                title = $"Freight uses {record:0.###} kg; the POD says {podWeight}",
                detail = $"That's {diff:0.#}% apart, more than the {tolerance:0.#}% tolerance. Check which weight is right and correct the shipment's chargeable weight before invoicing; freight is priced from it.",
                source = Clean(source) ?? "POD",
            };
        }

        private async Task<(Attachment attachment, byte[] content)> ReadFileAsync(Guid attachmentId, CancellationToken ct)
        {
            var (attachment, stream) = await attachments.OpenAsync(attachmentId, ct);
            await using (stream)
            {
                if (!DocumentReviewService.ContentTypes.ContainsKey(attachment.fileExtension))
                    throw ApiProblemException.BadRequest("Only a PDF, JPG or PNG proof of delivery can be checked.", $"{attachment.fileName} is a .{attachment.fileExtension} file.");
                using var buffer = new MemoryStream();
                await stream.CopyToAsync(buffer, ct);
                return (attachment, buffer.ToArray());
            }
        }

        private static ContentBlockParam FileBlock(byte[] content, string extension)
        {
            var data = Convert.ToBase64String(content);
            return DocumentReviewService.ContentTypes[extension] switch
            {
                "application/pdf" => new DocumentBlockParam { Source = new Base64PdfSource { Data = data } },
                "image/jpeg" => new ImageBlockParam { Source = new Base64ImageSource { Data = data, MediaType = MediaType.ImageJpeg } },
                _ => new ImageBlockParam { Source = new Base64ImageSource { Data = data, MediaType = MediaType.ImagePng } },
            };
        }

        /// <summary>Everything the audit can check the POD against, as labelled sections of text.</summary>
        private async Task<string> PromptAsync(
            Checklist checklist,
            BillingQuoteResponse quote,
            string podFileName,
            List<ExceptionCase> exceptions,
            ILookup<Guid, ExceptionActivity> activity,
            List<CheckpointLog> checkpoints,
            List<ChargeType> billable,
            DocumentRules ruleSet,
            CancellationToken ct)
        {
            var zone = texts.Zone;
            string Local(DateTime utc) => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), zone)
                .ToString("ddd dd MMM yyyy HH:mm", CultureInfo.InvariantCulture);
            string Money(decimal amount) => $"{config.CurrencySymbol} {amount.ToString("N2", CultureInfo.InvariantCulture)}";

            var text = new StringBuilder();
            text.AppendLine($"Now: {Local(DateTime.UtcNow)} ({texts.ZoneName}). All times below are in this zone. The attached file is the proof of delivery: {podFileName}");

            var (title, fields) = await texts.FieldTextsAsync(sources.ShipmentSidebarId, checklist.Shipment, ct);
            text.AppendLine();
            text.AppendLine("## Shipment record");
            if (title != "") text.AppendLine($"Name: {title}");
            foreach (var (field, value) in fields) text.AppendLine($"{field.sidebarName}: {value}");
            text.AppendLine($"Chargeable weight used for freight: {quote.weight:0.###} kg");

            if (checklist.Dispatch is { } dispatch)
            {
                text.AppendLine();
                text.AppendLine("## Dispatch");
                text.AppendLine($"Status: {dispatch.status}");
                text.AppendLine($"Planned pickup: {Local(dispatch.plannedPickupAt)}");
                if (dispatch.plannedDeliveryAt is { } plannedDelivery) text.AppendLine($"Planned delivery: {Local(plannedDelivery)}");
                if (dispatch.actualPickupAt is { } pickedUp) text.AppendLine($"Picked up: {Local(pickedUp)}");
                if (dispatch.actualArrivalAt is { } arrived) text.AppendLine($"Arrived: {Local(arrived)}");
                if (dispatch.actualDeliveryAt is { } delivered) text.AppendLine($"Delivered: {Local(delivered)}");
                if (dispatch.pickupWeight is { } weighed) text.AppendLine($"Weighed at pickup: {weighed:0.##} kg");
                if (!string.IsNullOrWhiteSpace(dispatch.notes)) text.AppendLine($"Notes: {dispatch.notes}");

                text.AppendLine();
                text.AppendLine("## Dispatch checkpoints, oldest first");
                if (checkpoints.Count == 0) text.AppendLine("None posted.");
                foreach (var checkpoint in Enumerable.Reverse(checkpoints))
                {
                    var parts = new[]
                    {
                        checkpoint.status is { } status ? $"moved to {status}" : null,
                        Clean(checkpoint.note),
                        checkpoint.internalOnly ? "(internal)" : null,
                    }.OfType<string>();
                    text.AppendLine($"- {Local(checkpoint.CreateTime)}: {string.Join(" · ", parts)}");
                }
            }

            text.AppendLine();
            text.AppendLine("## Invoice draft");
            if (quote.rateCard is { } card)
                text.AppendLine($"Rate card: {card.name} ({card.mode}, {card.fromZone} → {card.toZone}): {Money(card.ratePerKg)} per kg, minimum {Money(card.minCharge)}, fuel {card.fuelPct:0.##}%");
            text.AppendLine("Lines (description · basis · amount · source):");
            foreach (var line in quote.lines)
                text.AppendLine($"- {line.chargeKey}: {line.description} · {line.basis} · {Money(line.amount)}{(line.sourceExceptionNo is { } no ? $" · suggested by {no}" : "")}");
            text.AppendLine($"Subtotal {Money(quote.subtotal)}, tax {Money(quote.taxAmount)}, total {Money(quote.total)}");

            text.AppendLine();
            text.AppendLine("## Charge types that can be added (chargeKey: title · basis · when it applies)");
            foreach (var charge in billable)
            {
                var basis = charge.Basis switch
                {
                    ChargeType.PerHour => $"{Money(charge.DefaultAmount)} per hour",
                    ChargeType.PerKg => $"{Money(charge.DefaultAmount)} per kg",
                    ChargeType.PercentOfFreight => "percent of freight",
                    _ => $"{Money(charge.DefaultAmount)} {charge.BasisText ?? "flat"}",
                };
                var when = charge.FromRule is { } rule
                    ? $"after a \"{rules.Find(rule)?.Title ?? rule}\" exception{(charge.FromReasons.Count > 0 ? $" resolved as {string.Join(" or ", charge.FromReasons.Select(r => $"\"{r}\""))}" : "")}"
                    : "when it happened";
                text.AppendLine($"- {charge.Key}: {charge.Title} · {basis} · {when}");
            }

            text.AppendLine();
            text.AppendLine("## Exceptions of this shipment");
            if (exceptions.Count == 0) text.AppendLine("None.");
            foreach (var exception in exceptions)
            {
                text.AppendLine($"- EXC-{exception.DocId:0000} {exception.title} (rule {exception.ruleKey}, {exception.status}{(exception.resolutionReason is { } reason ? $", resolved as \"{reason}\"" : "")}), opened {Local(exception.CreateTime)}; facts {exception.facts}");
                foreach (var entry in activity[exception.ObjId].Where(a => !string.IsNullOrWhiteSpace(a.body)))
                    text.AppendLine($"    {Local(entry.CreateTime)} · {entry.kind}: {entry.body}");
            }

            var others = checklist.Documents
                .Where(d => d.docType != ProofOfDelivery && d.currentAttachmentId is not null)
                .Select(d => $"{ruleSet.Type(d.docType)?.Title ?? d.docType} ({d.status})")
                .ToList();
            text.AppendLine();
            text.AppendLine("## Other documents on file (not attached)");
            text.AppendLine(others.Count == 0 ? "None." : string.Join("; ", others));
            return text.ToString();
        }

        private static Dictionary<string, JsonElement> Schema(List<ChargeType> billable, BillingQuoteResponse quote)
        {
            var chargeKeys = billable.Select(c => c.Key).Concat(quote.lines.Select(l => l.chargeKey)).Append(NoCharge).Distinct().ToArray();
            var podProperties = new Dictionary<string, object>();
            foreach (var name in new[] { "deliveredAt", "receivedBy", "weight", "weightSource", "pieces", "remarks" }) podProperties[name] = new { type = "string" };
            podProperties["signature"] = new { type = "string", @enum = new[] { "signed", "unsigned", "unclear" } };
            return new Dictionary<string, JsonElement>
            {
                ["type"] = JsonSerializer.SerializeToElement("object"),
                ["properties"] = JsonSerializer.SerializeToElement(new Dictionary<string, object>
                {
                    ["pod"] = new { type = "object", properties = podProperties, required = podProperties.Keys.ToArray(), additionalProperties = false },
                    ["summary"] = new { type = "string" },
                    ["findings"] = new
                    {
                        type = "array",
                        items = new
                        {
                            type = "object",
                            properties = new Dictionary<string, object>
                            {
                                ["kind"] = new { type = "string", @enum = new[] { AddCharge, RemoveCharge, CheckKind, Ok } },
                                ["chargeKey"] = new { type = "string", @enum = chargeKeys },
                                ["qty"] = new { type = "number" },
                                ["exceptionNo"] = new { type = "string" },
                                ["title"] = new { type = "string" },
                                ["detail"] = new { type = "string" },
                                ["source"] = new { type = "string" },
                            },
                            required = new[] { "kind", "chargeKey", "qty", "exceptionNo", "title", "detail", "source" },
                            additionalProperties = false,
                        },
                    },
                }),
                ["required"] = JsonSerializer.SerializeToElement(new[] { "pod", "summary", "findings" }),
                ["additionalProperties"] = JsonSerializer.SerializeToElement(false),
            };
        }

        /// <summary>The first number in "860 kg" or "1,240.5 KG"; commas are thousands separators.</summary>
        private static decimal? NumberIn(string value) =>
            NumberPattern().Match(value) is { Success: true } match
            && decimal.TryParse(match.Value.Replace(",", ""), NumberStyles.Number, CultureInfo.InvariantCulture, out var number)
                ? number
                : null;

        private static string? Clean(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

        private static string Plural(int count, string one, string many) => $"{count} {(count == 1 ? one : many)}";

        [GeneratedRegex(@"\d[\d,]*(\.\d+)?")]
        private static partial Regex NumberPattern();

        private sealed record PodAnswer(string deliveredAt, string receivedBy, string signature, string weight, string weightSource, string pieces, string remarks);

        private sealed record FindingAnswer(string kind, string chargeKey, decimal qty, string exceptionNo, string title, string detail, string source);

        private sealed record Answer(PodAnswer pod, string summary, List<FindingAnswer> findings);
    }
}
