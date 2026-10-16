import { useCallback, useMemo } from "react";
import { Plus, X } from "lucide-react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@moduleleague/ui";
import { RecordMultiSelectInput } from "@/components/custom/RecordMultiSelectInput";
import { RecordMemberInput } from "@/components/custom/RecordMemberInput";
import {
  isFilterField,
  newCondition,
  operatorsFor,
  PERIODS,
} from "../moduleDashboard.utils";
import type { DashboardFilterEditorProps } from "../moduleDashboard.types";
import { DashboardFieldSelect } from "./DashboardControls";

const MATCH_OPTIONS = [
  { value: "all", label: "all conditions" },
  { value: "any", label: "any condition" },
] as const;

/** The conditions a record must meet, each a field, a test and a value that suits the field. */
export function DashboardFilterEditor({
  fields,
  filter,
  members,
  onChange,
}: DashboardFilterEditorProps) {
  const filterFields = useMemo(() => fields.filter(isFilterField), [fields]);
  const fieldById = useMemo(
    () => new Map(fields.map((field) => [field.objId, field])),
    [fields],
  );
  const setCondition = useCallback(
    (index: number, condition: IDashboardCondition) =>
      onChange({
        ...filter,
        conditions: filter.conditions.map((current, at) =>
          at === index ? condition : current,
        ),
      }),
    [filter, onChange],
  );
  const addCondition = useCallback(() => {
    if (filterFields[0]) {
      onChange({
        ...filter,
        conditions: [...filter.conditions, newCondition(filterFields[0])],
      });
    }
  }, [filter, filterFields, onChange]);
  const removeCondition = useCallback(
    (index: number) =>
      onChange({
        ...filter,
        conditions: filter.conditions.filter((_, at) => at !== index),
      }),
    [filter, onChange],
  );

  return (
    <div className="flex flex-col gap-2">
      {filter.conditions.length > 1 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Match
          <Select
            value={filter.match}
            onValueChange={(match) =>
              onChange({ ...filter, match: match as IDashboardFilter["match"] })
            }
          >
            <SelectTrigger className="h-7 w-auto text-xs" aria-label="Match">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {MATCH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {filter.conditions.map((condition, index) => {
        const field = fieldById.get(condition.fieldId);
        const operators = operatorsFor(field);
        const operator = operators.find(
          (option) => option.value === condition.operator,
        );
        return (
          <div
            key={index}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2 rounded-lg border p-2"
          >
            <DashboardFieldSelect
              fields={filterFields}
              value={condition.fieldId}
              onChange={(fieldId) => {
                const next = fieldById.get(fieldId ?? "");
                if (next) setCondition(index, newCondition(next));
              }}
              placeholder="Deleted field"
            />
            <Select
              value={operator?.value ?? ""}
              onValueChange={(value) => {
                const next = operators.find((option) => option.value === value);
                setCondition(index, {
                  ...condition,
                  operator: value as IDashboardOperator,
                  value:
                    next?.input === operator?.input
                      ? condition.value
                      : next?.input === "period"
                        ? "today"
                        : undefined,
                });
              }}
            >
              <SelectTrigger className="w-full min-w-0" aria-label="Test">
                <SelectValue placeholder="Test" />
              </SelectTrigger>
              <SelectContent position="popper">
                {operators.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove condition ${index + 1}`}
              className="text-muted-foreground hover:text-foreground"
              startIcon={<X size={14} />}
              onClick={() => removeCondition(index)}
            />
            {field && operator?.input && (
              <div className="col-span-2">
                <ConditionValue
                  field={field}
                  input={operator.input}
                  value={condition.value ?? ""}
                  members={members}
                  onChange={(value) =>
                    setCondition(index, { ...condition, value })
                  }
                />
              </div>
            )}
          </div>
        );
      })}
      <Button
        variant="ghost"
        size="xs"
        className="w-fit text-primary"
        startIcon={<Plus size={13} />}
        onClick={addCondition}
        disabled={!filterFields.length}
      >
        Add condition
      </Button>
    </div>
  );
}

/** The value a condition compares with, in the input its test needs. */
function ConditionValue({
  field,
  input,
  value,
  members,
  onChange,
}: {
  field: ISidebarField;
  input: NonNullable<ReturnType<typeof operatorsFor>[number]["input"]>;
  value: string;
  members: IUserInfo[];
  onChange: (value: string) => void;
}) {
  const asMultiple = useMemo(
    () => ({
      ...field,
      type: "multi_select" as const,
      memberSettings: { multiple: true },
    }),
    [field],
  );
  switch (input) {
    case "options":
      return (
        <RecordMultiSelectInput
          field={asMultiple}
          value={value}
          placeholder="Pick options"
          onChange={onChange}
        />
      );
    case "members":
      return (
        <RecordMemberInput
          field={{ ...field, memberSettings: { multiple: true } }}
          value={value}
          members={members}
          placeholder="Pick people"
          onChange={onChange}
        />
      );
    case "period":
      return (
        <Select value={value || "today"} onValueChange={onChange}>
          <SelectTrigger className="w-full" aria-label="Period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {PERIODS.map((period) => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    default:
      return (
        <Input
          aria-label="Value"
          value={value}
          inputMode={input === "number" ? "decimal" : undefined}
          placeholder={input === "number" ? "A number" : "Text"}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}
