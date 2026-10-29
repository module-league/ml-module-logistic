using System.Text;
using System.Text.Json;
using Anthropic;
using Anthropic.Exceptions;
using Anthropic.Models.Messages;
using LogisticApi.Models;
using Microsoft.Extensions.Options;

namespace LogisticApi.Services
{
    /// <summary>
    /// Reads a document with Claude in one request: the file, the document types and the shipment fields to look for go in, and a
    /// JSON answer that must match the schema comes back. The model only reads; it never sees whether a value is right.
    /// </summary>
    public class ClaudeDocumentReader(
        IOptions<DocumentReviewOptions> options,
        IConfiguration configuration,
        ILogger<ClaudeDocumentReader> logger) : IDocumentReader
    {
        private const string OtherType = "other";

        // Kept word for word between calls: the shared start of every request
        private const string Instructions = """
            You read shipping documents for a logistics company: commercial invoices, packing lists, waybills, bills of lading,
            consignment notes, certificates of origin and proofs of delivery.

            Report only what is printed, stamped or handwritten on the document. Leave a field out when the document doesn't state it;
            don't infer or complete values. Copy each value as it appears, with its unit (e.g. "1,240 kg"). For every value, say where
            you read it: the page and the part of the page, e.g. "Page 2 · totals row".

            Confidence is how sure you are of the document type, 0 to 100. Go below 60 when the file is hard to read or could be
            more than one type.
            """;

        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
        private readonly DocumentReviewOptions config = options.Value;
        private AnthropicClient? client;

        public async Task<DocumentReading> ReadAsync(DocumentReadInput input, CancellationToken ct)
        {
            var request = new MessageCreateParams
            {
                Model = config.Model,
                MaxTokens = config.MaxTokens,
                System = Instructions,
                OutputConfig = new OutputConfig { Effort = EffortOf(config.Effort), Format = new JsonOutputFormat { Schema = Schema(input) } },
                Messages =
                [
                    new UserMessageParam
                    {
                        Content = new List<ContentBlockParam> { FileBlock(input), new TextBlockParam { Text = Prompt(input) } },
                    },
                ],
            };

            Message response;
            try
            {
                response = await Client().Messages.Create(request, ct);
            }
            catch (AnthropicRateLimitException)
            {
                throw new ApiProblemException(StatusCodes.Status429TooManyRequests, "Too many documents are being reviewed at once.", "Try again in a minute.");
            }
            catch (AnthropicApiException error)
            {
                logger.LogError(error, "Claude rejected the review of {FileName}", input.FileName);
                throw new ApiProblemException(StatusCodes.Status502BadGateway, "The document couldn't be reviewed.", "The AI service returned an error; it is logged.");
            }
            catch (AnthropicIOException error)
            {
                logger.LogError(error, "Couldn't reach Claude to review {FileName}", input.FileName);
                throw new ApiProblemException(StatusCodes.Status502BadGateway, "The AI service can't be reached.", "Check the server's internet connection and try again.");
            }

            if (response.StopReason != "end_turn")
            {
                logger.LogWarning("Review of {FileName} stopped with {StopReason}", input.FileName, response.StopReason);
                throw new ApiProblemException(StatusCodes.Status502BadGateway, "The document couldn't be reviewed.",
                    response.StopReason == "refusal" ? "The AI declined to read this file." : "The answer was cut short; try a smaller file.");
            }

            var text = string.Concat(response.Content.Select(b => b.Value).OfType<TextBlock>().Select(t => t.Text));
            var answer = JsonSerializer.Deserialize<Answer>(text, Json)
                ?? throw new ApiProblemException(StatusCodes.Status502BadGateway, "The document couldn't be reviewed.", "The AI's answer was empty.");
            var keys = input.Fields.Select(f => f.Key).ToHashSet();

            return new DocumentReading(
                DocType: answer.docType,
                Confidence: Math.Clamp(answer.confidence, 0, 100),
                Found: answer.found
                    .Where(f => keys.Contains(f.key) && !string.IsNullOrWhiteSpace(f.value))
                    .GroupBy(f => f.key)
                    .ToDictionary(g => g.Key, g => new ReadValue(g.First().value.Trim(), g.First().source)),
                Extra: answer.extra
                    .Where(f => !string.IsNullOrWhiteSpace(f.label) && !string.IsNullOrWhiteSpace(f.value))
                    .GroupBy(f => f.label.Trim())
                    .ToDictionary(g => g.Key, g => new ReadValue(g.First().value.Trim(), g.First().source)),
                Signed: answer.signature switch { "signed" => true, "unsigned" => false, _ => null },
                ExpiresOn: string.IsNullOrWhiteSpace(answer.expiresOn) ? null : answer.expiresOn.Trim(),
                Summary: answer.summary,
                Usage: new DocumentReadUsage(config.Model, response.Usage.InputTokens, response.Usage.OutputTokens));
        }

        private AnthropicClient Client()
        {
            if (client is not null) return client;
            var apiKey = configuration["Anthropic:ApiKey"] ?? Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new ApiProblemException(StatusCodes.Status503ServiceUnavailable, "Document review isn't set up.",
                    "Add an Anthropic API key as Anthropic:ApiKey in src/LogisticApi/appsettings.Development.local.json (ignored by git).");
            return client = new AnthropicClient { ApiKey = apiKey };
        }

        private static ContentBlockParam FileBlock(DocumentReadInput input)
        {
            var data = Convert.ToBase64String(input.Content);
            return input.ContentType switch
            {
                "application/pdf" => new DocumentBlockParam { Source = new Base64PdfSource { Data = data } },
                "image/jpeg" => new ImageBlockParam { Source = new Base64ImageSource { Data = data, MediaType = MediaType.ImageJpeg } },
                "image/png" => new ImageBlockParam { Source = new Base64ImageSource { Data = data, MediaType = MediaType.ImagePng } },
                _ => throw ApiProblemException.BadRequest("Only PDF, JPG and PNG files can be reviewed."),
            };
        }

        private static string Prompt(DocumentReadInput input)
        {
            var text = new StringBuilder();
            text.AppendLine($"File name: {input.FileName}");
            text.AppendLine();
            text.AppendLine("Which of these document types is it (docType: title)?");
            foreach (var kind in input.Kinds) text.AppendLine($"- {kind.DocType}: {kind.Title}");
            text.AppendLine($"- {OtherType}: none of these");
            text.AppendLine();
            text.AppendLine("Find these shipment details on the document (key: label). Report each one the document states, under its key:");
            foreach (var field in input.Fields) text.AppendLine($"- {field.Key}: {field.Label}");
            text.AppendLine();
            text.AppendLine("Under extra, list other key values the document states that none of these labels cover, such as reference numbers, HS codes, totals or dates.");
            text.AppendLine("Under signature, say whether the document is signed or stamped: signed, unsigned, or unclear.");
            text.AppendLine("Under expiresOn, give any expiry or valid-until date printed on it, as written; leave it empty when there is none.");
            return text.ToString();
        }

        private static Dictionary<string, JsonElement> Schema(DocumentReadInput input)
        {
            var docTypes = input.Kinds.Select(k => k.DocType).Append(OtherType).Distinct().ToArray();
            var keys = input.Fields.Select(f => f.Key).ToArray();
            // An empty enum isn't a valid schema; with no fields to seek, found just stays empty
            object keySchema = keys.Length > 0 ? new { type = "string", @enum = keys } : new { type = "string" };
            object Value(object nameSchema, string name) => new
            {
                type = "object",
                properties = new Dictionary<string, object>
                {
                    [name] = nameSchema,
                    ["value"] = new { type = "string" },
                    ["source"] = new { type = "string" },
                },
                required = new[] { name, "value", "source" },
                additionalProperties = false,
            };

            return new Dictionary<string, JsonElement>
            {
                ["type"] = JsonSerializer.SerializeToElement("object"),
                ["properties"] = JsonSerializer.SerializeToElement(new Dictionary<string, object>
                {
                    ["docType"] = new { type = "string", @enum = docTypes },
                    ["confidence"] = new { type = "integer" },
                    ["summary"] = new { type = "string" },
                    ["found"] = new { type = "array", items = Value(keySchema, "key") },
                    ["extra"] = new { type = "array", items = Value(new { type = "string" }, "label") },
                    ["signature"] = new { type = "string", @enum = new[] { "signed", "unsigned", "unclear" } },
                    ["expiresOn"] = new { type = "string" },
                }),
                ["required"] = JsonSerializer.SerializeToElement(new[] { "docType", "confidence", "summary", "found", "extra", "signature", "expiresOn" }),
                ["additionalProperties"] = JsonSerializer.SerializeToElement(false),
            };
        }

        private static Effort EffortOf(string effort) => effort.ToLowerInvariant() switch
        {
            "low" => Effort.Low,
            "high" => Effort.High,
            _ => Effort.Medium,
        };

        private sealed record FoundValue(string key, string value, string source);

        private sealed record ExtraValue(string label, string value, string source);

        private sealed record Answer(
            string docType,
            int confidence,
            string summary,
            List<FoundValue> found,
            List<ExtraValue> extra,
            string signature,
            string expiresOn);
    }
}
