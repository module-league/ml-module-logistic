using System.Globalization;
using System.Text.RegularExpressions;
using LogisticApi.Context;
using LogisticApi.Models;
using LogisticApi.MVVM;
using Microsoft.Extensions.Options;

namespace LogisticApi.Services
{
    /// <summary>
    /// Reviews one of a shipment's files: a reader (the AI) says what kind of document it is and which values it states, then each
    /// value is compared here with the shipment record. Nothing is saved and nothing is verified; a person acts on the result.
    /// </summary>
    public partial class DocumentReviewService(
        ContextDb db,
        AttachmentService attachments,
        RecordTextService texts,
        DocumentChecklistService checklists,
        IDocumentReader reader,
        IOptions<DispatchOptions> dispatchOptions,
        IOptions<DocumentReviewOptions> reviewOptions)
    {
        public const string Match = "match";
        public const string Mismatch = "mismatch";
        public const string NotOnRecord = "not_on_record";

        public const string LooksRight = "looks_right";
        public const string Check = "check";
        public const string NeedsPerson = "needs_person";

        private const string ProofOfDelivery = "proof_of_delivery";

        // Shown as people or ticks on the record, never printed on shipping papers
        private static readonly string[] UnprintedTypes = ["checkbox", "member", "sys_creator_id", "sys_updater_id", "sys_create_time", "sys_update_time"];

        private static readonly Dictionary<string, string> ContentTypes = new()
        {
            ["pdf"] = "application/pdf",
            ["jpg"] = "image/jpeg",
            ["jpeg"] = "image/jpeg",
            ["png"] = "image/png",
        };

        private readonly DispatchOptions sources = dispatchOptions.Value;
        private readonly DocumentReviewOptions config = reviewOptions.Value;

        public async Task<DocumentReviewResponse> ReviewAsync(DocumentReviewRequest request, CancellationToken ct)
        {
            var shipmentId = request.shipmentId!.Value;
            var row = (await RecordRow.LoadAsync(db, sources.ShipmentSidebarId, ct, [shipmentId])).FirstOrDefault()
                ?? throw ApiProblemException.NotFound("Shipment not found.");
            var (attachment, content) = await ReadFileAsync(request.attachmentId!.Value, ct);

            var (_, fieldTexts) = await texts.FieldTextsAsync(sources.ShipmentSidebarId, row, ct);
            var sought = fieldTexts
                .Where(f => !UnprintedTypes.Contains(f.field.type))
                .Select((f, index) => (key: $"f{index + 1}", f.field, f.text))
                .ToList();
            var kinds = checklists.Config.Types.Select(t => new DocumentKind(t.DocType, t.Title)).ToList();

            var reading = await reader.ReadAsync(
                new DocumentReadInput(content, ContentTypes[attachment.fileExtension], attachment.fileName, kinds, sought.Select(s => new SoughtField(s.key, s.field.sidebarName)).ToList()),
                ct);

            var checks = sought
                .Where(s => reading.Found.ContainsKey(s.key))
                .Select(s =>
                {
                    var read = reading.Found[s.key];
                    return new DocumentReviewCheckResponse
                    {
                        field = s.field.sidebarName,
                        documentValue = read.Value,
                        recordValue = s.text,
                        status = Compare(s.field.type, read.Value, s.text) ? Match : Mismatch,
                        source = read.Source,
                    };
                })
                .Concat(reading.Extra.Select(extra => new DocumentReviewCheckResponse
                {
                    field = extra.Key,
                    documentValue = extra.Value.Value,
                    status = NotOnRecord,
                    source = extra.Value.Source,
                }))
                .ToList();

            var title = checklists.Config.Type(reading.DocType)?.Title ?? "document of another kind";
            var (verdict, verdictText) = Verdict(reading, title, checks);
            return new DocumentReviewResponse
            {
                shipmentId = shipmentId,
                attachmentId = attachment.ObjId,
                fileName = attachment.fileName,
                docType = reading.DocType,
                docTypeTitle = title,
                confidence = reading.Confidence,
                verdict = verdict,
                verdictText = verdictText,
                summary = reading.Summary,
                signed = reading.Signed,
                expiresOn = reading.ExpiresOn,
                checks = checks,
                usage = new DocumentReviewUsageResponse
                {
                    model = reading.Usage.Model,
                    inputTokens = reading.Usage.InputTokens,
                    outputTokens = reading.Usage.OutputTokens,
                },
            };
        }

        private async Task<(Attachment attachment, byte[] content)> ReadFileAsync(Guid attachmentId, CancellationToken ct)
        {
            var (attachment, stream) = await attachments.OpenAsync(attachmentId, ct);
            await using (stream)
            {
                if (!ContentTypes.ContainsKey(attachment.fileExtension))
                    throw ApiProblemException.BadRequest("Only PDF, JPG and PNG files can be reviewed.", $"{attachment.fileName} is a .{attachment.fileExtension} file.");
                using var buffer = new MemoryStream();
                await stream.CopyToAsync(buffer, ct);
                return (attachment, buffer.ToArray());
            }
        }

        private (string verdict, string text) Verdict(DocumentReading reading, string title, List<DocumentReviewCheckResponse> checks)
        {
            if (reading.Confidence < config.MinConfidence)
                return (NeedsPerson, $"Not sure what this is: only {reading.Confidence}% sure it's {WithArticle(title)}. A person should look at it.");

            var problems = checks.Where(c => c.status == Mismatch).Select(c => c.field).ToList();
            if (reading.DocType == ProofOfDelivery && reading.Signed == false) problems.Add("signature (it isn't signed)");
            if (problems.Count > 0)
                return (Check, $"Looks like {WithArticle(title)}, but {Plural(problems.Count, "value differs", "values differ")} from the shipment: {string.Join(", ", problems)}. Check before verifying.");

            var matched = checks.Count(c => c.status == Match);
            return matched == 0
                ? (Check, $"Looks like {WithArticle(title)}, but it shows none of the shipment's details, so it can't be matched to this shipment.")
                : (LooksRight, $"Looks like {WithArticle(title)} for this shipment: {Plural(matched, "value matches", "values match")} the record.");
        }

        /// <summary>Whether a value on the document agrees with the record's: numbers within the tolerance, dates on the same day, text alike.</summary>
        private bool Compare(string fieldType, string documentValue, string recordValue)
        {
            if (FieldTypes.IsNumeric(fieldType) && NumberIn(documentValue) is { } onDocument && NumberIn(recordValue) is { } onRecord)
                return onRecord == 0 ? onDocument == 0 : Math.Abs(onDocument - onRecord) / Math.Abs(onRecord) * 100 <= config.TolerancePercent;
            if (FieldTypes.IsDate(fieldType) && DateIn(documentValue) is { } documentDate && DateIn(recordValue) is { } recordDate)
                return documentDate == recordDate;

            var document = Normalize(documentValue);
            var record = Normalize(recordValue);
            // "Acme Precision Parts" on the record matches "Acme Precision Parts Sdn Bhd" on the paper
            return document == record || (Math.Min(document.Length, record.Length) >= 3 && (document.Contains(record) || record.Contains(document)));
        }

        /// <summary>The first number in a value such as "1,240 kg" or "MYR 2,100.50"; commas are thousands separators.</summary>
        private static decimal? NumberIn(string value) =>
            NumberPattern().Match(value) is { Success: true } match
            && decimal.TryParse(match.Value.Replace(",", ""), NumberStyles.Number, CultureInfo.InvariantCulture, out var number)
                ? number
                : null;

        private static DateOnly? DateIn(string value)
        {
            foreach (var culture in new[] { CultureInfo.GetCultureInfo("en-GB"), CultureInfo.InvariantCulture })
                if (DateTime.TryParse(value, culture, DateTimeStyles.AllowWhiteSpaces, out var at))
                    return DateOnly.FromDateTime(at);
            return null;
        }

        private static string Normalize(string value) => WhitespacePattern().Replace(PunctuationPattern().Replace(value.ToLowerInvariant(), " "), " ").Trim();

        private static string WithArticle(string title) => ("aeiou".Contains(char.ToLowerInvariant(title[0])) ? "an " : "a ") + title;

        private static string Plural(int count, string one, string many) => $"{count} {(count == 1 ? one : many)}";

        [GeneratedRegex(@"-?\d[\d,]*(\.\d+)?")]
        private static partial Regex NumberPattern();

        [GeneratedRegex(@"[^\p{L}\p{N}]+")]
        private static partial Regex PunctuationPattern();

        [GeneratedRegex(@"\s+")]
        private static partial Regex WhitespacePattern();
    }
}
