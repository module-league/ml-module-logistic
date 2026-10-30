import { DocumentShipmentCard } from "./DocumentShipmentCard";
import { stepLabel, type BasisTag, type DocumentRow } from "./document.utils";

/** The shipments, each with its stage and how many required papers are verified; one is selected and shown beside it. */
export function DocumentList({
  rows,
  selectedId,
  tagsById,
  onSelect,
}: {
  rows: DocumentRow[];
  selectedId?: string;
  /** Each shipment's mode and Incoterm as its fields' coloured options, by shipment id. */
  tagsById: Map<string, BasisTag[]>;
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
        {rows.map(({ shipment, checklist }) => (
          <li key={shipment.id}>
            <DocumentShipmentCard
              title={shipment.title}
              stage={stepLabel(checklist.stage)}
              tags={tagsById.get(shipment.id) ?? []}
              verified={checklist.verified}
              required={checklist.required}
              isSelected={shipment.id === selectedId}
              onClick={() => onSelect(shipment.id)}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
