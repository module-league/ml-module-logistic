import { cn } from "@moduleleague/ui";
import { DOCUMENT_TONE } from "./document.utils";

interface DocumentProgressProps {
  verified: number;
  required: number;
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

  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        role="progressbar"
        aria-label={label}
        aria-valuenow={verified}
        aria-valuemax={required}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
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
        {label}
      </span>
    </span>
  );
}
