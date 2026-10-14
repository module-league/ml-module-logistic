import { useCallback, useMemo } from "react";
import { MultiSelect } from "@/ui-kit";
import {
  lookupDisplayField,
  lookupRecordsOf,
  parseRecordIds,
  toRecordIdsValue,
} from "@/lib/lookupHelper";
import { linkedRecordLabel, lookupLabels } from "@/lib/recordTextHelper";
import { useRecordLookups } from "./RecordLookup.context";
import { LinkedRecordChip } from "./LinkedRecordChip";
import type { RecordLookupInputProps } from "./RecordLookupInput.types";

/** Picks any number of records from the sidebar a lookup field looks up; searchable by the shown field. */
export function RecordLookupInput({
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
}: RecordLookupInputProps) {
  const { lookups, sources } = useRecordLookups();
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
        color: "var(--primary)",
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
      )?.sidebarText ?? "the looked-up sidebar",
    [sources, field?.lookupSettings?.categoryId],
  );

  const change = useCallback(
    (ids: string[]) => onChange?.(toRecordIdsValue(ids)),
    [onChange],
  );
  const renderValue = useCallback(
    () => (
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 px-1">
        {linked.map((record) => (
          <LinkedRecordChip key={record.id} label={record.label} />
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
      placeholder={placeholder ?? "Link records"}
      renderOptionEmpty={
        records ? `No records in ${sourceText} yet.` : "Loading records…"
      }
      disableAllSelection
      onBlur={onBlur}
      className={className}
      style={style}
    />
  );
}
