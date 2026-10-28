import { useCallback, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Plus, Search, X } from "lucide-react";
import {
  Button,
  cn,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
} from "@/ui-kit";
import {
  linkCardFields,
  lookupDisplayField,
  lookupRecordsOf,
  parseRecordIds,
  toRecordIdsValue,
} from "@/lib/lookupHelper";
import { linkedRecordLabel, toRecordText } from "@/lib/recordTextHelper";
import { useRecordLookups } from "./RecordLookup.context";
import { RecordLinkCard } from "./RecordLinkCard";
import type {
  RecordLinkCardListProps,
  RecordLinkInputProps,
} from "./RecordLookupInput.types";

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
  const { lookups, sources, onNewLinkedRecord } = useRecordLookups();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const multiple = field.lookupSettings?.multiple ?? true;
  const sourceId = field.lookupSettings?.categoryId;
  const records = useMemo(
    () => lookupRecordsOf(field, lookups),
    [field, lookups],
  );
  const titleField = useMemo(
    () => lookupDisplayField(field, lookups),
    [field, lookups],
  );
  const cardFields = useMemo(
    () => linkCardFields(field, lookups),
    [field, lookups],
  );
  const selectedIds = useMemo(() => parseRecordIds(value), [value]);
  const recordById = useMemo(
    () => new Map(records?.map((record) => [record.objId, record])),
    [records],
  );
  const sourceText = useMemo(
    () =>
      sources.find((source) => source.sidebarId === sourceId)?.sidebarText ??
      "the linked table",
    [sources, sourceId],
  );
  const titleOf = useCallback(
    (record?: ISidebarRecord) =>
      linkedRecordLabel(titleField, record, members, !records),
    [titleField, members, records],
  );
  // Matches the title and every card field, as they read on the card
  const shownRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term === "") return records ?? [];
    return (
      records?.filter((record) =>
        [
          titleOf(record),
          ...cardFields.map((cardField) =>
            toRecordText(cardField, record.values[cardField.objId], members),
          ),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term),
      ) ?? []
    );
  }, [search, records, titleOf, cardFields, members]);

  const toggle = useCallback(
    (recordId: string) => {
      if (!multiple) {
        onChange?.(
          selectedIds.includes(recordId) ? "" : toRecordIdsValue([recordId]),
        );
        setOpen(false);
        return;
      }
      onChange?.(
        toRecordIdsValue(
          selectedIds.includes(recordId)
            ? selectedIds.filter((selectedId) => selectedId !== recordId)
            : [...selectedIds, recordId],
        ),
      );
    },
    [multiple, selectedIds, onChange],
  );
  const changeOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) {
        setSearch("");
        onBlur?.();
      }
    },
    [onBlur],
  );
  const addNew = useCallback(() => {
    if (sourceId == null || sourceId === "") return;
    changeOpen(false);
    onNewLinkedRecord?.(sourceId, (added) =>
      onChange?.(
        toRecordIdsValue(
          multiple
            ? [...selectedIds.filter((id) => id !== added.objId), added.objId]
            : [added.objId],
        ),
      ),
    );
  }, [
    sourceId,
    changeOpen,
    onNewLinkedRecord,
    onChange,
    multiple,
    selectedIds,
  ]);

  return (
    <div
      className={cn("flex w-full min-w-0 flex-col gap-2", className)}
      style={style}
    >
      {selectedIds.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-2">
          {selectedIds.map((recordId) => {
            const record = recordById.get(recordId);
            const title = titleOf(record);
            return (
              <RecordLinkCard
                key={recordId}
                title={title}
                record={record}
                fields={cardFields}
                members={members}
                action={
                  disabled !== true && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Unlink ${title}`}
                      className="-my-1 -mr-1 text-muted-foreground hover:text-foreground"
                      startIcon={<X size={13} />}
                      onClick={() => toggle(recordId)}
                    />
                  )
                }
              />
            );
          })}
        </div>
      )}
      <Popover open={open} onOpenChange={changeOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            className="w-full"
          >
            <Plus className="size-4 shrink-0" />
            {placeholder ??
              (multiple
                ? `Link ${selectedIds.length > 0 ? "another" : "a"} ${sourceText} record`
                : selectedIds.length > 0
                  ? `Change the ${sourceText} record`
                  : `Link a ${sourceText} record`)}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="flex w-(--radix-popover-trigger-width) min-w-72 flex-col gap-2 p-2"
        >
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                aria-label={`Search ${sourceText}`}
                placeholder={`Search ${sourceText}`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
            {onNewLinkedRecord && sourceId != null && sourceId !== "" && (
              <Button
                variant="outline"
                size="sm"
                aria-label={`New ${sourceText} record`}
                title={`New ${sourceText} record`}
                className="h-8 shrink-0"
                startIcon={<Plus size={14} />}
                onClick={addNew}
              >
                New
              </Button>
            )}
          </div>
          {!records ? (
            <p className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Spinner className="size-3.5" />
              Loading {sourceText}…
            </p>
          ) : shownRecords.length > 0 ? (
            <RecordLinkCardList
              label={`${sourceText} records`}
              records={shownRecords}
              selectedIds={selectedIds}
              multiple={multiple}
              titleOf={titleOf}
              fields={cardFields}
              members={members}
              onSelect={toggle}
            />
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">
              {records.length > 0
                ? `No ${sourceText} record matches “${search.trim()}”.`
                : `No records in ${sourceText} yet.`}
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** The cards of the open list; only the ones in view are rendered, so a large linked sidebar stays fast. */
function RecordLinkCardList({
  label,
  records,
  selectedIds,
  multiple,
  titleOf,
  fields,
  members,
  onSelect,
}: RecordLinkCardListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Keeps only the cards in view mounted; measureElement corrects the estimate once a card renders
  const virtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 48 + fields.length * 20,
    getItemKey: (index) => records[index]?.objId ?? index,
    gap: 6,
    overscan: 4,
  });

  return (
    <div
      ref={scrollRef}
      role="listbox"
      aria-label={label}
      aria-multiselectable={multiple}
      className="max-h-80 overflow-y-auto"
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const record = records[item.index];
          if (!record) return null;
          return (
            <div
              key={item.key}
              role="none"
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <RecordLinkCard
                title={titleOf(record)}
                record={record}
                fields={fields}
                members={members}
                selected={selectedIds.includes(record.objId)}
                onSelect={() => onSelect(record.objId)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
