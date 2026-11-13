using System.Text;
using System.Text.Json;
using Anthropic.Models.Messages;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.Extensions.Options;

namespace LogisticApi.Services
{
    /// <summary>
    /// Sums up an exception with Claude: what the system knows about it (ExceptionFactsService) and the rule's resolve reasons go
    /// in; what happened, the likely cause, a new arrival time and next steps come back. Nothing is saved or sent.
    /// </summary>
    public class ExceptionCopilotService(ExceptionFactsService facts, ClaudeClient claude, IOptions<ExceptionCopilotOptions> copilotOptions)
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
        private readonly ExceptionCopilotOptions config = copilotOptions.Value;

        public async Task<ExceptionCopilotResponse> SuggestAsync(Guid objId, CancellationToken ct)
        {
            var (exception, rule, _, text) = await facts.DescribeAsync(objId, config.MaxCheckpoints, forCustomer: false, ct);
            var reasons = (rule?.Reasons ?? []).Append(ExceptionCase.FalseAlarmReason).Distinct().ToList();
            var prompt = $"{text}\n## Resolve reasons\n{string.Join("; ", reasons)}\n";
            var request = new MessageCreateParams
            {
                Model = config.Model,
                MaxTokens = config.MaxTokens,
                System = Instructions,
                OutputConfig = new OutputConfig { Effort = ClaudeClient.EffortOf(config.Effort), Format = new JsonOutputFormat { Schema = Schema(reasons) } },
                Messages = [new UserMessageParam { Content = prompt }],
            };
            var (answerText, inputTokens, outputTokens) = await claude.SendAsync(request, Failure, ct);
            var answer = JsonSerializer.Deserialize<Answer>(answerText, Json)
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
