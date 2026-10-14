import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { lookupLabels } from "@/lib/recordTextHelper";
import { useRecordLookups } from "./RecordLookup.context";
import type {
  LinkedRecordChipListProps,
  LinkedRecordChipProps,
} from "./RecordLookupInput.types";

/** One linked record of a lookup field, labelled by the field the lookup shows. */
export const LinkedRecordChip = memo(function LinkedRecordChip({
  label,
  className,
}: LinkedRecordChipProps) {
  return (
    <span
      className={cn(
        "max-w-48 shrink-0 truncate rounded-md bg-primary px-2 py-1 text-[0.8em] text-primary-foreground",
        className,
      )}
      title={label}
    >
      {label}
    </span>
  );
});

/** The linked records of a lookup value, on one line. */
export function LinkedRecordChipList({
  field,
  value,
  members,
}: LinkedRecordChipListProps) {
  const { lookups } = useRecordLookups();
  const linked = useMemo(
    () => lookupLabels(field, value, members, lookups),
    [field, value, members, lookups],
  );

  return (
    <span className="flex min-w-0 items-center gap-1 overflow-hidden">
      {linked.map((record) => (
        <LinkedRecordChip key={record.id} label={record.label} />
      ))}
    </span>
  );
}
