import { ListFilter } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@moduleleague/ui";
import {
  DOCUMENT_SHOW,
  showsRow,
  stepLabel,
  type DocumentFilter,
  type DocumentRow,
  type DocumentShow,
} from "./document.utils";

interface DocumentFilterMenuProps {
  /** Every shipment, to count each option and list the stages they're at. */
  rows: DocumentRow[];
  /** Every step in order, as the API gives them. */
  steps: IDocumentStep[];
  filter: DocumentFilter;
  onChange: (filter: DocumentFilter) => void;
}

/**
 * Narrows the shipment list by how far along the papers are and by stage; the button counts what's narrowing it.
 * @example
 * <DocumentFilterMenu rows={rows} steps={rules.steps} filter={filter} onChange={setFilter} />
 */
export function DocumentFilterMenu({
  rows,
  steps,
  filter,
  onChange,
}: DocumentFilterMenuProps) {
  const stages = steps.filter((step) =>
    rows.some(({ checklist }) => checklist.stage === step),
  );
  const active = (filter.show !== "all" ? 1 : 0) + filter.stages.length;
  const toggleStage = (step: IDocumentStep, isPicked: boolean) =>
    onChange({
      ...filter,
      stages: isPicked
        ? [...filter.stages, step]
        : filter.stages.filter((entry) => entry !== step),
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={active > 0 ? "secondary" : "outline"}
          size="xs"
          startIcon={<ListFilter size={13} />}
        >
          Filter{active > 0 && ` · ${active}`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Show</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={filter.show}
          onValueChange={(show) =>
            onChange({ ...filter, show: show as DocumentShow })
          }
        >
          {DOCUMENT_SHOW.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              onSelect={(event) => event.preventDefault()}
            >
              <span className="flex-1">{option.label}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {
                  rows.filter(({ checklist }) =>
                    showsRow(checklist, option.value),
                  ).length
                }
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {stages.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Stage</DropdownMenuLabel>
            {stages.map((step) => (
              <DropdownMenuCheckboxItem
                key={step}
                checked={filter.stages.includes(step)}
                onCheckedChange={(isPicked) => toggleStage(step, isPicked)}
                onSelect={(event) => event.preventDefault()}
              >
                {stepLabel(step)}
              </DropdownMenuCheckboxItem>
            ))}
          </>
        )}
        {active > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onChange({ ...filter, show: "all", stages: [] })}
            >
              Clear filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
