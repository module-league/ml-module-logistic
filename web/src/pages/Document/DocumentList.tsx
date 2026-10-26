import { cn } from "@moduleleague/ui";
import { basisText, stepLabel, type DocumentRow } from "./document.utils";

/** The shipments, each with its stage and how many required papers are verified; one is selected and shown beside it. */
export function DocumentList({
  rows,
  selectedId,
  onSelect,
}: {
  rows: DocumentRow[];
  selectedId?: string;
  onSelect: (shipmentId: string) => void;
}) {
  return (
    <ul className="flex max-h-[75dvh] flex-col gap-2 overflow-y-auto rounded-xl border bg-background p-2">
      {rows.map(({ shipment, checklist }) => {
        const selected = shipment.id === selectedId;
        const done =
          checklist.required > 0 && checklist.verified === checklist.required;
        const percent = checklist.required
          ? (checklist.verified / checklist.required) * 100
          : 100;
        return (
          <li key={shipment.id}>
            <button
              type="button"
              aria-current={selected || undefined}
              onClick={() => onSelect(shipment.id)}
              className={cn(
                "flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected && "border-primary bg-primary-10 hover:bg-primary-10",
              )}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold">
                  {shipment.title}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {stepLabel(checklist.stage)}
                </span>
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {basisText(checklist)}
              </span>
              <span className="flex items-center gap-2">
                <span
                  role="progressbar"
                  aria-label={`${checklist.verified} of ${checklist.required} verified`}
                  aria-valuenow={checklist.verified}
                  aria-valuemax={checklist.required}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                >
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      done ? "bg-emerald-600" : "bg-amber-500",
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {checklist.verified}/{checklist.required}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
