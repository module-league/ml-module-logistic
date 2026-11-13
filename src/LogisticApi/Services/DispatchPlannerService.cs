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
    /// Proposes a day's dispatches with Claude: the shipments not yet dispatched with their route and weight, the receivers' opening
    /// times, and the drivers and vehicles that can work that day with the times they're already busy go in; a driver, vehicle,
    /// pickup and delivery for each shipment come back. Drivers and vehicles not marked available or with an expired licence, road
    /// tax or insurance are never offered. Every line is checked here: busy drivers and vehicles, overloaded trips and times in the
    /// past block it; early arrivals and long days warn. Nothing is saved; a person approves lines and each becomes a dispatch.
    /// </summary>
    public partial class DispatchPlannerService(
        ContextDb db,
        RecordTextService texts,
        ClaudeClient claude,
        IOptions<DispatchOptions> dispatchOptions,
        IOptions<DispatchPlannerOptions> plannerOptions)
    {
        private const string Failure = "The dispatches couldn't be planned.";
        private const int MaxLine = 400;
        private const int MaxRisks = 4;

        // Kept word for word between calls: the shared start of every request
        private const string Instructions = """
            You plan one day of dispatches for a logistics company. You get the shipments waiting to go, each with where it is
            picked up and delivered, its weight and the receiver's opening time; and the drivers and vehicles that can work that
            day, with the times they are already on other dispatches. Each has a ref like S1, D2, V3.

            For each shipment pick a driver, a vehicle, a pickup time and a delivery time:
            - Use only the drivers and vehicles listed; never invent one. In the shipment, driver and vehicle fields of lines and
              unplanned, write the ref alone (S1, D2, V3).
            - One trip at a time: keep each driver and vehicle clear of their busy times and of their other trips in your plan. A
              driver can do several trips in a day one after another; allow time to drive back.
            - Pick a vehicle whose capacity fits the weight, the smallest that does. Shipments going the same way at the same time
              can share one vehicle: give them the same trip label, driver, vehicle and pickup time, within its capacity.
            - Estimate the drive from the addresses (road distance and traffic) plus about 30 minutes to load. Time the pickup so the
              delivery is no earlier than the receiver's opening time, and keep within the working day. When planning today, no
              pickup before now.
            - When a shipment can't be planned (nothing big enough, nobody free), leave it out and put it under unplanned with why.
            Write times as yyyy-MM-dd HH:mm in local time.

            Also return, naming shipments, drivers and vehicles by name and never by ref:
            - why, per line: one short sentence a dispatcher can check, e.g. "3 t lorry fits 1.2 t; Aiman is free all morning".
            - risks: up to three things likely to go wrong, e.g. a tight arrival or a weight not recorded; empty when none.
            - summary: one or two sentences: how many shipments on how many vehicles, the first pickup and the last delivery.
            """;

        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
        private readonly DispatchOptions sources = dispatchOptions.Value;
        private readonly DispatchPlannerOptions config = plannerOptions.Value;

        public async Task<DispatchPlannerResponse> PlanAsync(DispatchPlannerRequest request, CancellationToken ct)
        {
            var zone = texts.Zone;
            var localNow = texts.LocalNow;
            var today = DateOnly.FromDateTime(localNow);
            var day = today;
            if (!string.IsNullOrWhiteSpace(request.date)
                && !DateOnly.TryParseExact(request.date.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out day))
                throw ApiProblemException.BadRequest("Invalid date.", "Send the day as yyyy-MM-dd.");
            if (day < today)
                throw ApiProblemException.BadRequest("That day has passed.", "Plan today or a later day.");

            var setting = await db.DispatchSettings.AsNoTracking().FirstOrDefaultAsync(s => s.shipmentSidebarId == sources.ShipmentSidebarId, ct);
            if (setting?.originFieldId is null || setting.destinationFieldId is null)
                throw ApiProblemException.BadRequest("The route fields aren't picked.", "Pick the origin and destination fields under Customize card on the Dispatch board.");
            var openingFieldId = await db.ExceptionSettings.AsNoTracking()
                .Where(s => s.shipmentSidebarId == sources.ShipmentSidebarId)
                .Select(s => s.openingHourFieldId)
                .FirstOrDefaultAsync(ct);

            var response = new DispatchPlannerResponse { date = day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) };
            var dispatches = await db.Dispatches.AsNoTracking().ToListAsync(ct);
            var shipments = await ShipmentsAsync(setting, dispatches, response, ct);
            if (shipments.Count == 0)
            {
                response.summary = response.unplanned.Count == 0 ? "Every shipment is dispatched already." : "No shipment can be planned yet.";
                return response;
            }

            var open = dispatches.Where(d => !Dispatch.ClosedStatuses.Contains(d.status)).ToList();
            var drivers = await ResourcesAsync("driver", sources.DriverSidebarId, "D", day, open, response, ct);
            var vehicles = await ResourcesAsync("vehicle", sources.VehicleSidebarId, "V", day, open, response, ct);
            if (drivers.Count == 0 || vehicles.Count == 0)
            {
                var what = drivers.Count == 0 ? "driver" : "vehicle";
                response.unplanned.AddRange(shipments.Values.Select(s => Skip(s, $"No {what} can be planned that day.")));
                response.summary = $"Nothing planned: no {what} is available.";
                return response;
            }

            var places = await PlacesAsync(shipments.Values, openingFieldId, ct);
            var call = new MessageCreateParams
            {
                Model = config.Model,
                MaxTokens = config.MaxTokens,
                System = Instructions,
                OutputConfig = new OutputConfig { Effort = ClaudeClient.EffortOf(config.Effort), Format = new JsonOutputFormat { Schema = Schema() } },
                Messages = [new UserMessageParam { Content = Prompt(day, localNow, shipments, places, drivers, vehicles) }],
            };
            var (answerText, inputTokens, outputTokens) = await claude.SendAsync(call, Failure, ct);
            var answer = JsonSerializer.Deserialize<Answer>(answerText, Json)
                ?? throw new ApiProblemException(StatusCodes.Status502BadGateway, Failure, "The AI's answer was empty.");

            response.summary = answer.summary.Trim();
            response.risks = answer.risks.Select(Clean).OfType<string>().Take(MaxRisks).ToList();
            response.usage = new AiUsageResponse { model = config.Model, inputTokens = inputTokens, outputTokens = outputTokens };
            var lines = Lines(answer, day, shipments, places, drivers, vehicles, response);
            CheckTrips(lines, vehicles);
            response.lines = lines;

            // A shipment the AI skipped without saying why still shows, so nothing silently drops off the plan
            var reasons = answer.unplanned
                .Select(u => (key: FindShipment(shipments, u.shipment)?.Key ?? "", why: Clean(u.why)))
                .Where(u => u.why is not null)
                .GroupBy(u => u.key)
                .ToDictionary(g => g.Key, g => g.First().why!);
            foreach (var shipment in shipments.Values.Where(s => lines.All(l => l.shipmentId != s.Id) && response.unplanned.All(u => u.shipmentId != s.Id)))
                response.unplanned.Add(Skip(shipment, reasons.GetValueOrDefault(shipment.Key) ?? "The AI didn't plan it."));
            return response;
        }

        /// <summary>The shipments with no dispatch other than cancelled ones, oldest first, by ref; those without a route go to unplanned.</summary>
        private async Task<Dictionary<string, Shipment>> ShipmentsAsync(DispatchSetting setting, List<Dispatch> dispatches, DispatchPlannerResponse response, CancellationToken ct)
        {
            var dispatched = dispatches.Where(d => d.status != Dispatch.Cancelled).Select(d => d.shipmentId).ToHashSet();
            var rows = (await RecordRow.LoadAsync(db, sources.ShipmentSidebarId, ct))
                .Where(r => !dispatched.Contains(r.Id))
                .OrderBy(r => r.CreateTime)
                .Take(config.MaxShipments)
                .ToList();
            var titles = await texts.TitlesAsync(sources.ShipmentSidebarId, ct, rows.Select(r => r.Id).ToList(), setting.titleFieldId);

            var result = new Dictionary<string, Shipment>();
            foreach (var row in rows)
            {
                var title = titles.GetValueOrDefault(row.Id) is { Length: > 0 } t ? t : "Untitled shipment";
                var (originId, destinationId) = (row.Link(setting.originFieldId), row.Link(setting.destinationFieldId));
                if (originId is null || destinationId is null || originId == destinationId)
                {
                    response.unplanned.Add(new DispatchPlanSkip
                    {
                        shipmentId = row.Id,
                        shipment = title,
                        why = originId == destinationId && originId is not null ? "Its origin and destination are the same place." : "It has no origin or destination yet.",
                    });
                    continue;
                }
                var weight = decimal.TryParse(row.Value(setting.weightFieldId), NumberStyles.Number, CultureInfo.InvariantCulture, out var kg) ? kg : (decimal?)null;
                var (_, fields) = await texts.FieldTextsAsync(sources.ShipmentSidebarId, row, ct, setting.titleFieldId);
                var details = fields
                    .Where(f => f.field.ObjId != setting.originFieldId && f.field.ObjId != setting.destinationFieldId && f.field.ObjId != setting.weightFieldId && f.text != title)
                    .Select(f => $"{f.field.sidebarName}: {f.text}");
                var key = $"S{result.Count + 1}";
                result[key] = new Shipment(key, row.Id, title, originId.Value, destinationId.Value, weight, Cut(string.Join(" | ", details)));
            }
            return result;
        }

        /// <summary>The drivers or vehicles that can work that day, by ref, with their busy times; the rest go to leftOut with why.</summary>
        private async Task<List<Resource>> ResourcesAsync(
            string kind, string sidebarId, string prefix, DateOnly day, List<Dispatch> open, DispatchPlannerResponse response, CancellationToken ct)
        {
            var fields = await db.SidebarFields.AsNoTracking().Where(f => f.sidebarId == sidebarId && !f.isSystemField).ToListAsync(ct);
            var available = fields.FirstOrDefault(f => f.type == "checkbox" && f.sidebarName.Trim().Equals(config.AvailableFieldName, StringComparison.OrdinalIgnoreCase));
            var capacityField = kind == "vehicle"
                ? fields.FirstOrDefault(f => f.type == "number" && f.sidebarName.Trim().Equals(config.CapacityFieldName, StringComparison.OrdinalIgnoreCase))
                : null;
            var expiries = fields.Where(f => f.type == "date" && f.sidebarName.Contains(config.ExpiryWord, StringComparison.OrdinalIgnoreCase)).ToList();

            List<Resource> result = [];
            foreach (var row in await RecordRow.LoadAsync(db, sidebarId, ct))
            {
                var (title, values) = await texts.FieldTextsAsync(sidebarId, row, ct);
                var name = string.IsNullOrWhiteSpace(title) ? $"Unnamed {kind}" : title.Trim();
                string? why = available is not null && row.Value(available.ObjId) != "true" ? $"Not marked {available.sidebarName}." : null;
                foreach (var expiry in expiries)
                {
                    var raw = row.Value(expiry.ObjId);
                    if (why is null && raw is { Length: >= 10 } && DateOnly.TryParseExact(raw[..10], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var until) && until < day)
                        why = $"{expiry.sidebarName} was {until.ToString("dd MMM yyyy", CultureInfo.InvariantCulture)}.";
                }
                if (why is not null)
                {
                    response.leftOut.Add(new DispatchPlanLeftOut { kind = kind, name = name, why = why });
                    continue;
                }

                var capacity = decimal.TryParse(row.Value(capacityField?.ObjId), NumberStyles.Number, CultureInfo.InvariantCulture, out var kg) ? kg : (decimal?)null;
                var busy = open
                    .Where(d => (kind == "driver" ? d.driverId : d.vehicleId) == row.Id)
                    .Select(d => new Window(d.plannedPickupAt, d.plannedDeliveryAt ?? d.plannedPickupAt.AddHours(config.TripHours)))
                    .ToList();
                var details = values.Where(v => v.text != name).Select(v => $"{v.field.sidebarName}: {v.text}");
                result.Add(new Resource($"{prefix}{result.Count + 1}", row.Id, name, Cut(string.Join(" | ", details)), capacity, busy));
            }
            return result;
        }

        /// <summary>Each origin and destination with its name, address and opening time.</summary>
        private async Task<Dictionary<Guid, Place>> PlacesAsync(IEnumerable<Shipment> shipments, Guid? openingFieldId, CancellationToken ct)
        {
            var ids = shipments.SelectMany(s => new[] { s.OriginId, s.DestinationId }).Distinct().ToList();
            var result = new Dictionary<Guid, Place>();
            foreach (var row in await RecordRow.LoadAsync(db, sources.LocationSidebarId, ct, ids))
            {
                var (title, values) = await texts.FieldTextsAsync(sources.LocationSidebarId, row, ct);
                var name = string.IsNullOrWhiteSpace(title) ? "Unnamed place" : title.Trim();
                TimeOnly? opens = TimeOnly.TryParseExact(row.Value(openingFieldId), ["HH:mm", "HH:mm:ss"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var time) ? time : null;
                var details = values.Where(v => v.text != name && v.field.ObjId != openingFieldId).Select(v => v.text);
                result[row.Id] = new Place(name, Cut(string.Join(", ", details)), opens);
            }
            return result;
        }

        private string Prompt(
            DateOnly day, DateTime localNow, Dictionary<string, Shipment> shipments, Dictionary<Guid, Place> places, List<Resource> drivers, List<Resource> vehicles)
        {
            var prompt = new StringBuilder();
            prompt.AppendLine($"Now: {localNow.ToString("dddd dd MMM yyyy HH:mm", CultureInfo.InvariantCulture)} ({texts.ZoneName}).");
            prompt.AppendLine($"Plan for: {day.ToString("dddd dd MMM yyyy", CultureInfo.InvariantCulture)}. Working day {config.DayStart}–{config.DayEnd}.");

            string PlaceText(Guid id) => places.TryGetValue(id, out var place)
                ? $"{place.Name}{(place.Details == "" ? "" : $" ({place.Details})")}{(place.Opens is { } opens ? $", opens {opens:HH\\:mm}" : ", opening time not recorded")}"
                : "a place not on file";
            prompt.AppendLine();
            prompt.AppendLine("## Shipments to plan");
            foreach (var shipment in shipments.Values)
            {
                prompt.AppendLine($"{shipment.Key}: {shipment.Title}");
                prompt.AppendLine($"  from {PlaceText(shipment.OriginId)}");
                prompt.AppendLine($"  to {PlaceText(shipment.DestinationId)}");
                prompt.AppendLine($"  weight {(shipment.Weight is { } kg ? $"{kg:0.##} kg" : "not recorded")}{(shipment.Details == "" ? "" : $" | {shipment.Details}")}");
            }

            void Resources(string heading, List<Resource> items)
            {
                prompt.AppendLine();
                prompt.AppendLine($"## {heading}");
                foreach (var item in items)
                {
                    var capacity = heading == "Vehicles" ? $" | capacity {(item.Capacity is { } kg ? $"{kg:0.##} kg" : "not recorded")}" : "";
                    var busy = item.Busy.Where(w => Touches(w, day)).Select(w => $"{Local(w.Start):dd MMM HH:mm}–{Local(w.End):dd MMM HH:mm}").ToList();
                    prompt.AppendLine($"{item.Key}: {item.Name}{(item.Details == "" ? "" : $" | {item.Details}")}{capacity} | {(busy.Count == 0 ? "free all day" : $"busy {string.Join(", ", busy)}")}");
                }
            }
            Resources("Drivers", drivers);
            Resources("Vehicles", vehicles);
            return prompt.ToString();
        }

        /// <summary>The AI's lines as dispatch lines, each checked against the busy times, the clock and the receiver's hours.</summary>
        private List<DispatchPlanLine> Lines(
            Answer answer, DateOnly day, Dictionary<string, Shipment> shipments, Dictionary<Guid, Place> places,
            List<Resource> drivers, List<Resource> vehicles, DispatchPlannerResponse response)
        {
            var dayStart = TimeOnly.TryParse(config.DayStart, CultureInfo.InvariantCulture, out var start) ? start : new TimeOnly(7, 0);
            var dayEnd = TimeOnly.TryParse(config.DayEnd, CultureInfo.InvariantCulture, out var end) ? end : new TimeOnly(19, 0);
            List<DispatchPlanLine> lines = [];
            foreach (var item in answer.lines)
            {
                var shipment = FindShipment(shipments, item.shipment);
                if (shipment is null || lines.Any(l => l.shipmentId == shipment.Id)) continue;
                var driver = Find(drivers, item.driver, "D");
                var vehicle = Find(vehicles, item.vehicle, "V");
                if (driver is null || vehicle is null)
                {
                    response.unplanned.Add(Skip(shipment, "The AI picked a driver or vehicle that can't be planned."));
                    continue;
                }
                if (!TryLocal(item.pickup, out var pickup) || !TryLocal(item.delivery, out var delivery))
                {
                    response.unplanned.Add(Skip(shipment, "The AI gave no usable times."));
                    continue;
                }

                var line = new DispatchPlanLine
                {
                    shipmentId = shipment.Id,
                    shipment = shipment.Title,
                    driverId = driver.Id,
                    driver = driver.Name,
                    vehicleId = vehicle.Id,
                    vehicle = vehicle.Name,
                    originId = shipment.OriginId,
                    origin = places.GetValueOrDefault(shipment.OriginId)?.Name ?? "Unknown place",
                    destinationId = shipment.DestinationId,
                    destination = places.GetValueOrDefault(shipment.DestinationId)?.Name ?? "Unknown place",
                    plannedPickupAt = TimeZoneInfo.ConvertTimeToUtc(pickup, texts.Zone),
                    plannedDeliveryAt = TimeZoneInfo.ConvertTimeToUtc(delivery, texts.Zone),
                    trip = Clean(item.trip) ?? $"Trip {shipment.Key}",
                    weight = shipment.Weight,
                    capacity = vehicle.Capacity,
                    why = Clean(item.why) ?? "",
                };
                var window = new Window(line.plannedPickupAt, line.plannedDeliveryAt);
                if (line.plannedPickupAt < DateTime.UtcNow) line.problems.Add("The pickup time has passed.");
                if (delivery <= pickup) line.problems.Add("Delivery isn't after pickup.");
                if (driver.Busy.FirstOrDefault(w => Overlaps(w, window)) is { } driverBusy)
                    line.problems.Add($"{driver.Name} is on another dispatch {Local(driverBusy.Start):HH\\:mm}–{Local(driverBusy.End):HH\\:mm}.");
                if (vehicle.Busy.FirstOrDefault(w => Overlaps(w, window)) is { } vehicleBusy)
                    line.problems.Add($"{vehicle.Name} is on another dispatch {Local(vehicleBusy.Start):HH\\:mm}–{Local(vehicleBusy.End):HH\\:mm}.");

                if (DateOnly.FromDateTime(pickup) != day) line.warnings.Add($"The pickup is on {pickup:dd MMM}, not the day planned.");
                if (places.GetValueOrDefault(shipment.DestinationId)?.Opens is { } opens && TimeOnly.FromDateTime(delivery) < opens)
                    line.warnings.Add($"Arrives {delivery:HH\\:mm}, before {line.destination} opens at {opens:HH\\:mm}.");
                if (TimeOnly.FromDateTime(pickup) < dayStart || TimeOnly.FromDateTime(delivery) > dayEnd || DateOnly.FromDateTime(delivery) > DateOnly.FromDateTime(pickup))
                    line.warnings.Add($"Runs outside the working day ({config.DayStart}–{config.DayEnd}).");
                if (shipment.Weight is null) line.warnings.Add("Its weight isn't recorded; check it fits.");
                if (vehicle.Capacity is null) line.warnings.Add($"{vehicle.Name}'s capacity isn't recorded.");
                lines.Add(line);
            }
            return lines;
        }

        /// <summary>Lines sharing a trip must share the driver and vehicle and fit it; lines on different trips can't overlap on either.</summary>
        private static void CheckTrips(List<DispatchPlanLine> lines, List<Resource> vehicles)
        {
            foreach (var trip in lines.GroupBy(l => l.trip))
            {
                var first = trip.First();
                if (trip.Any(l => l.driverId != first.driverId || l.vehicleId != first.vehicleId))
                    foreach (var line in trip) line.problems.Add($"Shares {trip.Key} with another shipment but not its driver and vehicle.");
                var load = trip.Sum(l => l.weight ?? 0);
                if (vehicles.FirstOrDefault(v => v.Id == first.vehicleId)?.Capacity is { } capacity && load > capacity)
                    foreach (var line in trip) line.problems.Add($"{first.vehicle} carries {capacity:0.##} kg; {trip.Key} loads {load:0.##} kg.");
            }

            for (var i = 0; i < lines.Count; i++)
                for (var j = i + 1; j < lines.Count; j++)
                {
                    var (a, b) = (lines[i], lines[j]);
                    if (a.trip == b.trip || !Overlaps(new Window(a.plannedPickupAt, a.plannedDeliveryAt), new Window(b.plannedPickupAt, b.plannedDeliveryAt))) continue;
                    if (a.driverId == b.driverId)
                    {
                        a.problems.Add($"{a.driver} is also taking {b.shipment} then.");
                        b.problems.Add($"{b.driver} is also taking {a.shipment} then.");
                    }
                    if (a.vehicleId == b.vehicleId)
                    {
                        a.problems.Add($"{a.vehicle} is also carrying {b.shipment} then.");
                        b.problems.Add($"{b.vehicle} is also carrying {a.shipment} then.");
                    }
                }
        }

        private DateTime Local(DateTime utc) => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), texts.Zone);

        private bool Touches(Window window, DateOnly day) =>
            DateOnly.FromDateTime(Local(window.Start)) <= day && DateOnly.FromDateTime(Local(window.End)) >= day;

        private static bool Overlaps(Window a, Window b) => a.Start < b.End && b.Start < a.End;

        private static bool TryLocal(string text, out DateTime local) =>
            DateTime.TryParseExact(text.Trim(), "yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out local);

        private static DispatchPlanSkip Skip(Shipment shipment, string why) => new() { shipmentId = shipment.Id, shipment = shipment.Title, why = why };

        /// <summary>The ref with this prefix in the model's text, e.g. S3 from "S3" or "S3 SHP-1044"; empty when there's none.</summary>
        private static string Ref(string text, string prefix)
        {
            var match = RefText().Match(text);
            return match.Success && match.Value.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) ? match.Value.ToUpperInvariant() : "";
        }

        /// <summary>The shipment by its ref, or by its exact title when the model wrote that instead.</summary>
        private static Shipment? FindShipment(Dictionary<string, Shipment> shipments, string text)
        {
            if (shipments.GetValueOrDefault(Ref(text, "S")) is { } byRef) return byRef;
            var byTitle = shipments.Values.Where(s => s.Title.Equals(text.Trim(), StringComparison.OrdinalIgnoreCase)).Take(2).ToList();
            return byTitle.Count == 1 ? byTitle[0] : null;
        }

        /// <summary>The driver or vehicle by its ref, or by its exact name when the model wrote that instead.</summary>
        private static Resource? Find(List<Resource> items, string text, string prefix)
        {
            var key = Ref(text, prefix);
            if (items.FirstOrDefault(r => r.Key == key) is { } byRef) return byRef;
            var byName = items.Where(r => r.Name.Equals(text.Trim(), StringComparison.OrdinalIgnoreCase)).Take(2).ToList();
            return byName.Count == 1 ? byName[0] : null;
        }

        private static string? Clean(string? text) =>
            string.IsNullOrWhiteSpace(text) ? null : text.Trim().ReplaceLineEndings(" ");

        private static string Cut(string text) => text.Length > MaxLine ? text[..MaxLine] : text;

        [GeneratedRegex(@"\b[SDV]\d+\b", RegexOptions.IgnoreCase)]
        private static partial Regex RefText();

        private static Dictionary<string, JsonElement> Schema() => new()
        {
            ["type"] = JsonSerializer.SerializeToElement("object"),
            ["properties"] = JsonSerializer.SerializeToElement(new Dictionary<string, object>
            {
                ["summary"] = new { type = "string" },
                ["lines"] = new
                {
                    type = "array",
                    items = new
                    {
                        type = "object",
                        properties = new Dictionary<string, object>
                        {
                            ["shipment"] = new { type = "string" },
                            ["driver"] = new { type = "string" },
                            ["vehicle"] = new { type = "string" },
                            ["pickup"] = new { type = "string" },
                            ["delivery"] = new { type = "string" },
                            ["trip"] = new { type = "string" },
                            ["why"] = new { type = "string" },
                        },
                        required = new[] { "shipment", "driver", "vehicle", "pickup", "delivery", "trip", "why" },
                        additionalProperties = false,
                    },
                },
                ["unplanned"] = new
                {
                    type = "array",
                    items = new
                    {
                        type = "object",
                        properties = new Dictionary<string, object>
                        {
                            ["shipment"] = new { type = "string" },
                            ["why"] = new { type = "string" },
                        },
                        required = new[] { "shipment", "why" },
                        additionalProperties = false,
                    },
                },
                ["risks"] = new { type = "array", items = new { type = "string" } },
            }),
            ["required"] = JsonSerializer.SerializeToElement(new[] { "summary", "lines", "unplanned", "risks" }),
            ["additionalProperties"] = JsonSerializer.SerializeToElement(false),
        };

        private sealed record Shipment(string Key, Guid Id, string Title, Guid OriginId, Guid DestinationId, decimal? Weight, string Details);

        private sealed record Resource(string Key, Guid Id, string Name, string Details, decimal? Capacity, List<Window> Busy);

        private sealed record Place(string Name, string Details, TimeOnly? Opens);

        private sealed record Window(DateTime Start, DateTime End);

        private sealed record AnswerLine(string shipment, string driver, string vehicle, string pickup, string delivery, string trip, string why);

        private sealed record AnswerSkip(string shipment, string why);

        private sealed record Answer(string summary, List<AnswerLine> lines, List<AnswerSkip> unplanned, List<string> risks);
    }
}
