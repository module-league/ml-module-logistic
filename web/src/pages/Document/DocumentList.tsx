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
      className="flex max-h-[75dvh] min-h-0 flex-col lg:max-h-none lg:border-r"
    >
      <h2 className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground tabular-nums">
        {rows.length} {rows.length === 1 ? "shipment" : "shipments"}
      </h2>
      <ul className="flex flex-col gap-0.5 overflow-y-auto px-2 pb-2">
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
