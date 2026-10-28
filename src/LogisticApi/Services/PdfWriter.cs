using System.Globalization;
using System.Text;

namespace LogisticApi.Services
{
    /// <summary>
    /// Writes a plain A4 PDF in Helvetica: a title, then sections of labelled values and tables, enough for document drafts and
    /// invoices. Arrows and dashes become ASCII; other text outside Latin-1 prints as "?".
    /// </summary>
    public static class PdfWriter
    {
        public abstract record Block;

        /// <summary>Labelled values, one per line; long values wrap.</summary>
        public sealed record Section(string Heading, List<(string Label, string Value)> Rows) : Block;

        /// <summary>Rows of cells under a header row; Bold marks rows like a total.</summary>
        public sealed record Table(string? Heading, List<Column> Columns, List<(string[] Cells, bool Bold)> Rows) : Block;

        /// <summary>X is from the left margin; a right-aligned column ends at X.</summary>
        public sealed record Column(string Header, int X, bool Right = false);

        private sealed record Cell(int X, string Text, bool Bold, bool Right = false);

        private sealed record Line(int Size, List<Cell> Cells, bool Rule = false);

        private const int Top = 790;
        private const int Bottom = 60;
        private const int Left = 50;
        private const int Width = 495;
        private const int WrapAt = 60;

        public static byte[] Pdf(string title, string subtitle, IEnumerable<Block> blocks, string footer)
        {
            List<Line> lines = [Plain(title, 18, true), Plain(subtitle, 10), Plain("", 10)];
            foreach (var block in blocks)
            {
                switch (block)
                {
                    case Section { Rows.Count: > 0 } section:
                        lines.Add(Plain(section.Heading, 12, true));
                        foreach (var (label, value) in section.Rows)
                        {
                            var parts = Wrap(value);
                            lines.Add(new(10, [new(0, label, false), new(170, parts[0], false)]));
                            lines.AddRange(parts.Skip(1).Select(part => new Line(10, [new(170, part, false)])));
                        }
                        lines.Add(Plain("", 8));
                        break;
                    case Table table:
                        if (table.Heading is not null) lines.Add(Plain(table.Heading, 12, true));
                        if (table.Columns.Any(c => c.Header.Length > 0))
                        {
                            lines.Add(new(9, table.Columns.Select(c => new Cell(c.X, c.Header, true, c.Right)).ToList()));
                            lines.Add(new(4, [], Rule: true));
                        }
                        foreach (var (cells, bold) in table.Rows)
                            lines.Add(new(bold ? 11 : 10, table.Columns.Zip(cells, (c, text) => new Cell(c.X, text, bold, c.Right)).ToList()));
                        lines.Add(Plain("", 8));
                        break;
                }
            }
            lines.Add(Plain(footer, 8));

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
                if (line.Rule) content.Append(CultureInfo.InvariantCulture, $"0.8 G {Left} {y + 6} m {Left + Width} {y + 6} l S 0 G\n");
                foreach (var cell in line.Cells)
                {
                    var x = cell.Right ? cell.X - TextWidth(cell.Text, line.Size, cell.Bold) : cell.X;
                    Text(content, cell.Bold ? "F2" : "F1", line.Size, Left + x, y, cell.Text);
                }
            }
            pages.Add(content.ToString());
            return Write(pages);
        }

        private static Line Plain(string text, int size, bool bold = false) => new(size, [new(0, text, bold)]);

        // Close enough to Helvetica's widths to right-align amounts
        private static int TextWidth(string text, int size, bool bold) =>
            (int)Math.Ceiling(text.Sum(c => c switch
            {
                >= '0' and <= '9' => 0.556,
                ' ' or '.' or ',' or ':' => 0.278,
                >= 'A' and <= 'Z' => bold ? 0.722 : 0.667,
                _ => bold ? 0.556 : 0.5,
            }) * size);

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
            foreach (var c in text.Replace("→", "->").Replace("–", "-").Replace("’", "'"))
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
