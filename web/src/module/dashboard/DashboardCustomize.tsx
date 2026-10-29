import { useCallback, useMemo, useState, type DragEvent } from "react";
import { Plus, SlidersHorizontal, X } from "lucide-react";
import {
  Button,
  cn,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  toast,
} from "@moduleleague/ui";
import { errorParser } from "@/hooks/useErrorParser";
import { useCurrentNavItem } from "@/module/shell/navItem.context";
import { SortableHandle, SortableList } from "@/components/custom/SortableList";
import { useSortableRow } from "@/hooks/useSortableRow";
import {
  DATE_RANGES,
  describeWidget,
  isDateField,
  newWidget,
  singular,
  tableFields,
  WIDGET_TYPES,
  WIDGET_WIDTHS,
  WIDTH_CLASS,
} from "./moduleDashboard.utils";
import type { DashboardCustomizeProps } from "./moduleDashboard.types";
import { DashboardWidget } from "./widgets/DashboardWidget";
import {
  DashboardSegmented,
  SettingsField,
} from "./settings/DashboardControls";
import { nonEmpty } from "@/lib/stringHelper";

/** The data type a widget type carries while dragged from the Add widget panel. */
const WIDGET_DRAG_TYPE = "application/x-dashboard-widget";
const NONE = "__none";

/**
 * The page in Customize mode: page settings on top, widgets as cards to drag into order and size,
 * and the Add widget panel to click or drag new widgets from. Nothing is saved until Save layout.
 */
export function DashboardCustomize({
  data,
  selectedId,
  onSelect,
}: DashboardCustomizeProps) {
  const item = useCurrentNavItem();
  const { layout, sources, onLayoutChange } = data;
  const [dropping, setDropping] = useState(false);
  const sourceById = useMemo(
    () => new Map(sources.map((source) => [source.sidebarId, source])),
    [sources],
  );
  // Every date field of every table, for "Date range applies to"
  const rangeOptions = useMemo(
    () =>
      sources.flatMap((source) =>
        tableFields(source)
          .filter(isDateField)
          .map((field) => ({
            value: `${source.sidebarId}::${field.objId}`,
            label: `${source.sidebarText} · ${field.name}`,
          })),
      ),
    [sources],
  );
  const set = useCallback(
    (patch: Partial<ISidebarDashboard>) =>
      onLayoutChange((current) => ({ ...current, ...patch })),
    [onLayoutChange],
  );
  const setWidget = useCallback(
    (id: string, patch: Partial<IDashboardWidget>) =>
      onLayoutChange((current) => ({
        ...current,
        widgets:
          current.widgets?.map((widget) =>
            widget.id === id ? { ...widget, ...patch } : widget,
          ) ?? [],
      })),
    [onLayoutChange],
  );
  const addWidget = useCallback(
    (type: IDashboardWidgetType) => {
      const widget = newWidget(
        type,
        sources,
        layout.rangeSidebarId ?? layout.widgets?.[0]?.sidebarId,
      );
      onLayoutChange((current) => ({
        ...current,
        widgets: [...current.widgets, widget],
      }));
      onSelect(widget.id);
    },
    [sources, layout.rangeSidebarId, layout.widgets, onLayoutChange, onSelect],
  );
  const drop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      setDropping(false);
      const type = event.dataTransfer.getData(
        WIDGET_DRAG_TYPE,
      ) as IDashboardWidgetType;
      if (WIDGET_TYPES.some((entry) => entry.type === type)) addWidget(type);
    },
    [addWidget],
  );
  const dragOver = useCallback((event: DragEvent) => {
    if (!event.dataTransfer.types.includes(WIDGET_DRAG_TYPE)) return;
    event.preventDefault();
    setDropping(true);
  }, []);
  const save = useCallback(async () => {
    try {
      await data.onSaveLayout();
      toast.success("Layout saved");
    } catch (error: unknown) {
      toast.error("Couldn't save the layout", {
        description: errorParser(error)?.message,
      });
    }
  }, [data]);
  const newSource = sourceById.get(layout.newRecordSidebarId ?? "");
  // Hidden forms aren't offered, unless one is already picked
  const formOptions = useMemo(
    () =>
      data.forms.filter(
        (form) =>
          sourceById.has(form.sidebarId) &&
          (!form.isHidden || form.objId === layout.newRecordFormId),
      ),
    [data.forms, sourceById, layout.newRecordFormId],
  );
  const pickForm = useCallback(
    (value: string) => {
      const form = formOptions.find((entry) => entry.objId === value);
      set(
        form
          ? { newRecordFormId: form.objId, newRecordSidebarId: form.sidebarId }
          : { newRecordFormId: undefined },
      );
    },
    [formOptions, set],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-page-header shrink-0 items-center justify-between gap-3 border-b bg-primary-10 px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-primary">
            Customizing {nonEmpty(layout.title) ?? item.sidebarText} overview
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Drag widgets to reorder. Each widget reads any table and field in
            this module.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={data.onCancelCustomize}
            disabled={data.saving}
          >
            Cancel
          </Button>
          <Button size="xs" onClick={() => void save()} disabled={data.saving}>
            {data.saving && <Spinner className="size-3.5" />}
            {data.saving ? "Saving…" : "Save layout"}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SettingsField label="Page title" htmlFor="dashboard-title">
              <Input
                id="dashboard-title"
                value={layout.title ?? ""}
                maxLength={80}
                placeholder={item.sidebarText}
                onChange={(event) => set({ title: event.target.value })}
              />
            </SettingsField>
            <SettingsField label="Subtitle" htmlFor="dashboard-description">
              <Input
                id="dashboard-description"
                value={layout.description ?? ""}
                maxLength={200}
                placeholder={
                  nonEmpty(item.sidebarDesc) ?? "A line under the title"
                }
                onChange={(event) => set({ description: event.target.value })}
              />
            </SettingsField>
            <SettingsField label="Default date range" htmlFor="dashboard-range">
              <Select
                value={layout.dateRange}
                onValueChange={(dateRange) =>
                  set({ dateRange: dateRange as IDashboardDateRange })
                }
              >
                <SelectTrigger id="dashboard-range" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {DATE_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsField>
            <SettingsField
              label="Date range applies to"
              htmlFor="dashboard-range-field"
            >
              <Select
                value={
                  layout.rangeSidebarId != null &&
                  layout.rangeSidebarId !== "" &&
                  layout.rangeFieldId != null &&
                  layout.rangeFieldId !== ""
                    ? `${layout.rangeSidebarId}::${layout.rangeFieldId}`
                    : NONE
                }
                onValueChange={(value) => {
                  const [rangeSidebarId, rangeFieldId] =
                    value === NONE ? [] : value.split("::");
                  set({ rangeSidebarId, rangeFieldId });
                }}
              >
                <SelectTrigger id="dashboard-range-field" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  searchable={rangeOptions.length > 8}
                >
                  <SelectItem value={NONE} textValue="Nothing">
                    <span className="text-muted-foreground">
                      Nothing: hide the range
                    </span>
                  </SelectItem>
                  {rangeOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      textValue={option.label}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsField>
            <SettingsField
              label="New button adds to"
              htmlFor="dashboard-new-table"
            >
              <Select
                value={layout.newRecordSidebarId ?? NONE}
                onValueChange={(value) =>
                  set({
                    newRecordSidebarId: value === NONE ? undefined : value,
                    newRecordFormId: undefined,
                  })
                }
              >
                <SelectTrigger id="dashboard-new-table" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={NONE} textValue="No New button">
                    <span className="text-muted-foreground">No New button</span>
                  </SelectItem>
                  {sources.map((source) => (
                    <SelectItem key={source.sidebarId} value={source.sidebarId}>
                      {source.sidebarText}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsField>
            <SettingsField label="New button form" htmlFor="dashboard-new-form">
              <Select
                value={layout.newRecordFormId ?? NONE}
                onValueChange={pickForm}
                disabled={data.formsState.isLoading}
              >
                <SelectTrigger id="dashboard-new-form" className="w-full">
                  {data.formsState.isLoading === true ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Spinner className="size-3.5" />
                      Loading forms…
                    </span>
                  ) : (
                    <SelectValue />
                  )}
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  searchable={formOptions.length > 8}
                >
                  <SelectItem value={NONE} textValue="Every field">
                    <span className="text-muted-foreground">
                      No form: every field
                    </span>
                  </SelectItem>
                  {formOptions.map((form) => {
                    const table = sourceById.get(form.sidebarId)?.sidebarText;
                    return (
                      <SelectItem
                        key={form.objId}
                        value={form.objId}
                        textValue={`${form.formTitle} ${table}`}
                      >
                        {form.formTitle}
                        <span className="text-xs text-muted-foreground">
                          {table}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {data.formsState.error != null && (
                <button
                  type="button"
                  onClick={data.formsState.onRetry}
                  className="cursor-pointer self-start text-xs text-destructive hover:underline"
                >
                  Couldn't load the forms. Retry
                </button>
              )}
            </SettingsField>
            <SettingsField
              label="New button label"
              htmlFor="dashboard-new-label"
            >
              <Input
                id="dashboard-new-label"
                value={layout.newRecordLabel ?? ""}
                maxLength={40}
                disabled={!newSource}
                placeholder={
                  newSource
                    ? `New ${singular(newSource.sidebarText)}`
                    : "Pick a table first"
                }
                onChange={(event) =>
                  set({ newRecordLabel: event.target.value })
                }
              />
            </SettingsField>
          </div>

          <SortableList
            grid
            ids={layout.widgets?.map((widget) => widget.id) ?? []}
            onReorder={(ids) =>
              set({
                widgets: ids.flatMap(
                  (id) =>
                    layout.widgets?.find((widget) => widget.id === id) ?? [],
                ),
              })
            }
          >
            <div className="grid grid-cols-12 gap-3">
              {layout.widgets?.map((widget) => (
                <WidgetPlaceholder
                  key={widget.id}
                  widget={widget}
                  description={describeWidget(
                    widget,
                    sourceById.get(widget.sidebarId),
                  )}
                  selected={widget.id === selectedId}
                  onOpenSettings={() => onSelect(widget.id)}
                  onRemove={() =>
                    set({
                      widgets:
                        layout.widgets?.filter(
                          (entry) => entry.id !== widget.id,
                        ) ?? [],
                    })
                  }
                  onWidth={(width) => setWidget(widget.id, { width })}
                />
              ))}
            </div>
          </SortableList>

          <div
            onDragOver={dragOver}
            onDragLeave={() => setDropping(false)}
            onDrop={drop}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 text-sm text-muted-foreground transition-colors",
              dropping && "border-primary bg-primary-10 text-primary",
            )}
          >
            <Plus className="size-4" />
            Drop a widget here, or pick one from Add widget
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-3 rounded-xl border bg-card p-4 lg:sticky lg:top-0 lg:w-80">
          <div>
            <h2 className="text-sm font-semibold">Add widget</h2>
            <p className="text-xs text-muted-foreground">
              Fields are filtered by type, so a widget only offers fields it can
              use.
            </p>
          </div>
          {WIDGET_TYPES.map((entry) => {
            const available = sources.some((source) =>
              entry.accepts(source, sources),
            );
            const Icon = entry.icon;
            return (
              <button
                key={entry.type}
                type="button"
                draggable={available}
                disabled={!available}
                onDragStart={(event) => {
                  event.dataTransfer.setData(WIDGET_DRAG_TYPE, entry.type);
                  event.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => addWidget(entry.type)}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-primary-10 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-transparent"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-10 text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{entry.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.description}
                  </span>
                  <span className="text-xs text-primary">
                    {available
                      ? entry.requirement
                      : `No table yet: ${entry.requirement.toLowerCase()}`}
                  </span>
                </span>
              </button>
            );
          })}
        </aside>
      </div>
    </div>
  );
}

/** A widget in Customize mode, showing its live data: drag it by the grip, size it, open its settings or remove it. */
function WidgetPlaceholder({
  widget,
  description,
  selected,
  onOpenSettings,
  onRemove,
  onWidth,
}: {
  widget: IDashboardWidget;
  description: string;
  selected: boolean;
  onOpenSettings: () => void;
  onRemove: () => void;
  onWidth: (width: IDashboardWidgetWidth) => void;
}) {
  const { ref, style, isDragging, handle } = useSortableRow(
    widget.id,
    false,
    true,
  );
  const label = nonEmpty(widget.label) ?? "Untitled widget";
  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        WIDTH_CLASS[widget.width],
        "flex min-w-0 flex-col gap-2 rounded-xl border bg-muted/40 p-2",
        selected && "border-primary ring-2 ring-primary/20",
        isDragging && "relative z-10 shadow-lg",
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <SortableHandle handle={handle} label={label} />
        <p
          className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
          title={description}
        >
          {description}
        </p>
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label={`Settings for ${label}`}
          className="bg-primary-10 text-primary hover:bg-primary-10/80"
          startIcon={<SlidersHorizontal size={14} />}
          onClick={onOpenSettings}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${label}`}
          className="text-muted-foreground hover:text-foreground"
          startIcon={<X size={14} />}
          onClick={onRemove}
        />
      </div>
      <div className="min-w-0 flex-1">
        <DashboardWidget widget={widget} preview />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        Width
        <DashboardSegmented
          label={`Width of ${label}`}
          value={widget.width}
          options={WIDGET_WIDTHS}
          onChange={onWidth}
        />
      </div>
    </div>
  );
}
