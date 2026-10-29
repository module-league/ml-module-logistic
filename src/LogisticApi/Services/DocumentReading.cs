namespace LogisticApi.Services
{
    /// <summary>
    /// Reads an uploaded shipping document: what kind it is and the values it states. A reader only reads; comparing the values
    /// with the shipment record is DocumentReviewService's job, so another model (e.g. one run locally) can be swapped in.
    /// </summary>
    public interface IDocumentReader
    {
        Task<DocumentReading> ReadAsync(DocumentReadInput input, CancellationToken ct);
    }

    /// <summary>A kind of document the reader can pick, e.g. ("packing_list", "Packing list").</summary>
    public sealed record DocumentKind(string DocType, string Title);

    /// <summary>A shipment field the reader looks for on the document, under a short key it answers with.</summary>
    public sealed record SoughtField(string Key, string Label);

    public sealed record DocumentReadInput(
        byte[] Content,
        string ContentType,
        string FileName,
        IReadOnlyList<DocumentKind> Kinds,
        IReadOnlyList<SoughtField> Fields);

    /// <summary>A value as printed on the document, and where: e.g. "Page 2 · totals row".</summary>
    public sealed record ReadValue(string Value, string Source);

    /// <summary>What a reader found on a document.</summary>
    /// <param name="DocType">One of the kinds' DocType, or "other".</param>
    /// <param name="Confidence">0–100, how sure the reader is of DocType.</param>
    /// <param name="Found">The sought fields the document states, by key; fields it doesn't state are left out.</param>
    /// <param name="Extra">Other key values on the document no sought field covers, e.g. an HS code, by label.</param>
    /// <param name="Signed">Whether it carries a signature or stamp; null when the reader can't tell.</param>
    /// <param name="ExpiresOn">An expiry date printed on it, as written.</param>
    /// <param name="Summary">One sentence on what the document is.</param>
    /// <param name="Usage">What the read cost.</param>
    public sealed record DocumentReading(
        string DocType,
        int Confidence,
        IReadOnlyDictionary<string, ReadValue> Found,
        IReadOnlyDictionary<string, ReadValue> Extra,
        bool? Signed,
        string? ExpiresOn,
        string Summary,
        DocumentReadUsage Usage);

    /// <summary>What the read cost, for measuring per-document cost.</summary>
    public sealed record DocumentReadUsage(string Model, long InputTokens, long OutputTokens);
}
