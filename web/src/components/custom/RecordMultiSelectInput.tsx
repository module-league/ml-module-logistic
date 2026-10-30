import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  singleLine = false,
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

  // On one line, chips past the edge are hidden and counted as "+N"; they keep their place so the count stays put
  const chipsRef = useRef<HTMLSpanElement>(null);
  const [firstHidden, setFirstHidden] = useState(Infinity);
  useLayoutEffect(() => {
    const chips = chipsRef.current;
    if (!singleLine || !chips) return;
    const measure = () => {
      const index = [...chips.children].findIndex((chip) => {
        const node = chip as HTMLElement;
        return node.offsetLeft + node.offsetWidth > chips.clientWidth;
      });
      setFirstHidden(index === -1 ? Infinity : index);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(chips);
    return () => observer.disconnect();
  }, [singleLine, selectedIds]);
  const hidden = Math.max(selectedIds.length - firstHidden, 0);

  const change = useCallback(
    (ids: string[]) => onChange?.(toOptionsValue(ids)),
    [onChange],
  );
  const renderValue = useCallback(
    () =>
      singleLine ? (
        <span className="flex min-w-0 flex-1 items-center gap-1 px-1">
          <span
            ref={chipsRef}
            className="relative flex min-w-0 flex-1 items-center gap-1 overflow-hidden"
          >
            {selectedIds.map((optionId, index) => {
              const option = optionById.get(optionId);
              return (
                <SelectionNode
                  key={optionId}
                  dropDownValue={option}
                  className={cn(
                    "shrink-0 py-0.5",
                    index >= firstHidden && "invisible",
                  )}
                >
                  {option?.value}
                </SelectionNode>
              );
            })}
          </span>
          {hidden > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              +{hidden}
            </span>
          )}
        </span>
      ) : (
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
    [singleLine, selectedIds, optionById, firstHidden, hidden],
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
