import { useCallback, useMemo } from "react";
import { cn, MultiSelect } from "@/ui-kit";
import { parseOptionIds, toOptionsValue } from "@/lib/selectHelper";
import { SelectionNode } from "./RecordValueNode";
import type { RecordMultiSelectInputProps } from "./RecordMultiSelectInput.types";
import { RECORD_INPUT_GROW_CLASS } from "./recordInput.utils";

export function RecordMultiSelectInput({
  id,
  field,
  value,
  disabled,
  placeholder,
  className,
  style,
  onChange,
  onBlur,
}: RecordMultiSelectInputProps) {
  const optionById = useMemo(
    () =>
      new Map(field.dropDownValues?.map((option) => [option.id, option]) ?? []),
    [field.dropDownValues],
  );
  const selectedIds = useMemo(
    () => parseOptionIds(value).filter((optionId) => optionById.has(optionId)),
    [value, optionById],
  );
  const options = useMemo(
    () =>
      field.dropDownValues?.map((option) => ({
        value: option.id,
        label: option.value,
        color: option.colorCode,
      })) ?? [],
    [field.dropDownValues],
  );

  const change = useCallback(
    (ids: string[]) => onChange?.(toOptionsValue(ids)),
    [onChange],
  );
  const renderValue = useCallback(
    () => (
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 px-1">
        {selectedIds.map((optionId) => {
          const option = optionById.get(optionId);
          return (
            <SelectionNode key={optionId} dropDownValue={option}>
              {option?.value}
            </SelectionNode>
          );
        })}
      </span>
    ),
    [selectedIds, optionById],
  );

  return (
    <MultiSelect
      id={id}
      options={options}
      value={selectedIds}
      onValueChange={change}
      renderValue={renderValue}
      disabled={disabled}
      placeholder={placeholder ?? "Select options"}
      renderOptionEmpty="No options yet. Add some in Edit field."
      disableAllSelection
      onBlur={onBlur}
      className={cn(RECORD_INPUT_GROW_CLASS, className)}
      style={style}
    />
  );
}
