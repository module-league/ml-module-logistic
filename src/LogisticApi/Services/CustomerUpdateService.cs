using System.Globalization;
using System.Text;
using System.Text.Json;
using Anthropic.Models.Messages;
using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LogisticApi.Services
{
    /// <summary>
    /// Drafts a message to the customer about an exception with Claude: what the customer may know about it (ExceptionFactsService
    /// with forCustomer) and the redelivery slots worked out here from the receiver's opening time go in; an email, a short chat
    /// message and what to confirm first come back. Nothing is sent; a person sends it and logs it.
    /// </summary>
    public class CustomerUpdateService(
        ContextDb db,
        ExceptionFactsService facts,
        RecordTextService texts,
        ClaudeClient claude,
        IOptions<BillingOptions> billingOptions,
        IOptions<DispatchOptions> dispatchOptions,
        IOptions<CustomerUpdateOptions> updateOptions)
    {
        private const string Failure = "The customer update couldn't be drafted.";
        private const int MaxChecks = 3;

        public static readonly Dictionary<string, string> Languages = new()
        {
            ["en"] = "English",
            ["ms"] = "Bahasa Melayu",
            ["zh"] = "Simplified Chinese",
        };

        // Kept word for word between calls: the shared start of every request
        private const string Instructions = """
            You write messages from a logistics company to its customer about one of their shipments: a delay, a failed delivery
            attempt, a missing document, or a plain status update. You get what the customer may know about the shipment, and the
            redelivery slots the company can offer.

            Say only what the facts show. Don't promise times, refunds or outcomes the facts don't support, and don't guess a new
            arrival time; when there's no new time yet, say the company will confirm one. Never mention internal notes, exception or
            rule names, staff or driver names, phone numbers, weights or charges, and don't blame anyone, the customer included. Use
            the shipment's name or reference so the customer knows which one it is.

            Write in the language asked for, polite and plain, as the company's customer service team.
            - subject: a short email subject naming the shipment.
            - message: the email body: greet the customer by name when one is given (otherwise a plain greeting, never a placeholder
              like [Name]), say what happened and what happens next in a few short paragraphs, and sign off with the company name.
              When a redelivery or new appointment is needed and slots are given, list exactly those slots and ask the customer to
              reply with the one that suits them; set offerSlots to true. Otherwise set it to false and offer none.
            - shortMessage: the same news in two to four lines for WhatsApp or SMS, no greeting line, no sign-off.
            - checks: up to three things the team should confirm before sending, e.g. that a driver is free for the slots; empty
              when nothing needs confirming.
            """;

        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
        private readonly BillingOptions billing = billingOptions.Value;
        private readonly DispatchOptions sources = dispatchOptions.Value;
        private readonly CustomerUpdateOptions config = updateOptions.Value;

        public async Task<CustomerUpdateResponse> DraftAsync(Guid objId, CustomerUpdateRequest request, CancellationToken ct)
        {
            var language = request.language ?? "en";
            var languageName = Languages.GetValueOrDefault(language)
                ?? throw ApiProblemException.BadRequest("Unknown language.", $"Use one of {string.Join(", ", Languages.Keys)}.");

            var (exception, _, dispatch, text) = await facts.DescribeAsync(objId, config.MaxCheckpoints, forCustomer: true, ct);
            var (recipientName, recipientEmail) = await RecipientAsync(exception.shipmentId, ct);
            var slots = dispatch is null ? [] : await SlotsAsync(dispatch.destinationId, ct);

            var prompt = new StringBuilder(text);
            prompt.AppendLine();
            prompt.AppendLine("## Message");
            prompt.AppendLine($"Language: {languageName}");
            prompt.AppendLine($"Company: {(billing.Issuer.Name != "" ? billing.Issuer.Name : "the logistics team")}");
            prompt.AppendLine($"Customer: {recipientName ?? "not known; use a plain greeting"}");
            prompt.AppendLine(slots.Count > 0
                ? $"Redelivery slots the company can offer: {string.Join("; ", slots)}"
                : "Redelivery slots: none worked out (the receiver's opening time isn't recorded); ask the customer for a suitable time if one is needed.");

            var call = new MessageCreateParams
            {
                Model = config.Model,
                MaxTokens = config.MaxTokens,
                System = Instructions,
                OutputConfig = new OutputConfig { Effort = ClaudeClient.EffortOf(config.Effort), Format = new JsonOutputFormat { Schema = Schema() } },
                Messages = [new UserMessageParam { Content = prompt.ToString() }],
            };
            var (answerText, inputTokens, outputTokens) = await claude.SendAsync(call, Failure, ct);
            var answer = JsonSerializer.Deserialize<Answer>(answerText, Json)
                ?? throw new ApiProblemException(StatusCodes.Status502BadGateway, Failure, "The AI's answer was empty.");

            return new CustomerUpdateResponse
            {
                exceptionId = exception.ObjId,
                language = language,
                recipientName = recipientName,
                recipientEmail = recipientEmail,
                subject = answer.subject.Trim(),
                message = answer.message.Trim().ReplaceLineEndings("\n"),
                shortMessage = answer.shortMessage.Trim().ReplaceLineEndings("\n"),
                slots = answer.offerSlots ? slots : [],
                checks = answer.checks.Where(c => !string.IsNullOrWhiteSpace(c)).Select(c => c.Trim()).Take(MaxChecks).ToList(),
                usage = new AiUsageResponse { model = config.Model, inputTokens = inputTokens, outputTokens = outputTokens },
            };
        }

        /// <summary>The shipment's Bill To party, by the fields Billing settings name; nulls when they aren't set.</summary>
        private async Task<(string? name, string? email)> RecipientAsync(Guid shipmentId, CancellationToken ct)
        {
            var setting = await db.BillingSettings.AsNoTracking().FirstOrDefaultAsync(s => s.shipmentSidebarId == sources.ShipmentSidebarId, ct);
            if (setting?.billToFieldId is null) return (null, null);
            var shipment = (await RecordRow.LoadAsync(db, sources.ShipmentSidebarId, ct, [shipmentId])).FirstOrDefault();
            if (shipment?.Link(setting.billToFieldId) is not { } partyId) return (null, null);
            var party = (await RecordRow.LoadAsync(db, billing.PartySidebarId, ct, [partyId])).FirstOrDefault();
            if (party is null) return (null, null);
            var name = party.Value(setting.partyNameFieldId)
                ?? (await texts.TitlesAsync(billing.PartySidebarId, ct, [partyId])).GetValueOrDefault(partyId);
            return (string.IsNullOrWhiteSpace(name) ? null : name.Trim(), party.Value(setting.partyEmailFieldId)?.Trim());
        }

        /// <summary>One slot a day from tomorrow at the receiver's opening time, skipping closed days; none when the time isn't recorded.</summary>
        private async Task<List<string>> SlotsAsync(Guid destinationId, CancellationToken ct)
        {
            var openingFieldId = await db.ExceptionSettings.AsNoTracking()
                .Where(s => s.shipmentSidebarId == sources.ShipmentSidebarId)
                .Select(s => s.openingHourFieldId)
                .FirstOrDefaultAsync(ct);
            var destination = (await RecordRow.LoadAsync(db, sources.LocationSidebarId, ct, [destinationId])).FirstOrDefault();
            if (!TimeOnly.TryParseExact(destination?.Value(openingFieldId), ["HH:mm", "HH:mm:ss"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var opening))
                return [];

            List<string> slots = [];
            var day = DateOnly.FromDateTime(texts.LocalNow).AddDays(1);
            // Bounded, so a misconfigured ClosedDays with every day in it can't loop forever
            for (var tries = 0; slots.Count < config.SlotDays && tries < 14; tries++, day = day.AddDays(1))
            {
                if (config.ClosedDays.Contains(day.DayOfWeek)) continue;
                slots.Add($"{day.ToString("ddd dd MMM yyyy", CultureInfo.InvariantCulture)}, from {opening:HH\\:mm}");
            }
            return slots;
        }

        private static Dictionary<string, JsonElement> Schema() => new()
        {
            ["type"] = JsonSerializer.SerializeToElement("object"),
            ["properties"] = JsonSerializer.SerializeToElement(new Dictionary<string, object>
            {
                ["subject"] = new { type = "string" },
                ["message"] = new { type = "string" },
                ["shortMessage"] = new { type = "string" },
                ["offerSlots"] = new { type = "boolean" },
                ["checks"] = new { type = "array", items = new { type = "string" } },
            }),
            ["required"] = JsonSerializer.SerializeToElement(new[] { "subject", "message", "shortMessage", "offerSlots", "checks" }),
            ["additionalProperties"] = JsonSerializer.SerializeToElement(false),
        };

        private sealed record Answer(string subject, string message, string shortMessage, bool offerSlots, List<string> checks);
    }
}
