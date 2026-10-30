import { Plus, X } from "lucide-react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@moduleleague/ui";
import { RecordMultiSelectInput } from "@/components/custom/RecordMultiSelectInput";
import {
  conditionOptionIds,
  conditionOptionValues,
  stepLabel,
} from "./document.utils";

/** A requirement as the Rules dialog edits it; the condition's text comes back from the API after saving. */
export type RequirementDraft = Omit<IDocumentRequirement, "when">;

/** The Select value for "gates nothing", since a Select can't hold undefined. */
const NO_GATE = "none";

interface DocumentRequirementsEditorProps {
  requirements: RequirementDraft[];
  types: IDocumentType[];
  /** Every step in order, as the API gives them. */
  steps: IDocumentStep[];
  modeField?: ISidebarField;
  incotermField?: ISidebarField;
  onChange: (requirements: RequirementDraft[]) => void;
  onAdd: () => void;
}

/**
 * When each paper is needed: which shipments (by mode and Incoterm), from which step, and which later step it holds up until verified.
 * @example
 * <DocumentRequirementsEditor requirements={draft.requirements} types={draft.types} steps={rules.steps} onChange={set} onAdd={add} />
 */
export function DocumentRequirementsEditor({
  requirements,
  types,
  steps,
  modeField,
  incotermField,
  onChange,
  onAdd,
}: DocumentRequirementsEditorProps) {
  const update = (key: string, patch: Partial<RequirementDraft>) =>
    onChange(
      requirements.map((requirement) =>
        requirement.key === key ? { ...requirement, ...patch } : requirement,
      ),
    );
  const setCondition = (
    requirement: RequirementDraft,
    role: IDocumentRole,
    values: string[],
  ) =>
    update(requirement.key, {
      condition: { ...requirement.condition, [role]: values },
    });
  // A gate has to come after the step the paper is needed from, so moving that step later drops a gate it passed
  const setStart = (requirement: RequirementDraft, step: IDocumentStep) => {
    const blocks =
      requirement.blocks !== undefined &&
      steps.indexOf(requirement.blocks) > steps.indexOf(step)
        ? requirement.blocks
        : undefined;
    update(requirement.key, { requiredAtStep: step, blocks });
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-3xl table-fixed text-left text-xs">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="w-1/4 px-3 py-2 font-medium">Document</th>
            <th className="px-3 py-2 font-medium">When</th>
            <th className="w-40 px-3 py-2 font-medium">
              On the checklist from
            </th>
            <th className="w-44 px-3 py-2 font-medium">Gates</th>
            <th className="w-9 py-2 pr-3 pl-0">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((requirement) => {
            const start = steps.indexOf(requirement.requiredAtStep);
            const title =
              types.find((type) => type.docType === requirement.docType)
                ?.title ?? "requirement";
            return (
              <tr key={requirement.key} className="border-t">
                <td className="px-3 py-1.5">
                  <Select
                    value={requirement.docType}
                    onValueChange={(docType) =>
                      update(requirement.key, { docType })
                    }
                  >
                    <SelectTrigger
                      aria-label="Document"
                      className="h-7 w-full text-xs"
                    >
                      <SelectValue placeholder="Pick a document" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {types.map((type) => (
                        <SelectItem key={type.docType} value={type.docType}>
                          {type.title !== "" ? type.title : "Untitled"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex flex-col gap-1">
                    {/* <ConditionInput
                      label="Mode"
                      field={modeField}
                      values={requirement.condition.mode ?? []}
                      onChange={(values) =>
                        setCondition(requirement, "mode", values)
                      }
                    /> */}
                    <ConditionInput
                      label="Incoterm"
                      field={incotermField}
                      values={requirement.condition.incoterm ?? []}
                      onChange={(values) =>
                        setCondition(requirement, "incoterm", values)
                      }
                    />
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <Select
                    value={requirement.requiredAtStep}
                    onValueChange={(step) =>
                      setStart(requirement, step as IDocumentStep)
                    }
                  >
                    <SelectTrigger
                      aria-label="On the checklist from"
                      className="h-7 w-full text-xs"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {steps.map((step) => (
                        <SelectItem key={step} value={step}>
                          {stepLabel(step)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-1.5 pr-1 pl-3">
                  <Select
                    value={requirement.blocks ?? NO_GATE}
                    onValueChange={(step) =>
                      update(requirement.key, {
                        blocks:
                          step === NO_GATE
                            ? undefined
                            : (step as IDocumentStep),
                      })
                    }
                  >
                    <SelectTrigger
                      aria-label="Gates"
                      className="h-7 w-full text-xs"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value={NO_GATE}>Nothing</SelectItem>
                      {steps.slice(start + 1).map((step) => (
                        <SelectItem key={step} value={step}>
                          Holds up {stepLabel(step)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-1.5 pr-3 pl-0">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove the ${title} requirement`}
                    className="text-muted-foreground hover:text-foreground"
                    startIcon={<X size={13} />}
                    onClick={() =>
                      onChange(
                        requirements.filter(
                          (entry) => entry.key !== requirement.key,
                        ),
                      )
                    }
                  />
                </td>
              </tr>
            );
          })}
          <tr className="border-t">
            <td colSpan={5} className="p-0">
              <button
                type="button"
                disabled={types.length === 0}
                onClick={onAdd}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="size-3.5" />
                {types.length > 0
                  ? "Add requirement"
                  : "Add a document type first"}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Which of a field's options need the paper, on one line in the table; none picked means any. */
function ConditionInput({
  label,
  field,
  values,
  onChange,
}: {
  /** "Mode", "Incoterm". */
  label: string;
  field?: ISidebarField;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  if (!field)
    return (
      <span className="flex h-7 items-center rounded-md border bg-muted/40 px-2 text-muted-foreground">
        Pick the {label.toLowerCase()} field first
      </span>
    );
  return (
    <RecordMultiSelectInput
      field={field}
      value={conditionOptionIds(field, values)}
      onChange={(value) => onChange(conditionOptionValues(field, value))}
      placeholder={`Any ${label.toLowerCase()}`}
      singleLine
      className="h-7 min-h-7 py-0 text-xs"
    />
  );
}
