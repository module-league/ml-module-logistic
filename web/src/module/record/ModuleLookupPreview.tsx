import { useMemo, useState } from "react";
import { ChevronDown, TextSearchIcon } from "lucide-react";
import {
  cn,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Separator,
} from "@moduleleague/ui";
import { RecordValueNode } from "@/components/custom/RecordValueNode";
import { HighlightText } from "@/components/custom/HighlightText";
import { useRecordLookups } from "@/components/custom/RecordLookup.context";
import { lookupRecordsOf, previewableLookupFields } from "@/lib/lookupHelper";
import { lookupLabels, toRecordText } from "@/lib/recordTextHelper";
import {
  recordFieldValue,
  SYSTEM_FIELDS,
} from "@/module/page/modulePage.utils";
import type {
  ModuleLinkedRecordCardProps,
  ModuleLookupPreviewProps,
} from "./moduleRecord.types";
import { FieldTypeIcon } from "@/components/custom/fieldTypeIcon";
/**
 * The records a lookup's link field links to, shown beside the open record as cards that open to show all their fields.
 * Link and lookup fields of the linked record are left out, since their own linked records aren't loaded here.
 */
export function ModuleLookupPreview({
  field,
  value,
  members,
}: ModuleLookupPreviewProps) {
  const { lookups, linkFields } = useRecordLookups();
  const categoryId = field.lookupSettings?.categoryId ?? "";
  // Cards are titled like the link field's chips, by the linked record's primary field, not by what the lookup shows
  const linkField = useMemo(
    () =>
      linkFields.find(
        (entry) => entry.objId === field.lookupSettings?.linkFieldId,
      ) ?? field,
    [linkFields, field],
  );

  const linked = useMemo(
    () => lookupLabels(linkField, value, members, lookups),
    [linkField, value, members, lookups],
  );
  const recordById = useMemo(
    () =>
      new Map(
        lookupRecordsOf(field, lookups)?.map((record) => [
          record.objId,
          record,
        ]),
      ),
    [field, lookups],
  );
  const previewFieldIds = field.lookupSettings?.previewFieldIds;
  const shownFields = useMemo(
    () =>
      [
        ...previewableLookupFields(lookups[categoryId]?.fields),
        ...SYSTEM_FIELDS,
      ].filter(
        (sourceField) =>
          !previewFieldIds || previewFieldIds.includes(sourceField.objId),
      ),
    [lookups, categoryId, previewFieldIds],
  );
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  // Each linked record with the text of every shown field, in the order of shownFields, for searching
  const cards = useMemo(
    () =>
      linked.map((entry) => {
        const record = recordById.get(entry.id);
        return {
          ...entry,
          record,
          texts: shownFields.map((sourceField) =>
            record
              ? toRecordText(
                  sourceField,
                  recordFieldValue(sourceField, record),
                  members,
                )
              : "",
          ),
        };
      }),
    [linked, recordById, shownFields, members],
  );
  const shownCards = useMemo(
    () =>
      term !== ""
        ? cards.filter(
            (card) =>
              card.label.toLowerCase().includes(term) ||
              shownFields.some(
                (sourceField, index) =>
                  sourceField.name?.toLowerCase().includes(term) ||
                  card.texts[index]?.toLowerCase().includes(term) === true,
              ),
          )
        : cards,
    [cards, shownFields, term],
  );

  return (
    <aside
      aria-label={`Linked records of ${field.name}`}
      className="flex min-h-0 w-[42%] shrink-0 flex-col border-l bg-muted/30"
    >
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary-10 text-primary">
          <TextSearchIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1 flex flex-row items-center">
          <p className="truncate text-sm font-medium">{field.name}</p>
          <Separator orientation="vertical" className="mx-2 h-3.5 w-px" />
          <p className="truncate text-xs text-muted-foreground flex-1">
            {linked.length} linked.
          </p>
          <Input
            className="w-48"
            type="search"
            placeholder="Search"
            aria-label="Search linked records"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {linked.length === 0 ? (
        <p className="m-auto max-w-56 px-4 text-center text-sm text-muted-foreground">
          Nothing linked yet. Pick records in the link field to preview them
          here.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
          {shownCards.map((card, index) => (
            <LinkedRecordCard
              key={card.id}
              label={card.label}
              record={card.record}
              fields={shownFields}
              texts={card.texts}
              term={term}
              members={members}
              defaultOpen={index === 0}
            />
          ))}
          {shownCards.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No linked record matches “{search.trim()}”.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

/** Values shown as plain text, so a search match can be marked inside them; tags, people and files get a marked row instead. */
const TEXT_VALUE_TYPES: IField["type"][] = [
  "text",
  "long_text",
  "number",
  "currency",
  "date",
  "time",
  "ds_create_time",
];

/** One linked record: its label, opening to every field it has. While searching it stays open and marks what matched. */
function LinkedRecordCard({
  label,
  record,
  fields,
  texts,
  term,
  members,
  defaultOpen = false,
}: ModuleLinkedRecordCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={term !== "" || open}
      onOpenChange={setOpen}
      className="group/card shrink-0 overflow-hidden rounded-lg border bg-background shadow-xs"
    >
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 group-data-[state=open]/card:bg-accent">
        <HighlightText
          text={label}
          term={term}
          className="block min-w-0 flex-1 truncate text-sm font-medium"
        />

        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/card:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t px-3 py-3">
        {record ? (
          <dl className="grid grid-cols-[minmax(0,9rem)_1fr] gap-x-3 gap-y-3 text-sm">
            {fields.map((sourceField, index) => {
              const text = texts[index] ?? "";
              const valueMatch =
                term !== "" && text.toLowerCase().includes(term);
              const asText =
                TEXT_VALUE_TYPES.includes(sourceField.type) && text !== "";
              return (
                <div key={sourceField.objId} className="contents">
                  <dt className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                    <FieldTypeIcon type={sourceField.type} />
                    <HighlightText
                      text={sourceField.name}
                      term={term}
                      className="truncate"
                    />
                  </dt>
                  <dd
                    className={cn(
                      "min-w-0 break-words",
                      valueMatch &&
                        !asText &&
                        "-mx-1 w-fit rounded-md bg-yellow-200 px-1 py-0.5",
                    )}
                  >
                    {asText ? (
                      <HighlightText
                        text={text}
                        term={term}
                        className={
                          sourceField.isNumeric === true ||
                          sourceField.isDateField
                            ? "tabular-nums"
                            : undefined
                        }
                      />
                    ) : (
                      <RecordValueNode
                        field={sourceField}
                        value={recordFieldValue(sourceField, record)}
                        members={members}
                      />
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <p className="py-2 text-center text-sm text-muted-foreground">
            This record isn't available any more.
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
