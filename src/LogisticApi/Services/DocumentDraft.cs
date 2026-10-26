using System.Globalization;
using System.Text;

namespace LogisticApi.Services
{
    /// <summary>
    /// Writes a plain A4 PDF of labelled values in Helvetica, enough for a draft someone checks before verifying. Text outside
    /// Latin-1 prints as "?".
    /// </summary>
    public static class DocumentDraft
    {
        public sealed record Section(string Heading, List<(string Label, string Value)> Rows);

        private sealed record Line(string Text, int Size, bool Bold, int Indent = 0, string? Value = null);

        private const int Top = 790;
        private const int Bottom = 60;
        private const int Left = 50;
        private const int WrapAt = 60;

        public static byte[] Pdf(string title, string subtitle, IEnumerable<Section> sections, string footer)
        {
            List<Line> lines = [new(title, 18, true), new(subtitle, 10, false), new("", 10, false)];
            foreach (var section in sections.Where(s => s.Rows.Count > 0))
            {
                lines.Add(new(section.Heading, 12, true));
                foreach (var (label, value) in section.Rows)
                {
                    var parts = Wrap(value);
                    lines.Add(new(label, 10, false, 0, parts[0]));
                    lines.AddRange(parts.Skip(1).Select(part => new Line("", 10, false, 0, part)));
                }
                lines.Add(new("", 8, false));
            }
            lines.Add(new(footer, 8, false));

            List<string> pages = [];
            var content = new StringBuilder();
            var y = Top;
            foreach (var line in lines)
            {
                var height = line.Size + 6;
                if (y - height < Bottom)
                {
                    pages.Add(content.ToString());
                    content.Clear();
                    y = Top;
                }
                y -= height;
                Text(content, line.Bold ? "F2" : "F1", line.Size, Left + line.Indent, y, line.Text);
                if (line.Value is not null) Text(content, "F1", line.Size, Left + 170, y, line.Value);
            }
            pages.Add(content.ToString());
            return Write(pages);
        }

        private static List<string> Wrap(string value)
        {
            List<string> parts = [];
            foreach (var paragraph in (string.IsNullOrWhiteSpace(value) ? "-" : value).Split('\n'))
            {
                var current = new StringBuilder();
                foreach (var word in paragraph.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                {
                    if (current.Length > 0 && current.Length + word.Length + 1 > WrapAt)
                    {
                        parts.Add(current.ToString());
                        current.Clear();
                    }
                    current.Append(current.Length > 0 ? " " : "").Append(word);
                }
                parts.Add(current.ToString());
            }
            return parts;
        }

        private static void Text(StringBuilder content, string font, int size, int x, int y, string text)
        {
            if (text.Length == 0) return;
            var escaped = new StringBuilder();
            foreach (var c in text)
            {
                if (c is '(' or ')' or '\\') escaped.Append('\\').Append(c);
                else escaped.Append(c is >= ' ' and <= 'ÿ' ? c : '?');
            }
            content.Append(CultureInfo.InvariantCulture, $"BT /{font} {size} Tf {x} {y} Td ({escaped}) Tj ET\n");
        }

        // Objects: 1 catalog, 2 page tree, 3 and 4 fonts, then a page and its content stream per page
        private static byte[] Write(List<string> pages)
        {
            var latin1 = Encoding.Latin1;
            var output = new MemoryStream();
            List<long> offsets = [];
            void Put(string text) => output.Write(latin1.GetBytes(text));
            void Object(string body)
            {
                offsets.Add(output.Position);
                Put($"{offsets.Count} 0 obj\n{body}\nendobj\n");
            }

            Put("%PDF-1.4\n");
            var kids = string.Join(" ", pages.Select((_, i) => $"{5 + i * 2} 0 R"));
            Object("<< /Type /Catalog /Pages 2 0 R >>");
            Object($"<< /Type /Pages /Kids [{kids}] /Count {pages.Count} >>");
            Object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
            Object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
            for (var i = 0; i < pages.Count; i++)
            {
                Object($"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {6 + i * 2} 0 R >>");
                Object($"<< /Length {latin1.GetByteCount(pages[i])} >>\nstream\n{pages[i]}endstream");
            }

            var xref = output.Position;
            Put($"xref\n0 {offsets.Count + 1}\n0000000000 65535 f \n");
            foreach (var offset in offsets) Put($"{offset:D10} 00000 n \n");
            Put($"trailer\n<< /Size {offsets.Count + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n");
            return output.ToArray();
        }
    }
}
