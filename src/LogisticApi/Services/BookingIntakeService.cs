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
    /// Reads a booking with Claude: the pasted email, the purchase orders or booking forms (the files themselves), the shipment's
    /// fields with their options, and the parties and locations on file go in; the values it can source, the names that aren't on
    /// file and a reply asking for the rest come back. The model only picks options and records from the lists it is given, by
    /// label and ref; this service turns those into stored values and drops anything that doesn't fit. Nothing is saved: a person
    /// reviews the values in the New record form and creates the shipment.
    /// </summary>
    public partial class BookingIntakeService(
        ContextDb db,
        AttachmentService attachments,
        RecordTextService texts,
        ClaudeClient claude,
        IOptions<BillingOptions> billingOptions,
        IOptions<DispatchOptions> dispatchOptions,
        IOptions<BookingIntakeOptions> intakeOptions)
    {
        private const string Failure = "The booking couldn't be read.";
        private const int MaxText = 1000;
        private const int MaxCandidateLine = 300;
        private const int MaxChecks = 6;
        private static readonly string[] Fillable =
            ["text", "long_text", "number", "currency", "checkbox", "date", "time", "single_select", "multi_select", "link_table"];

        // Kept word for word between calls: the shared start of every request
        private const string Instructions = """
            You read booking requests sent to a logistics company, by email and as attached purchase orders or booking forms, and
            fill in a new shipment from them. You get the email, the files, the shipment's fields, and the records on file that its
            link fields can point to (parties, locations), each with a ref like R12.

            Fill a field only when the email or a file states its value; never guess, and leave out what isn't given. Each value names
            its field by key alone (F3) and its source: "email", "PO page 1", "booking form". Write values the way each field asks:
            - text: as written, short. number: digits only, no units or thousands separators, in the unit the field's name gives
              (convert tonnes to kg when the field is in kg).
            - date: yyyy-MM-dd; date and time: yyyy-MM-dd HH:mm in local time. Work out relative dates ("next Tuesday") from today.
            - time: HH:mm, 24-hour. checkbox: true, only when the booking clearly asks for it.
            - pick one / pick any: the option labels exactly as listed; leave the field out when none fits.
            - link: the ref of the record on file that the booking means, matched by name, address, email or phone. Pick a record
              only when you are sure it is the same company or place; a similar name in another city is not a match. When the
              booking names a party or place with no match, leave the field out and add it to notOnFile with the field key and
              the name and address as given, so a person can add it. Never invent a ref.
            When several shipments are booked at once, fill the first and say so in checks.

            Also return:
            - summary: one or two sentences on what is booked: what, from where to where, when.
            - checks: up to four short things a person should confirm, e.g. an unclear date or two weights that disagree; empty
              when nothing is doubtful.
            - reply: an email reply to the sender, in the language of their email, thanking them and asking for what the booking
              doesn't give but a shipment needs (e.g. pickup date and time, addresses, weight, number of pieces, contact person), and
              to confirm the details of any party not on file. When nothing is missing, confirm the booking is received and being
              arranged. Don't promise prices or times. Sign off as the company's booking team, never with a placeholder.
            """;

        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
        private readonly BillingOptions billing = billingOptions.Value;
        private readonly DispatchOptions sources = dispatchOptions.Value;
        private readonly BookingIntakeOptions config = intakeOptions.Value;

        public async Task<BookingIntakeResponse> ReadAsync(BookingIntakeRequest request, CancellationToken ct)
        {
            var email = request.emailText?.Trim() ?? "";
            var fileIds = request.attachmentIds.Distinct().ToList();
            if (email == "" && fileIds.Count == 0)
                throw ApiProblemException.BadRequest("Nothing to read.", "Paste the booking email or attach its purchase order.");
            if (email.Length > config.MaxEmailChars)
                throw ApiProblemException.BadRequest("The email is too long.", $"Paste up to {config.MaxEmailChars:N0} characters; leave out long signatures and earlier replies.");
            if (fileIds.Count > config.MaxFiles)
                throw ApiProblemException.BadRequest("Too many files.", $"Attach up to {config.MaxFiles}.");

            var files = await ReadFilesAsync(fileIds, ct);
            var fields = await FieldsAsync(ct);
            if (fields.Count == 0)
                throw ApiProblemException.BadRequest("The shipment table has no fields to fill.", "Add fields to the shipment table first.");
            var keys = fields.Select((field, i) => (key: $"F{i + 1}", field)).ToDictionary(p => p.key, p => p.field);
            var candidates = await CandidatesAsync(fields, ct);

            var content = new List<ContentBlockParam>();
            foreach (var (attachment, bytes) in files)
            {
                content.Add(new TextBlockParam { Text = $"File: {attachment.fileName}" });
                content.Add(FileBlock(bytes, attachment.fileExtension));
            }
            content.Add(new TextBlockParam { Text = Prompt(email, files.Select(f => f.attachment.fileName).ToList(), keys, candidates) });

            var call = new MessageCreateParams
            {
                Model = config.Model,
                MaxTokens = config.MaxTokens,
                System = Instructions,
                OutputConfig = new OutputConfig { Effort = ClaudeClient.EffortOf(config.Effort), Format = new JsonOutputFormat { Schema = Schema() } },
                Messages = [new UserMessageParam { Content = content }],
            };
            var (answerText, inputTokens, outputTokens) = await claude.SendAsync(call, Failure, ct);
            var answer = JsonSerializer.Deserialize<Answer>(answerText, Json)
                ?? throw new ApiProblemException(StatusCodes.Status502BadGateway, Failure, "The AI's answer was empty.");

            var response = new BookingIntakeResponse
            {
                summary = answer.summary.Trim(),
                reply = new BookingIntakeReply { subject = answer.reply.subject.Trim(), message = answer.reply.message.Trim().ReplaceLineEndings("\n") },
                usage = new AiUsageResponse { model = config.Model, inputTokens = inputTokens, outputTokens = outputTokens },
            };
            List<string> problems = [];
            var filled = new Dictionary<Guid, BookingIntakeRow>();
            foreach (var item in answer.values)
            {
                if (!keys.TryGetValue(KeyOf(item.field), out var field) || filled.ContainsKey(field.ObjId)) continue;
                var parsed = Parse(field, item.values.Select(v => v?.Trim() ?? "").Where(v => v != "").ToList(), candidates, problems);
                if (parsed is not { } value) continue;
                response.values[field.ObjId] = value.stored;
                filled[field.ObjId] = new BookingIntakeRow { fieldId = field.ObjId, name = field.sidebarName, text = value.text, source = Clean(item.source) ?? "booking" };
            }
            response.rows = fields.Where(f => filled.ContainsKey(f.ObjId)).Select(f => filled[f.ObjId]).ToList();
            response.missing = fields.Where(f => !filled.ContainsKey(f.ObjId)).Select(f => f.sidebarName).ToList();
            response.notOnFile = answer.notOnFile
                .Where(n => !string.IsNullOrWhiteSpace(n.text))
                .Select(n => new BookingIntakeNotOnFile { field = (keys.GetValueOrDefault(KeyOf(n.field))?.sidebarName ?? n.field).Trim(), text = Clean(n.text)! })
                .ToList();
            response.checks = problems
                .Concat(answer.checks.Select(Clean).OfType<string>())
                .Distinct()
                .Take(MaxChecks)
                .ToList();
            return response;
        }

        /// <summary>The booking's files, each a PDF, JPG or PNG uploaded for the shipment table, within the size limit.</summary>
        private async Task<List<(Attachment attachment, byte[] bytes)>> ReadFilesAsync(List<Guid> ids, CancellationToken ct)
        {
            List<(Attachment, byte[])> files = [];
            long total = 0;
            foreach (var id in ids)
            {
                var (attachment, stream) = await attachments.OpenAsync(id, ct);
                await using (stream)
                {
                    if (attachment.refId != sources.ShipmentSidebarId)
                        throw ApiProblemException.BadRequest("That file wasn't uploaded for a shipment.", $"Upload {attachment.fileName} again from the booking dialog.");
                    if (!DocumentReviewService.ContentTypes.ContainsKey(attachment.fileExtension))
                        throw ApiProblemException.BadRequest("Only PDF, JPG and PNG files can be read.", $"{attachment.fileName} is a .{attachment.fileExtension} file; paste its text into the email box instead.");
                    total += stream.Length;
                    if (total > config.MaxFileBytes)
                        throw ApiProblemException.BadRequest("The files are too large.", $"Attach up to {config.MaxFileBytes / 1024 / 1024} MB in all.");
                    using var buffer = new MemoryStream();
                    await stream.CopyToAsync(buffer, ct);
                    files.Add((attachment, buffer.ToArray()));
                }
            }
            return files;
        }

        /// <summary>The shipment fields a booking can fill, in order: plain values, selects and links; not attachments, people or worked-out fields.</summary>
        private Task<List<SidebarField>> FieldsAsync(CancellationToken ct) =>
            db.SidebarFields
                .AsNoTracking()
                .Include(f => f.options)
                .Where(f => f.sidebarId == sources.ShipmentSidebarId && !f.isSystemField && f.isEditable && Fillable.Contains(f.type))
                .OrderBy(f => f.displayOrder)
                .ToListAsync(ct);

        /// <summary>The records each link field can point to, by ref (R1, R2…), with the table they belong to and a line describing them.</summary>
        private async Task<Dictionary<string, Candidate>> CandidatesAsync(List<SidebarField> fields, CancellationToken ct)
        {
            var result = new Dictionary<string, Candidate>();
            var tables = fields
                .Where(f => FieldTypes.IsLink(f.type))
                .Select(f => FieldSettings.Read(f.settings).lookupSidebarId)
                .OfType<string>()
                .Distinct();
            foreach (var sidebarId in tables)
            {
                var tableFields = await db.SidebarFields
                    .AsNoTracking()
                    .Include(f => f.options)
                    .Where(f => f.sidebarId == sidebarId && !f.isSystemField)
                    .OrderBy(f => f.displayOrder)
                    .ToListAsync(ct);
                var shown = tableFields.Where(f => FieldTypes.CanShowInLookup(f.type) && !FieldTypes.IsUser(f.type)).ToList();
                var titles = await texts.TitlesAsync(sidebarId, ct);
                var rows = (await RecordRow.LoadAsync(db, sidebarId, ct)).OrderByDescending(r => r.CreateTime).Take(config.MaxCandidates);
                foreach (var row in rows)
                {
                    var title = titles.GetValueOrDefault(row.Id)?.Trim() ?? "";
                    var details = shown
                        .Select(f => (f.sidebarName, text: Display(f, row.Value(f.ObjId))))
                        .Where(p => !string.IsNullOrWhiteSpace(p.text) && p.text != title)
                        .Select(p => $"{p.sidebarName}: {p.text}");
                    var line = string.Join(" | ", new[] { title == "" ? "(no name)" : title }.Concat(details));
                    var key = $"R{result.Count + 1}";
                    result[key] = new Candidate(sidebarId, row.Id, title == "" ? key : title, line.Length > MaxCandidateLine ? line[..MaxCandidateLine] : line);
                }
            }
            return result;
        }

        private string Prompt(string email, List<string> fileNames, Dictionary<string, SidebarField> keys, Dictionary<string, Candidate> candidates)
        {
            var now = texts.LocalNow;
            var prompt = new StringBuilder();
            prompt.AppendLine($"Today is {now.ToString("dddd dd MMM yyyy HH:mm", CultureInfo.InvariantCulture)} ({texts.ZoneName}).");
            prompt.AppendLine($"Company: {(billing.Issuer.Name != "" ? billing.Issuer.Name : "the logistics company")}");
            prompt.AppendLine();
            prompt.AppendLine("## Email");
            prompt.AppendLine(email == "" ? "None pasted; read the files." : email);
            if (fileNames.Count > 0)
            {
                prompt.AppendLine();
                prompt.AppendLine($"## Files: {string.Join(", ", fileNames)} (attached above)");
            }

            prompt.AppendLine();
            prompt.AppendLine("## Shipment fields");
            foreach (var (key, field) in keys)
            {
                var hint = string.IsNullOrWhiteSpace(field.sidebarDescription) ? "" : $" ({field.sidebarDescription.Trim()})";
                prompt.AppendLine($"{key} {field.sidebarName}{hint}: {Asks(field)}");
            }

            foreach (var table in candidates.GroupBy(c => c.Value.SidebarId))
            {
                var linkNames = keys.Values
                    .Where(f => FieldTypes.IsLink(f.type) && FieldSettings.Read(f.settings).lookupSidebarId == table.Key)
                    .Select(f => f.sidebarName);
                prompt.AppendLine();
                prompt.AppendLine($"## On file for {string.Join(", ", linkNames)}");
                foreach (var (key, candidate) in table)
                    prompt.AppendLine($"{key}: {candidate.Line}");
            }
            foreach (var field in keys.Values.Where(f => FieldTypes.IsLink(f.type) && !candidates.Values.Any(c => c.SidebarId == FieldSettings.Read(f.settings).lookupSidebarId)))
            {
                prompt.AppendLine();
                prompt.AppendLine($"## On file for {field.sidebarName}");
                prompt.AppendLine("Nothing yet; put what the booking names under notOnFile.");
            }
            return prompt.ToString();
        }

        /// <summary>How the model should write a field's value.</summary>
        private static string Asks(SidebarField field)
        {
            var settings = FieldSettings.Read(field.settings);
            string Labels() => string.Join("; ", field.options.OrderBy(o => o.displayOrder).Select(o => o.value));
            return field.type switch
            {
                "number" => "number",
                "currency" => $"amount in {settings.currencySymbol}",
                "checkbox" => "checkbox",
                "date" => settings.displayTime ? "date and time" : "date",
                "time" => "time",
                "single_select" => $"pick one: {Labels()}",
                "multi_select" => $"pick any: {Labels()}",
                "link_table" => settings.linkMultiple ? "link, any number of refs" : "link, one ref",
                "long_text" => "text, may be a few lines",
                _ => "text",
            };
        }

        /// <summary>The model's text for one field as a stored value and as people read it; null, with the reason in problems, when it doesn't fit.</summary>
        private (string stored, string text)? Parse(SidebarField field, List<string> values, Dictionary<string, Candidate> candidates, List<string> problems)
        {
            if (values.Count == 0) return null;
            var first = values[0];
            var settings = FieldSettings.Read(field.settings);
            void Skip(string why) => problems.Add($"{field.sidebarName}: left empty, the AI read “{Short(first)}” but {why}.");

            switch (field.type)
            {
                case "number":
                case "currency":
                    var digits = NumberText().Match(first.Replace(",", ""));
                    if (!digits.Success || !decimal.TryParse(digits.Value, NumberStyles.Number, CultureInfo.InvariantCulture, out var number))
                    {
                        Skip("it isn't a number");
                        return null;
                    }
                    var numberText = number.ToString(CultureInfo.InvariantCulture);
                    return (numberText, field.type == "currency" ? $"{settings.currencySymbol}{number:N2}" : numberText);

                case "checkbox":
                    return first.Equals("true", StringComparison.OrdinalIgnoreCase) || first.Equals("yes", StringComparison.OrdinalIgnoreCase)
                        ? ("true", "Yes")
                        : null;

                case "date" when settings.displayTime:
                    if (DateTime.TryParseExact(first, "yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var local))
                        return (TimeZoneInfo.ConvertTimeToUtc(local, texts.Zone).ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture),
                            local.ToString("dd MMM yyyy HH:mm", CultureInfo.InvariantCulture));
                    if (DateTime.TryParseExact(first, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dayOnly))
                    {
                        problems.Add($"{field.sidebarName}: the booking gives no time; set to 00:00, change it.");
                        return (TimeZoneInfo.ConvertTimeToUtc(dayOnly, texts.Zone).ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture),
                            $"{dayOnly.ToString("dd MMM yyyy", CultureInfo.InvariantCulture)}, no time given");
                    }
                    Skip("it isn't a date");
                    return null;

                case "date":
                    if (DateOnly.TryParseExact(first.Length > 10 ? first[..10] : first, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day))
                        return (day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), day.ToString("dd MMM yyyy", CultureInfo.InvariantCulture));
                    Skip("it isn't a date");
                    return null;

                case "time":
                    if (TimeOnly.TryParseExact(first, ["HH:mm", "H:mm", "HH:mm:ss"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var time))
                        return (time.ToString("HH:mm", CultureInfo.InvariantCulture), time.ToString("HH:mm", CultureInfo.InvariantCulture));
                    Skip("it isn't a time");
                    return null;

                case "single_select":
                case "multi_select":
                    var picked = new List<SidebarFieldOption>();
                    foreach (var label in values)
                    {
                        var option = field.options.FirstOrDefault(o => o.value.Trim().Equals(label, StringComparison.OrdinalIgnoreCase))
                            ?? field.options.FirstOrDefault(o => Letters(o.value) == Letters(label) && Letters(label) != "")
                            ?? OnlyStartingWith(field.options, label);
                        if (option is null) problems.Add($"{field.sidebarName}: “{Short(label)}” isn't one of its options; pick one.");
                        else if (!picked.Contains(option)) picked.Add(option);
                    }
                    if (picked.Count == 0) return null;
                    if (field.type == "single_select")
                        return (picked[0].ObjId.ToString(), picked[0].value);
                    return (JsonSerializer.Serialize(picked.Select(o => o.ObjId.ToString()), Json), string.Join(", ", picked.Select(o => o.value)));

                case "link_table":
                    var table = settings.lookupSidebarId;
                    var linked = values
                        .Select(r => candidates.GetValueOrDefault(r.ToUpperInvariant()))
                        .Where(c => c is not null && c.SidebarId == table)
                        .Select(c => c!)
                        .DistinctBy(c => c.Id)
                        .Take(settings.linkMultiple ? int.MaxValue : 1)
                        .ToList();
                    if (linked.Count == 0)
                    {
                        Skip("that isn't a record on file");
                        return null;
                    }
                    return (JsonSerializer.Serialize(linked.Select(c => c.Id.ToString()), Json), string.Join(", ", linked.Select(c => c.Title)));

                default:
                    var text = string.Join(field.type == "long_text" ? "\n" : ", ", values);
                    if (text.Length > MaxText) text = text[..MaxText];
                    return (text, text);
            }
        }

        /// <summary>A stored value as people read it, for the candidate lines.</summary>
        private static string? Display(SidebarField field, string? raw)
        {
            if (raw is null) return null;
            return field.type switch
            {
                "single_select" => Guid.TryParse(raw, out var id) ? field.options.FirstOrDefault(o => o.ObjId == id)?.value : null,
                "multi_select" => raw.StartsWith('[')
                    ? string.Join(", ", (JsonSerializer.Deserialize<List<string>>(raw, Json) ?? [])
                        .Select(v => Guid.TryParse(v, out var option) ? field.options.FirstOrDefault(o => o.ObjId == option)?.value : null)
                        .OfType<string>())
                    : null,
                _ => raw.ReplaceLineEndings(", "),
            };
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

        private static string? Clean(string? text) =>
            string.IsNullOrWhiteSpace(text) ? null : text.Trim().ReplaceLineEndings(" ");

        /// <summary>Letters and digits only, lowercased, so "EXW (Ex Works" matches "EXW (Ex Works)".</summary>
        private static string Letters(string text) => string.Concat(text.Where(char.IsLetterOrDigit)).ToLowerInvariant();

        /// <summary>The one option a short label starts, e.g. "DAP" for "DAP (Delivered at Place)"; null when none or several do.</summary>
        private static SidebarFieldOption? OnlyStartingWith(IEnumerable<SidebarFieldOption> options, string label)
        {
            var start = Letters(label);
            if (start.Length < 2) return null;
            var matches = options.Where(o => Letters(o.value).StartsWith(start, StringComparison.Ordinal)).Take(2).ToList();
            return matches.Count == 1 ? matches[0] : null;
        }

        private static string Short(string text) => text.Length > 60 ? text[..60] + "…" : text;

        /// <summary>The field key at the start, e.g. F3 from "F3" or "F3 Shipment Mode".</summary>
        private static string KeyOf(string text) => FieldKey().Match(text).Value.Trim().ToUpperInvariant();

        [GeneratedRegex(@"^\s*F\d+\b", RegexOptions.IgnoreCase)]
        private static partial Regex FieldKey();

        [GeneratedRegex(@"-?\d+(\.\d+)?")]
        private static partial Regex NumberText();

        private static Dictionary<string, JsonElement> Schema() => new()
        {
            ["type"] = JsonSerializer.SerializeToElement("object"),
            ["properties"] = JsonSerializer.SerializeToElement(new Dictionary<string, object>
            {
                ["summary"] = new { type = "string" },
                ["values"] = new
                {
                    type = "array",
                    items = new
                    {
                        type = "object",
                        properties = new Dictionary<string, object>
                        {
                            ["field"] = new { type = "string" },
                            ["values"] = new { type = "array", items = new { type = "string" } },
                            ["source"] = new { type = "string" },
                        },
                        required = new[] { "field", "values", "source" },
                        additionalProperties = false,
                    },
                },
                ["notOnFile"] = new
                {
                    type = "array",
                    items = new
                    {
                        type = "object",
                        properties = new Dictionary<string, object>
                        {
                            ["field"] = new { type = "string" },
                            ["text"] = new { type = "string" },
                        },
                        required = new[] { "field", "text" },
                        additionalProperties = false,
                    },
                },
                ["checks"] = new { type = "array", items = new { type = "string" } },
                ["reply"] = new
                {
                    type = "object",
                    properties = new Dictionary<string, object>
                    {
                        ["subject"] = new { type = "string" },
                        ["message"] = new { type = "string" },
                    },
                    required = new[] { "subject", "message" },
                    additionalProperties = false,
                },
            }),
            ["required"] = JsonSerializer.SerializeToElement(new[] { "summary", "values", "notOnFile", "checks", "reply" }),
            ["additionalProperties"] = JsonSerializer.SerializeToElement(false),
        };

        private sealed record Candidate(string SidebarId, Guid Id, string Title, string Line);

        private sealed record AnswerValue(string field, List<string> values, string source);

        private sealed record AnswerNotOnFile(string field, string text);

        private sealed record AnswerReply(string subject, string message);

        private sealed record Answer(string summary, List<AnswerValue> values, List<AnswerNotOnFile> notOnFile, List<string> checks, AnswerReply reply);
    }
}
