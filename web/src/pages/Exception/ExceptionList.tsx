import { cn } from "@moduleleague/ui";
import {
  isOverdue,
  labelOf,
  routeText,
  SEVERITIES,
  SEVERITY_CLASS,
  slaText,
  type ExceptionRow,
} from "./exception.utils";

export const CHIP_CLASS = "rounded-md border px-1.5 text-[11px] font-medium";

/** The exceptions of a tab, most urgent first; one is selected and shown beside it. */
export function ExceptionList({
  rows,
  selectedId,
  now,
  onSelect,
}: {
  rows: ExceptionRow[];
  selectedId?: string;
  now: Date;
  onSelect: (exceptionId: string) => void;
}) {
  return (
    <nav
      aria-label="Exceptions"
      className="flex max-h-[75dvh] min-h-0 flex-col lg:max-h-none lg:border-r"
    >
      <h2 className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground tabular-nums">
        {rows.length} {rows.length === 1 ? "exception" : "exceptions"}
      </h2>
      <ul className="flex flex-col gap-0.5 overflow-y-auto px-2 pb-2">
        {rows.map((row) => {
          const { exception } = row;
          const selected = exception.objId === selectedId;
          const overdue = isOverdue(exception, now);
          return (
            <li key={exception.objId}>
              <button
                type="button"
                aria-current={selected || undefined}
                onClick={() => onSelect(exception.objId)}
                className={cn(
                  "flex w-full cursor-pointer flex-col gap-1 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  selected && "bg-primary-10 hover:bg-primary-10",
                )}
              >
                {/* What's wrong, and how long is left to answer it */}
                <span className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-sm font-medium",
                      selected && "text-primary",
                    )}
                  >
                    {exception.title}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs tabular-nums",
                      overdue
                        ? "font-medium text-red-600 dark:text-red-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {exception.status === "resolved"
                      ? (exception.resolutionReason ?? slaText(exception, now))
                      : slaText(exception, now)}
                  </span>
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {row.shipment?.title ?? "Unknown shipment"} ·{" "}
                  {routeText(row.shipment)}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      CHIP_CLASS,
                      SEVERITY_CLASS[exception.severity],
                    )}
                  >
                    {labelOf(SEVERITIES, exception.severity)}
                  </span>
                  <span className="truncate">
                    {row.owner?.displayName ?? "No owner yet"}
                  </span>
                  {row.rule?.autoClose === true &&
                    exception.status !== "resolved" && (
                      <span title="Closes on its own once the problem is fixed">
                        · Closes itself
                      </span>
                    )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
