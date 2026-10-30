import { nonEmpty } from "@/lib/stringHelper";
import { DocumentShipmentCard } from "./DocumentShipmentCard";
import { basisTags, conditionHolds } from "./document.utils";

interface DocumentRulesPreviewProps {
  mode?: ISidebarField;
  incoterm?: ISidebarField;
  attachment?: ISidebarField;
  /** The requirements being edited, to count the papers the example shipment would need. */
  requirements: Pick<IDocumentRequirement, "condition" | "requiredAtStep">[];
}

/**
 * An example shipment as the Documents list would show it with the fields and requirements picked so far.
 * @example
 * <DocumentRulesPreview mode={mode} incoterm={incoterm} attachment={attachment} requirements={draft.requirements} />
 */
export function DocumentRulesPreview({
  mode,
  incoterm,
  requirements,
}: DocumentRulesPreviewProps) {
  const modeExample = nonEmpty(mode?.dropDownValues?.[0]?.value);
  const incotermExample = nonEmpty(incoterm?.dropDownValues?.[0]?.value);
  const tags = basisTags([
    { label: "Mode", value: modeExample, field: mode },
    { label: "Incoterm", value: incotermExample, field: incoterm },
  ]);
  const required = requirements.filter(
    (requirement) =>
      requirement.requiredAtStep === "booked" &&
      conditionHolds(requirement.condition, {
        mode: modeExample,
        incoterm: incotermExample,
      }),
  ).length;

  return (
    <aside className="flex flex-col overflow-hidden rounded-xl border bg-background">
      <h4 className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
        Preview
      </h4>
      <div className="p-2">
        <DocumentShipmentCard
          title="Example shipment"
          stage="Booked"
          tags={tags}
          verified={0}
          required={required}
          isSelected
        />
      </div>
    </aside>
  );
}
