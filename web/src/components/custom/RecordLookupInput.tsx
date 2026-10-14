import { useMemo } from "react";
import { PanelRightOpen } from "lucide-react";
import { Button, cn } from "@/ui-kit";
import { lookupLabels } from "@/lib/recordTextHelper";
import { useRecordLookups } from "./RecordLookup.context";
import { LinkedRecordChip } from "./LinkedRecordChip";
import type { RecordLookupInputProps } from "./RecordLookupInput.types";

/** A lookup can't be edited: it shows the records its link field links to, which change from that field. */
export function RecordLookupInput({
  id,
  field,
  value,
  members,
  className,
  style,
  onPreview,
  previewActive = false,
}: RecordLookupInputProps) {
  const { lookups, linkFields } = useRecordLookups();
  const linked = useMemo(
    () => lookupLabels(field, value, members, lookups),
    [field, value, members, lookups],
  );
  const linkName = useMemo(
    () =>
      linkFields?.find(
        (linkField) => linkField?.objId === field?.lookupSettings?.linkFieldId,
      )?.name,
    [linkFields, field?.lookupSettings?.linkFieldId],
  );

  const shown = (
    <div
      id={id}
      role="group"
      aria-label={field?.name}
      title={linkName ? `Change the links in ${linkName}` : undefined}
      className={cn(
        "flex min-h-10 min-w-0 flex-1 flex-wrap items-center gap-1 rounded-md border px-2 py-1",
        !onPreview && className,
      )}
      style={onPreview ? undefined : style}
    >
      {linked.length ? (
        linked.map((record) => (
          <LinkedRecordChip key={record.id} label={record.label} />
        ))
      ) : (
        <span className="text-sm text-muted-foreground">
          {linkName
            ? `Nothing linked in ${linkName} yet.`
            : "Its link field isn't available."}
        </span>
      )}
    </div>
  );
  if (!onPreview) return shown;

  return (
    <div className={cn("flex items-start gap-2", className)} style={style}>
      {shown}
      <Button
        variant="outline"
        size="icon"
        aria-label="Preview linked records"
        aria-pressed={previewActive}
        title="Preview linked records"
        disabled={!linked.length}
        className={cn("h-10 w-10 shrink-0", previewActive && "bg-primary-10")}
        startIcon={<PanelRightOpen size={16} />}
        onClick={onPreview}
      />
    </div>
  );
}
