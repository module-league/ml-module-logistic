import { cn } from "@moduleleague/ui";
import { DOCUMENT_TONE } from "./document.utils";

interface DocumentProgressProps {
  verified: number;
  required: number;
  /** "compact" is a short bar for list cards; "default" stretches to fill its row. */
  size?: "default" | "compact";
  className?: string;
}

/**
 * How many of a checklist's required papers are verified, as a bar and "3 of 5 verified".
 * @example
 * <DocumentProgress verified={checklist.verified} required={checklist.required} />
 */
export function DocumentProgress({
  verified,
  required,
  size = "default",
  className,
}: DocumentProgressProps) {
  const isDone = required > 0 && verified === required;
  const percent = required !== 0 ? (verified / required) * 100 : 100;
  const label =
    required === 0
      ? "Nothing required"
      : isDone
        ? "All verified"
        : `${verified} of ${required} verified`;
  // A list card has no room for the sentence, so it shows the count and keeps the sentence as the tooltip
  const shown =
    size === "compact" && required > 0 ? `${verified}/${required}` : label;

  return (
    <span
      title={size === "compact" ? label : undefined}
      className={cn(
        "flex items-center",
        size === "compact" ? "gap-1.5" : "gap-2",
        className,
      )}
    >
      <span
        role="progressbar"
        aria-label={label}
        aria-valuenow={verified}
        aria-valuemax={required}
        className={cn(
          "overflow-hidden rounded-full bg-muted",
          size === "compact" ? "h-1 w-12 shrink-0" : "h-1.5 flex-1",
        )}
      >
        <span
          className={cn(
            "block h-full rounded-full transition-[width]",
            isDone ? DOCUMENT_TONE.green.bar : DOCUMENT_TONE.blue.bar,
          )}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {shown}
      </span>
    </span>
  );
}
