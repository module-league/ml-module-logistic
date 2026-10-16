import { useCallback, useMemo, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { format } from "date-fns";
import { cn } from "@moduleleague/ui";
import { parseFieldDate } from "@/lib/dateHelper";
import { toRecordText } from "@/lib/recordTextHelper";
import { recordFieldValue } from "@/module/page/modulePage.utils";
import { SelectionNode } from "@/components/custom/RecordValueNode";
import { useDashboard } from "../dashboard.context";
import {
  daysLate,
  groupColor,
  groupRecords,
  recordTitle,
  titleFieldOf,
} from "../moduleDashboard.utils";
import type {
  DashboardRecordGroup,
  DashboardWidgetBodyProps,
} from "../moduleDashboard.types";
import {
  DashboardWidgetFrame,
  DashboardWidgetMessage,
} from "./DashboardWidgetFrame";

/** The droppable id of the column for records without a value; dnd-kit ids can't be empty. */
const NO_VALUE = "__none";
const KEYBOARD_DRAG = {
  keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
};

interface BoardCardProps {
  record: ISidebarRecord;
  title: string;
  subtitle: string;
  badge?: IFieldDropDownValue;
  dateText?: string;
  lateDays: number;
  draggable: boolean;
  onOpen?: () => void;
}

/**
 * Records in one column per option of a single select; a card dropped in another column takes that option.
 * Space picks a card up and drops it, Enter opens it.
 */
export function BoardWidget({
  widget,
  view,
  preview,
}: DashboardWidgetBodyProps) {
  const { members, lookups, now, onOpenRecord, onMoveRecord, onOpenTable } =
    useDashboard();
  const board = widget?.board;
  const groupField = view.fieldById.get(board?.groupFieldId ?? "");
  const titleField = titleFieldOf(view.fields, board?.titleFieldId);
  const subtitleFields = useMemo(
    () =>
      board?.subtitleFieldIds?.flatMap((id) => view.fieldById.get(id) ?? []) ??
      [],
    [board?.subtitleFieldIds, view.fieldById],
  );
  const badgeField = view.fieldById.get(board?.badgeFieldId ?? "");
  const dateField = view.fieldById.get(board?.dateFieldId ?? "");
  const groups = useMemo(
    () => groupRecords(view.records, groupField, members, lookups),
    [view.records, groupField, members, lookups],
  );
  const [expanded, setExpanded] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string>();
  const canDrag =
    !!board?.draggable && !preview && groupField?.type === "single_select";
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, KEYBOARD_DRAG),
  );

  const cardOf = useCallback(
    (record: ISidebarRecord, done: boolean): BoardCardProps => {
      const date = dateField
        ? parseFieldDate(recordFieldValue(dateField, record))
        : undefined;
      return {
        record,
        title: recordTitle(record, titleField, members, lookups),
        subtitle: subtitleFields
          .map((field) =>
            toRecordText(
              field,
              recordFieldValue(field, record),
              members,
              lookups,
            ),
          )
          .filter(Boolean)
          .join(" → "),
        badge: badgeField?.dropDownValues?.find(
          (option) => option?.id === record?.values?.[badgeField.objId],
        ),
        dateText:
          date && dateField
            ? `${dateField.name} ${format(date, "d MMM")}`
            : undefined,
        lateDays: board?.showLate && !done ? daysLate(date, now) : 0,
        draggable: canDrag,
        onOpen: preview
          ? undefined
          : () => onOpenRecord(widget.sidebarId, record.objId),
      };
    },
    [
      dateField,
      titleField,
      members,
      lookups,
      subtitleFields,
      badgeField,
      board?.showLate,
      now,
      canDrag,
      preview,
      onOpenRecord,
      widget.sidebarId,
    ],
  );

  const dragStart = useCallback(
    ({ active }: DragStartEvent) => setDraggingId(String(active.id)),
    [],
  );
  const dragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      setDraggingId(undefined);
      const record = view.records.find((entry) => entry.objId === active.id);
      if (!record || !over || !groupField) return;
      const to = over.id === NO_VALUE ? "" : String(over.id);
      if ((record.values?.[groupField.objId] ?? "") !== to) {
        onMoveRecord(widget.sidebarId, record, groupField.objId, to);
      }
    },
    [view.records, groupField, onMoveRecord, widget.sidebarId],
  );
  const dragging = view.records.find((record) => record.objId === draggingId);
  const toggleExpanded = useCallback(
    (key: string) =>
      setExpanded((current) =>
        current.includes(key)
          ? current.filter((entry) => entry !== key)
          : [...current, key],
      ),
    [],
  );

  return (
    <DashboardWidgetFrame
      title={widget?.label}
      aside={
        !preview &&
        view.source && (
          <button
            type="button"
            onClick={() => onOpenTable(widget.sidebarId)}
            className="cursor-pointer font-medium text-primary hover:underline"
          >
            Open in {view.source.sidebarText}
          </button>
        )
      }
    >
      {!groupField ? (
        <DashboardWidgetMessage>
          Pick a single-select field in this widget's settings to make the
          columns.
        </DashboardWidgetMessage>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={dragStart}
          onDragEnd={dragEnd}
          onDragCancel={() => setDraggingId(undefined)}
        >
          <div className="flex min-w-0 gap-3 overflow-x-auto pb-1">
            {groups.map((group, index) => {
              const done = board?.doneOptionIds?.includes(group.key) ?? false;
              const limit = board?.cardsPerColumn ?? 3;
              const open = expanded.includes(group.key);
              return (
                <BoardColumn
                  key={group.key || NO_VALUE}
                  group={group}
                  color={group.color ?? groupColor(index, group.key)}
                  droppable={canDrag}
                >
                  {(open ? group.records : group.records.slice(0, limit)).map(
                    (record) => (
                      <BoardCard key={record.objId} {...cardOf(record, done)} />
                    ),
                  )}
                  {group.records.length > limit && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(group.key)}
                      className="cursor-pointer rounded-md py-1 text-xs text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      {open
                        ? "Show less"
                        : `+ ${group.records.length - limit} more`}
                    </button>
                  )}
                </BoardColumn>
              );
            })}
          </div>
          {/* On the body: a transformed ancestor would offset the overlay from the pointer and the column under it */}
          {createPortal(
            <DragOverlay>
              {dragging && (
                <BoardCard
                  {...cardOf(
                    dragging,
                    board?.doneOptionIds?.includes(
                      dragging.values?.[groupField.objId] ?? "",
                    ) ?? false,
                  )}
                  draggable={false}
                  overlay
                />
              )}
            </DragOverlay>,
            document.body,
          )}
        </DndContext>
      )}
    </DashboardWidgetFrame>
  );
}

function BoardColumn({
  group,
  color,
  droppable,
  children,
}: {
  group: DashboardRecordGroup;
  color: string;
  droppable: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: group.key || NO_VALUE,
    disabled: !droppable,
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-52 flex-1 flex-col gap-2 rounded-lg bg-muted/60 p-2 transition-colors",
        isOver && "bg-primary-10 ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-center gap-2 px-1 text-xs font-medium">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="min-w-0 flex-1 truncate">{group.label}</span>
        <span className="text-muted-foreground">{group.records.length}</span>
      </div>
      {children}
    </div>
  );
}

function BoardCard({
  record,
  title,
  subtitle,
  badge,
  dateText,
  lateDays,
  draggable,
  onOpen,
  overlay = false,
}: BoardCardProps & { overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: record.objId,
    disabled: !draggable,
  });
  const openOnEnter = (event: KeyboardEvent) => {
    if (event.key === "Enter") onOpen?.();
  };
  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-roledescription={draggable ? "Draggable card" : undefined}
      onClick={onOpen}
      onKeyDown={(event) => {
        listeners?.onKeyDown?.(event);
        openOnEnter(event);
      }}
      className={cn(
        "flex flex-col gap-1 rounded-md border bg-background p-2.5 text-left shadow-xs transition-colors",
        onOpen &&
          "cursor-pointer hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
        lateDays > 0 && "border-red-200 dark:border-red-900/60",
        isDragging && !overlay && "opacity-40",
        overlay && "rotate-1 cursor-grabbing shadow-lg",
      )}
    >
      <span className="truncate text-sm font-medium">{title}</span>
      {subtitle && (
        <span className="truncate text-xs text-muted-foreground">
          {subtitle}
        </span>
      )}
      {(badge || dateText || lateDays > 0) && (
        <span className="mt-1 flex min-w-0 items-center justify-between gap-2 text-xs">
          {badge ? (
            <SelectionNode dropDownValue={badge} className="truncate">
              {badge.value}
            </SelectionNode>
          ) : (
            <span />
          )}
          {lateDays > 0 ? (
            <span className="shrink-0 font-medium text-red-600 dark:text-red-400">
              {lateDays} {lateDays === 1 ? "day" : "days"} late
            </span>
          ) : (
            dateText && (
              <span className="shrink-0 text-muted-foreground">{dateText}</span>
            )
          )}
        </span>
      )}
    </div>
  );
}
