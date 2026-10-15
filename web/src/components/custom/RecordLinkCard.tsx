import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn, FieldTypeIcon } from "@/ui-kit";
import { RecordValueNode } from "./RecordValueNode";
import type { RecordLinkCardProps } from "./RecordLookupInput.types";

/**
 * One record of a link field as a card: its title, then up to three fields with their values.
 * With onSelect it's a pickable option; with action it shows a button in its corner, e.g. to unlink it.
 * @example
 * <RecordLinkCard title="SHP-0001" record={record} fields={cardFields} members={members} action={<RemoveButton />} />
 */
export function RecordLinkCard({
  title,
  record,
  fields,
  members,
  selected = false,
  onSelect,
  action,
  className,
}: RecordLinkCardProps) {
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {title}
        </span>
        {onSelect && (
          <span
            className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded-full border",
              selected && "border-primary bg-primary text-primary-foreground",
            )}
          >
            {selected && <Check className="size-3" />}
          </span>
        )}
        {action}
      </span>
      {!!fields?.length && (
        <span className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
          {fields.map((field) => (
            <CardRow key={field.objId} field={field}>
              {record?.values?.[field.objId] ? (
                <RecordValueNode
                  field={field}
                  value={record.values[field.objId]}
                  members={members}
                />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </CardRow>
          ))}
        </span>
      )}
    </>
  );
  const cardClass = cn(
    "flex w-full min-w-0 flex-col gap-2 rounded-lg border bg-background p-3 text-left",
    selected && "border-primary bg-primary-10",
    className,
  );

  if (!onSelect) return <div className={cardClass}>{body}</div>;
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        cardClass,
        "cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary-10",
      )}
    >
      {body}
    </button>
  );
}

/** A field name on the left, its value on the right. */
function CardRow({
  field,
  children,
}: {
  field: ISidebarField;
  children: ReactNode;
}) {
  return (
    <>
      <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
        <FieldTypeIcon type={field.type} className="size-3 shrink-0" />
        <span className="truncate">{field.name}</span>
      </span>
      <span className="flex min-w-0 items-center truncate">{children}</span>
    </>
  );
}
