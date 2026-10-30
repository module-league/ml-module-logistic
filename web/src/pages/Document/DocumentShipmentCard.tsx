import { cn } from "@moduleleague/ui";
import { SelectionNode } from "@/components/custom/RecordValueNode";
import { DocumentProgress } from "./DocumentProgress";
import type { BasisTag } from "./document.utils";

interface DocumentShipmentCardProps {
  title: string;
  /** "Booked", "In transit". */
  stage: string;
  /** Its mode and Incoterm, shown as the select fields' own coloured options. */
  tags: BasisTag[];
  verified: number;
  required: number;
  isSelected?: boolean;
  /** Without it the card is a static picture, as in the rules preview. */
  onClick?: () => void;
}

/**
 * One shipment in the Documents list: its name and stage, mode and Incoterm, and how many required papers are verified.
 * @example
 * <DocumentShipmentCard title="SH-0042" stage="Booked" tags={tags} verified={1} required={3} onClick={open} />
 */
export function DocumentShipmentCard({
  title,
  stage,
  tags,
  verified,
  required,
  isSelected = false,
  onClick,
}: DocumentShipmentCardProps) {
  const className = cn(
    "flex w-full flex-col gap-1 rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors",
    onClick &&
      "cursor-pointer hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    isSelected && "border-primary bg-primary-10 hover:bg-primary-10",
  );
  const body = (
    <>
      <span className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-semibold">{title}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{stage}</span>
      </span>
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <SelectionNode
                key={tag.label}
                dropDownValue={tag.option}
                title={`${tag.label}: ${tag.value}`}
                className="max-w-full truncate px-1.5 py-px"
              >
                {tag.value}
              </SelectionNode>
            ))
          ) : (
            <span className="text-muted-foreground">No mode or Incoterm</span>
          )}
        </span>
        <DocumentProgress
          verified={verified}
          required={required}
          size="compact"
          className="shrink-0"
        />
      </span>
    </>
  );

  return onClick ? (
    <button
      type="button"
      aria-current={isSelected || undefined}
      onClick={onClick}
      className={className}
    >
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}
