/**
 * The text, or `undefined` when it is missing or empty, so `??` can fall back for empty text too.
 * Whitespace counts as text; trim first when blank input should fall back as well.
 * @param text The value to check.
 * @returns `text` when it has at least one character, otherwise `undefined`.
 * @example
 * nonEmpty(layout.title) ?? item.sidebarText; // "" → sidebarText
 * nonEmpty(note.trim()); // "  " → undefined
 */
export function nonEmpty(text: string | null | undefined): string | undefined {
  return text == null || text === "" ? undefined : text;
}
