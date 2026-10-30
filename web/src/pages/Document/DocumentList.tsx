import { cn } from "@moduleleague/ui";
import { DocumentProgress } from "./DocumentProgress";
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
    <nav
      aria-label="Shipments"
      className="flex max-h-[75dvh] flex-col overflow-hidden rounded-xl border bg-background"
    >
      <h2 className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
        Shipments · {rows.length}
      </h2>
      <ul className="flex flex-col gap-1 overflow-y-auto p-2">
        {rows.map(({ shipment, checklist }) => {
          const selected = shipment.id === selectedId;
          return (
            <li key={shipment.id}>
              <button
                type="button"
                aria-current={selected || undefined}
                onClick={() => onSelect(shipment.id)}
                className={cn(
                  "flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border border-transparent p-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  selected &&
                    "border-primary bg-primary-10 hover:bg-primary-10",
                )}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">
                    {shipment.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {stepLabel(checklist.stage)}
                  </span>
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {basisText(checklist)}
                </span>
                <DocumentProgress
                  verified={checklist.verified}
                  required={checklist.required}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
