import { TriangleAlert } from "lucide-react";
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

const ICON_CLASS: Record<IExceptionSeverity, string> = {
  high: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300",
  medium: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
  low: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300",
};

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
    <ul className="flex max-h-[75dvh] flex-col overflow-y-auto rounded-xl border bg-background">
      {rows.map((row) => {
        const { exception } = row;
        const selected = exception.objId === selectedId;
        const overdue = isOverdue(exception, now);
        return (
          <li key={exception.objId} className="border-b last:border-b-0">
            <button
              type="button"
              aria-current={selected || undefined}
              onClick={() => onSelect(exception.objId)}
              className={cn(
                "flex w-full cursor-pointer gap-3 border-l-2 border-transparent p-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
                selected &&
                  "border-l-primary bg-primary-10 hover:bg-primary-10",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  ICON_CLASS[exception.severity],
                )}
              >
                <TriangleAlert className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">
                    {exception.title}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {exception.exceptionNo}
                  </span>
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {row.shipment?.title ?? "Unknown shipment"} ·{" "}
                  {routeText(row.shipment)}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span
                    className={cn(
                      CHIP_CLASS,
                      SEVERITY_CLASS[exception.severity],
                    )}
                  >
                    {labelOf(SEVERITIES, exception.severity)}
                  </span>
                  <span
                    className={cn(
                      overdue
                        ? "font-medium text-red-600 dark:text-red-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {exception.status === "resolved"
                      ? (exception.resolutionReason ?? slaText(exception, now))
                      : slaText(exception, now)}
                  </span>
                  <span className="ml-auto truncate text-muted-foreground">
                    {row.owner
                      ? `Owner: ${row.owner.displayName}`
                      : "Unassigned"}
                  </span>
                </span>
                {row.rule?.autoClose && exception.status !== "resolved" && (
                  <span className={cn("w-fit bg-muted", CHIP_CLASS)}>
                    Closes itself
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
