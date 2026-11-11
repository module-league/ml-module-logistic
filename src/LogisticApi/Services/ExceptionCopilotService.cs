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
    /// Sums up an exception with Claude: the exception, its timeline, the shipment, its dispatch and checkpoints, and the people and
    /// places on it go in; what happened, the likely cause, a new arrival time and next steps come back. Nothing is saved or sent.
    /// </summary>
    public class ExceptionCopilotService(
        ContextDb db,
        RecordTextService texts,
        ClaudeClient claude,
        IOptions<ExceptionRuleOptions> ruleOptions,
        IOptions<DispatchOptions> dispatchOptions,
        IOptions<ExceptionCopilotOptions> copilotOptions)
    {
        private const string Failure = "The exception couldn't be summed up.";
        private const string NoReason = "none";
        private const int MaxNote = 2000;
        private static readonly string[] Certainties = ["low", "medium", "high"];

        // Kept word for word between calls: the shared start of every request
        private const string Instructions = """
            You help dispatchers at a logistics company work shipment exceptions: late deliveries, failed delivery attempts, weight
            mismatches, missing documents and the like. You get what the system knows about one exception and the shipment behind it.

            Work only from those facts. Don't invent phone numbers, names, places, times or events. Write for a busy dispatcher:
            short, plain sentences, no jargon, no greeting.

            - summary: what happened and where things stand now, in two or three sentences.
            - cause: the most likely cause the facts point to; empty when they don't point to one. certainty says how sure you are.
            - eta: when the shipment should now arrive, in local time as "dd MMM yyyy HH:mm", only when the facts allow an estimate
              (e.g. a pickup time and a usual transit, or the receiver's opening hours after a failed attempt); otherwise empty.
              etaBasis says how you worked it out.
            - actions: one to three concrete next steps for the dispatcher, most useful first, e.g. "Call the receiver" with what to
              ask. Don't suggest steps the timeline shows were already taken.
            - resolveWith: one of the listed resolve reasons when the timeline shows the problem is already sorted; otherwise "none".
            - unknowns: up to three missing facts that would most change your advice, a few words each, e.g. "The receiver's
              phone number"; empty when nothing important is missing.
            """;

        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
        private readonly ExceptionRuleOptions rules = ruleOptions.Value;
        private readonly DispatchOptions sources = dispatchOptions.Value;
        private readonly ExceptionCopilotOptions config = copilotOptions.Value;

        public async Task<ExceptionCopilotResponse> SuggestAsync(Guid objId, CancellationToken ct)
        {
            var exception = await db.ExceptionCases.AsNoTracking().FirstOrDefaultAsync(e => e.ObjId == objId, ct)
                ?? throw ApiProblemException.NotFound("Exception not found.");
            var rule = rules.Find(exception.ruleKey);
            var reasons = (rule?.Reasons ?? []).Append(ExceptionCase.FalseAlarmReason).Distinct().ToList();

            var prompt = await PromptAsync(exception, rule, reasons, ct);
            var request = new MessageCreateParams
            {
                Model = config.Model,
                MaxTokens = config.MaxTokens,
                System = Instructions,
                OutputConfig = new OutputConfig { Effort = ClaudeClient.EffortOf(config.Effort), Format = new JsonOutputFormat { Schema = Schema(reasons) } },
                Messages = [new UserMessageParam { Content = prompt }],
            };
            var (text, inputTokens, outputTokens) = await claude.SendAsync(request, Failure, ct);
            var answer = JsonSerializer.Deserialize<Answer>(text, Json)
                ?? throw new ApiProblemException(StatusCodes.Status502BadGateway, Failure, "The AI's answer was empty.");

            var response = new ExceptionCopilotResponse
            {
                exceptionId = exception.ObjId,
                summary = answer.summary.Trim(),
                cause = Clean(answer.cause),
                certainty = Certainties.Contains(answer.certainty) ? answer.certainty : "low",
                eta = Clean(answer.eta),
                etaBasis = Clean(answer.eta) is null ? null : Clean(answer.etaBasis),
                actions = answer.actions
                    .Where(a => !string.IsNullOrWhiteSpace(a.title))
                    .Take(3)
                    .Select(a => new ExceptionCopilotActionResponse { title = a.title.Trim(), detail = a.detail.Trim() })
                    .ToList(),
                resolveWith = reasons.Contains(answer.resolveWith) ? answer.resolveWith : null,
                unknowns = answer.unknowns.Select(Clean).OfType<string>().Take(3).ToList(),
                usage = new AiUsageResponse { model = config.Model, inputTokens = inputTokens, outputTokens = outputTokens },
            };
            response.note = Note(response);
            return response;
        }

        /// <summary>Everything the system knows about the exception, as labelled sections of text.</summary>
        private async Task<string> PromptAsync(ExceptionCase exception, ExceptionRule? rule, List<string> reasons, CancellationToken ct)
        {
            var zone = texts.Zone;
            string Local(DateTime utc) => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), zone)
                .ToString("ddd dd MMM yyyy HH:mm", CultureInfo.InvariantCulture);

            var text = new StringBuilder();
            text.AppendLine($"Now: {Local(DateTime.UtcNow)} ({texts.ZoneName}). All times below are in this zone.");
            text.AppendLine();
            text.AppendLine("## Exception");
            text.AppendLine($"Title: {exception.title}");
            text.AppendLine($"Rule: {rule?.Title ?? exception.ruleKey} — opens when {rule?.When ?? "raised by hand"}");
            text.AppendLine($"Severity: {exception.severity}; status: {exception.status}");
            text.AppendLine($"Opened: {Local(exception.CreateTime)}; respond by: {Local(exception.respondBy)}");
            if (exception.snoozedUntil is { } snoozed) text.AppendLine($"Snoozed until: {Local(snoozed)}");
            text.AppendLine($"Facts when it opened: {exception.facts}");
            text.AppendLine($"Resolve reasons: {string.Join("; ", reasons)}");

            var activity = await db.ExceptionActivities.AsNoTracking()
                .Where(a => a.exceptionId == exception.ObjId)
                .OrderBy(a => a.DocId)
                .ToListAsync(ct);
            text.AppendLine();
            text.AppendLine("## Exception timeline, oldest first");
            foreach (var entry in activity)
                text.AppendLine($"- {Local(entry.CreateTime)} · {entry.kind} by {(entry.actorId is null ? "the system" : "a team member")}: {entry.body}");

            await AppendRecordAsync(text, "Shipment", sources.ShipmentSidebarId, exception.shipmentId, ct);

            // An exception raised before dispatch has none of its own; the shipment's latest dispatch still tells where it stands
            var dispatch = exception.dispatchId is { } dispatchId
                ? await db.Dispatches.AsNoTracking().FirstOrDefaultAsync(d => d.ObjId == dispatchId, ct)
                : await db.Dispatches.AsNoTracking().Where(d => d.shipmentId == exception.shipmentId).OrderByDescending(d => d.DocId).FirstOrDefaultAsync(ct);
            if (dispatch is null)
            {
                text.AppendLine();
                text.AppendLine("## Dispatch");
                text.AppendLine("Not dispatched yet.");
                return text.ToString();
            }

            text.AppendLine();
            text.AppendLine("## Dispatch");
            text.AppendLine($"Status: {dispatch.status}");
            text.AppendLine($"Planned pickup: {Local(dispatch.plannedPickupAt)}");
            if (dispatch.plannedDeliveryAt is { } plannedDelivery) text.AppendLine($"Planned delivery: {Local(plannedDelivery)}");
            if (dispatch.actualPickupAt is { } pickedUp) text.AppendLine($"Picked up: {Local(pickedUp)}");
            if (dispatch.actualArrivalAt is { } arrived) text.AppendLine($"Arrived: {Local(arrived)}");
            if (dispatch.actualDeliveryAt is { } delivered) text.AppendLine($"Delivered: {Local(delivered)}");
            if (dispatch.pickupWeight is { } weight) text.AppendLine($"Weighed at pickup: {weight:0.##} kg");
            if (!string.IsNullOrWhiteSpace(dispatch.notes)) text.AppendLine($"Notes: {dispatch.notes}");

            var checkpoints = await db.CheckpointLogs.AsNoTracking()
                .Where(c => c.dispatchId == dispatch.ObjId)
                .OrderByDescending(c => c.DocId)
                .Take(config.MaxCheckpoints)
                .ToListAsync(ct);
            text.AppendLine();
            text.AppendLine("## Dispatch checkpoints, oldest first");
            if (checkpoints.Count == 0) text.AppendLine("None posted.");
            foreach (var checkpoint in Enumerable.Reverse(checkpoints))
            {
                var files = FileCount(checkpoint.attachments);
                var parts = new[]
                {
                    checkpoint.status is { } status ? $"moved to {status}" : null,
                    Clean(checkpoint.note),
                    files > 0 ? $"{files} file(s) attached" : null,
                    checkpoint.internalOnly ? "(internal)" : null,
                }.OfType<string>();
                text.AppendLine($"- {Local(checkpoint.CreateTime)}: {string.Join(" · ", parts)}");
            }

            await AppendRecordAsync(text, "Driver", sources.DriverSidebarId, dispatch.driverId, ct);
            await AppendRecordAsync(text, "Vehicle", sources.VehicleSidebarId, dispatch.vehicleId, ct);
            await AppendRecordAsync(text, "Origin (pickup)", sources.LocationSidebarId, dispatch.originId, ct);
            await AppendRecordAsync(text, "Destination (receiver)", sources.LocationSidebarId, dispatch.destinationId, ct);
            return text.ToString();
        }

        /// <summary>A record's fields as "Label: value" lines under a heading.</summary>
        private async Task AppendRecordAsync(StringBuilder text, string heading, string sidebarId, Guid id, CancellationToken ct)
        {
            var row = (await RecordRow.LoadAsync(db, sidebarId, ct, [id])).FirstOrDefault();
            var (title, fields) = await texts.FieldTextsAsync(sidebarId, row, ct);
            text.AppendLine();
            text.AppendLine($"## {heading}");
            if (row is null)
            {
                text.AppendLine("Record not found.");
                return;
            }
            if (title != "") text.AppendLine($"Name: {title}");
            foreach (var (field, value) in fields) text.AppendLine($"{field.sidebarName}: {value}");
        }

        /// <summary>The suggestion as one timeline note, cut to what a note can hold.</summary>
        private static string Note(ExceptionCopilotResponse response)
        {
            var text = new StringBuilder();
            text.AppendLine($"AI summary: {response.summary}");
            if (response.cause is { } cause) text.AppendLine($"Likely cause ({response.certainty} certainty): {cause}");
            if (response.eta is { } eta) text.AppendLine($"Estimated arrival: {eta}{(response.etaBasis is { } basis ? $" ({basis})" : "")}");
            if (response.actions.Count > 0)
            {
                text.AppendLine("Suggested next steps:");
                foreach (var (action, index) in response.actions.Select((a, i) => (a, i + 1)))
                    text.AppendLine($"{index}. {action.title}{(action.detail != "" ? $": {action.detail}" : "")}");
            }
            var note = text.ToString().TrimEnd().ReplaceLineEndings("\n");
            return note.Length <= MaxNote ? note : note[..(MaxNote - 1)] + "…";
        }

        private static int FileCount(string attachments)
        {
            try
            {
                using var json = JsonDocument.Parse(attachments);
                return json.RootElement.ValueKind == JsonValueKind.Array ? json.RootElement.GetArrayLength() : 0;
            }
            catch (JsonException)
            {
                return 0;
            }
        }

        private static string? Clean(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

        private static Dictionary<string, JsonElement> Schema(List<string> reasons) => new()
        {
            ["type"] = JsonSerializer.SerializeToElement("object"),
            ["properties"] = JsonSerializer.SerializeToElement(new Dictionary<string, object>
            {
                ["summary"] = new { type = "string" },
                ["cause"] = new { type = "string" },
                ["certainty"] = new { type = "string", @enum = Certainties },
                ["eta"] = new { type = "string" },
                ["etaBasis"] = new { type = "string" },
                ["actions"] = new
                {
                    type = "array",
                    items = new
                    {
                        type = "object",
                        properties = new Dictionary<string, object>
                        {
                            ["title"] = new { type = "string" },
                            ["detail"] = new { type = "string" },
                        },
                        required = new[] { "title", "detail" },
                        additionalProperties = false,
                    },
                },
                ["resolveWith"] = new { type = "string", @enum = reasons.Append(NoReason).ToArray() },
                ["unknowns"] = new { type = "array", items = new { type = "string" } },
            }),
            ["required"] = JsonSerializer.SerializeToElement(new[] { "summary", "cause", "certainty", "eta", "etaBasis", "actions", "resolveWith", "unknowns" }),
            ["additionalProperties"] = JsonSerializer.SerializeToElement(false),
        };

        private sealed record ActionValue(string title, string detail);

        private sealed record Answer(
            string summary,
            string cause,
            string certainty,
            string eta,
            string etaBasis,
            List<ActionValue> actions,
            string resolveWith,
            List<string> unknowns);
    }
}
