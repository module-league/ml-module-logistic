import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";

/** Splits text around every case-insensitive match of term. */
function splitByTerm(text: string, term: string) {
  if (term === "") return [{ text, match: false }];
  const lower = text.toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let from = 0;
  let at = lower.indexOf(term);
  while (at >= 0) {
    if (at > from) parts.push({ text: text.slice(from, at), match: false });
    parts.push({ text: text.slice(at, at + term.length), match: true });
    from = at + term.length;
    at = lower.indexOf(term, from);
  }
  if (from < text.length) parts.push({ text: text.slice(from), match: false });
  return parts;
}

/** Text with every match of term marked; term is expected lower-cased. */
export const HighlightText = memo(function HighlightText({
  text,
  term,
  className,
}: {
  text: string;
  term: string;
  className?: string;
}) {
  const parts = useMemo(() => splitByTerm(text, term), [text, term]);
  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.match ? (
          <mark key={index} className={cn("bg-yellow-200 text-inherit")}>
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </span>
  );
});
