import { useCallback, useMemo } from "react";
import { cn, MultiSelect } from "@/ui-kit";
import {
  lookupDisplayField,
  lookupRecordsOf,
  parseRecordIds,
  toRecordIdsValue,
} from "@/lib/lookupHelper";
import { linkedRecordLabel, lookupLabels } from "@/lib/recordTextHelper";
import { useRecordLookups } from "./RecordLookup.context";
import { LinkedRecordChip } from "./LinkedRecordChip";
import type { RecordLinkInputProps } from "./RecordLookupInput.types";
import { RECORD_INPUT_GROW_CLASS } from "./recordInput.utils";

/** Picks records of the sidebar a link field links to, searchable by their label; one record unless the field allows several. */
export function RecordLinkInput({
  id,
  field,
  value,
  members,
  disabled,
  placeholder,
  className,
  style,
  onChange,
  onBlur,
}: RecordLinkInputProps) {
  const { lookups, sources } = useRecordLookups();
  const multiple = field?.lookupSettings?.multiple ?? true;
  const records = useMemo(
    () => lookupRecordsOf(field, lookups),
    [field, lookups],
  );
  const options = useMemo(() => {
    const shown = lookupDisplayField(field, lookups);
    return (
      records?.map((record) => ({
        value: record?.objId,
        label: linkedRecordLabel(shown, record, members),
        color: "var(--secondary)",
        className: "text-black",
      })) ?? []
    );
  }, [field, lookups, records, members]);
  const linked = useMemo(
    () => lookupLabels(field, value, members, lookups),
    [field, value, members, lookups],
  );
  const selectedIds = useMemo(() => parseRecordIds(value), [value]);
  const sourceText = useMemo(
    () =>
      sources?.find(
        (source) => source?.sidebarId === field?.lookupSettings?.categoryId,
      )?.sidebarText ?? "the linked sidebar",
    [sources, field?.lookupSettings?.categoryId],
  );

  // A single link keeps only the record just picked; unpicking it clears the field
  const change = useCallback(
    (ids: string[]) =>
      onChange?.(
        toRecordIdsValue(
          multiple ? ids : ids.filter((id) => !selectedIds.includes(id)),
        ),
      ),
    [onChange, multiple, selectedIds],
  );
  const renderValue = useCallback(
    () => (
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 px-1">
        {linked.map((record) => (
          <LinkedRecordChip
            key={record.id}
            label={record.label}
            className="bg-secondary text-black"
          />
        ))}
      </span>
    ),
    [linked],
  );

  return (
    <MultiSelect
      id={id}
      options={options}
      value={selectedIds}
      onValueChange={change}
      renderValue={renderValue}
      disabled={disabled}
      placeholder={placeholder ?? (multiple ? "Link records" : "Link a record")}
      renderOptionEmpty={
        records ? `No records in ${sourceText} yet.` : "Loading records…"
      }
      disableAllSelection
      closeOnSelect={!multiple}
      onBlur={onBlur}
      className={cn(RECORD_INPUT_GROW_CLASS, className)}
      style={style}
    />
  );
}
