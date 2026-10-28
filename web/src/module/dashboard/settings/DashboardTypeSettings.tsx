import { useCallback, useMemo, type ComponentType } from "react";
import { Plus, X } from "lucide-react";
import { Button, cn, Input, Switch } from "@moduleleague/ui";
import { SortableHandle, SortableList } from "@/components/custom/SortableList";
import { useSortableRow } from "@/hooks/useSortableRow";
import { canShowInLookup } from "@/lib/lookupHelper";
import {
  CALCULATIONS,
  isDateField,
  isFilterField,
  isGroupField,
  isNumberField,
  isSelectField,
  isShowableField,
  pointSources,
} from "../moduleDashboard.utils";
import type { DashboardTypeSettingsProps } from "../moduleDashboard.types";
import { DashboardFilterEditor } from "./DashboardFilterEditor";
import {
  DashboardFieldList,
  DashboardFieldSelect,
  DashboardSegmented,
  SettingsField,
} from "./DashboardControls";
import { nonEmpty } from "@/lib/stringHelper";

const MAX_LIST_COLUMNS = 6;
const SPANS: Record<IDashboardTrend["bucket"], number[]> = {
  day: [7, 14, 30],
  week: [8, 12, 26],
  month: [6, 12, 24],
};
const asOptions = (values: number[]) =>
  values.map((value) => ({ value: String(value), label: String(value) }));

/** A toggle with its label on the left. */
function SettingsSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** Count records, or sum, average, min or max of a number field picked from the list. */
function MeasureSettings({
  measure,
  fields,
  onChange,
}: {
  measure: IDashboardMeasure;
  fields: ISidebarField[];
  onChange: (measure: IDashboardMeasure) => void;
}) {
  return (
    <>
      <SettingsField label="Calculate">
        <DashboardSegmented
          label="Calculate"
          value={measure.calculation}
          options={CALCULATIONS}
          onChange={(calculation) =>
            onChange({
              calculation,
              fieldId:
                calculation === "count"
                  ? undefined
                  : (measure.fieldId ?? fields.find(isNumberField)?.objId),
            })
          }
        />
      </SettingsField>
      {measure.calculation !== "count" && (
        <SettingsField label="Field" hint="number fields only">
          <DashboardFieldList
            label="Number field"
            fields={fields}
            value={measure.fieldId}
            onChange={(fieldId) => onChange({ ...measure, fieldId })}
            reasonOf={(field) =>
              isNumberField(field) ? undefined : "not a number"
            }
          />
        </SettingsField>
      )}
    </>
  );
}

function MetricData({ widget, fields, onChange }: DashboardTypeSettingsProps) {
  const metric = widget.metric ?? {
    calculation: "count",
    caption: "auto",
    tone: "none",
  };
  return (
    <MeasureSettings
      measure={metric}
      fields={fields}
      onChange={(measure) => onChange({ metric: { ...metric, ...measure } })}
    />
  );
}

const CAPTIONS: { value: IDashboardMetric["caption"]; label: string }[] = [
  { value: "auto", label: "Describe it" },
  { value: "count", label: "Record count" },
  { value: "split", label: "Split by" },
  { value: "next", label: "Next by date" },
  { value: "custom", label: "Own text" },
];
const TONES: { value: IDashboardMetric["tone"]; label: string }[] = [
  { value: "none", label: "None" },
  { value: "red", label: "Red" },
  { value: "amber", label: "Amber" },
  { value: "green", label: "Green" },
];

/** The metric's unit, the line under its number and the colour it takes while above zero. */
export function MetricDisplay({
  widget,
  fields,
  onChange,
}: DashboardTypeSettingsProps) {
  const metric = widget.metric ?? {
    calculation: "count",
    caption: "auto",
    tone: "none",
  };
  const set = (patch: Partial<IDashboardMetric>) =>
    onChange({ metric: { ...metric, ...patch } });
  return (
    <>
      <SettingsField label="Unit" htmlFor="widget-unit" hint="after the number">
        <Input
          id="widget-unit"
          value={metric.unit ?? ""}
          maxLength={12}
          placeholder="e.g. kg"
          onChange={(event) => set({ unit: event.target.value })}
        />
      </SettingsField>
      <SettingsField label="Line under the number">
        <DashboardSegmented
          label="Line under the number"
          value={metric.caption}
          options={CAPTIONS}
          onChange={(caption) =>
            set({
              caption,
              splitFieldId:
                metric.splitFieldId ?? fields.find(isSelectField)?.objId,
              nextFieldId:
                metric.nextFieldId ?? fields.find(isDateField)?.objId,
            })
          }
        />
      </SettingsField>
      {metric.caption === "split" && (
        <DashboardFieldSelect
          fields={fields}
          accepts={isSelectField}
          value={metric.splitFieldId}
          onChange={(splitFieldId) => set({ splitFieldId })}
          placeholder="A single-select field"
        />
      )}
      {metric.caption === "next" && (
        <DashboardFieldSelect
          fields={fields}
          accepts={isDateField}
          value={metric.nextFieldId}
          onChange={(nextFieldId) => set({ nextFieldId })}
          placeholder="A date field"
        />
      )}
      {metric.caption === "custom" && (
        <Input
          aria-label="Own text"
          value={metric.captionText ?? ""}
          maxLength={80}
          placeholder="e.g. ETA passed, not delivered"
          onChange={(event) => set({ captionText: event.target.value })}
        />
      )}
      <SettingsField label="Highlight" hint="while the number is above zero">
        <DashboardSegmented
          label="Highlight"
          value={metric.tone}
          options={TONES}
          onChange={(tone) => set({ tone })}
        />
      </SettingsField>
    </>
  );
}

function BoardData({ widget, fields, onChange }: DashboardTypeSettingsProps) {
  const board: IDashboardBoard = widget.board ?? {
    subtitleFieldIds: [],
    showLate: true,
    doneOptionIds: [],
    cardsPerColumn: 3,
    draggable: true,
  };
  const set = (patch: Partial<IDashboardBoard>) =>
    onChange({ board: { ...board, ...patch } });
  const groupField = fields.find((field) => field.objId === board.groupFieldId);
  const [firstSubtitle, secondSubtitle] = board.subtitleFieldIds;
  const setSubtitle = (index: number, fieldId?: string) => {
    const next: (string | undefined)[] = [firstSubtitle, secondSubtitle];
    next[index] = fieldId;
    set({
      subtitleFieldIds: next.filter(
        (id): id is string => id != null && id !== "",
      ),
    });
  };
  return (
    <>
      <SettingsField label="Columns" hint="one per option">
        <DashboardFieldSelect
          fields={fields}
          accepts={isSelectField}
          value={board.groupFieldId}
          onChange={(groupFieldId) => set({ groupFieldId, doneOptionIds: [] })}
          placeholder="A single-select field"
        />
      </SettingsField>
      <SettingsField label="Card title">
        <DashboardFieldSelect
          fields={fields}
          accepts={canShowInLookup}
          value={board.titleFieldId}
          onChange={(titleFieldId) => set({ titleFieldId })}
          placeholder="Primary field"
        />
      </SettingsField>
      <SettingsField label="Under the title" hint="joined by →">
        <div className="grid grid-cols-2 gap-2">
          <DashboardFieldSelect
            fields={fields}
            accepts={isShowableField}
            value={firstSubtitle}
            onChange={(fieldId) => setSubtitle(0, fieldId)}
            noneLabel="Nothing"
          />
          <DashboardFieldSelect
            fields={fields}
            accepts={isShowableField}
            value={secondSubtitle}
            onChange={(fieldId) => setSubtitle(1, fieldId)}
            noneLabel="Nothing"
          />
        </div>
      </SettingsField>
      <div className="grid grid-cols-2 gap-2">
        <SettingsField label="Badge">
          <DashboardFieldSelect
            fields={fields}
            accepts={(field) =>
              isSelectField(field) && field.objId !== board.groupFieldId
            }
            value={board.badgeFieldId}
            onChange={(badgeFieldId) => set({ badgeFieldId })}
            noneLabel="No badge"
          />
        </SettingsField>
        <SettingsField label="Date">
          <DashboardFieldSelect
            fields={fields}
            accepts={isDateField}
            value={board.dateFieldId}
            onChange={(dateFieldId) => set({ dateFieldId })}
            noneLabel="No date"
          />
        </SettingsField>
      </div>
      {board.dateFieldId != null && board.dateFieldId !== "" && (
        <SettingsSwitch
          label="Mark cards late once the date has passed"
          checked={board.showLate}
          onChange={(showLate) => set({ showLate })}
        />
      )}
      {board.dateFieldId != null &&
        board.dateFieldId !== "" &&
        board.showLate &&
        groupField?.dropDownValues.length != null &&
        groupField.dropDownValues.length > 0 && (
          <SettingsField label="Never late in">
            <div className="flex flex-wrap gap-1">
              {groupField.dropDownValues.map((option) => {
                const done = board.doneOptionIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={done}
                    onClick={() =>
                      set({
                        doneOptionIds: done
                          ? board.doneOptionIds.filter((id) => id !== option.id)
                          : [...board.doneOptionIds, option.id],
                      })
                    }
                    className={cn(
                      "cursor-pointer rounded-md border px-2 py-0.5 text-xs",
                      done
                        ? "border-primary bg-primary-10 text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.value}
                  </button>
                );
              })}
            </div>
          </SettingsField>
        )}
      <SettingsField label="Cards per column" hint="then it scrolls">
        <DashboardSegmented
          label="Cards per column"
          value={String(board.cardsPerColumn)}
          options={asOptions([2, 3, 5])}
          onChange={(value) => set({ cardsPerColumn: Number(value) })}
        />
      </SettingsField>
      <SettingsSwitch
        label="Drag cards between columns"
        checked={board.draggable}
        onChange={(draggable) => set({ draggable })}
      />
    </>
  );
}

/** One column of the list: a field, and an optional second one shown after an arrow. */
function ListColumnRow({
  column,
  index,
  fields,
  takenIds,
  onChange,
  onRemove,
}: {
  column: IDashboardListColumn;
  index: number;
  fields: ISidebarField[];
  takenIds: string[];
  onChange: (column: IDashboardListColumn) => void;
  onRemove: () => void;
}) {
  const { ref, style, isDragging, handle } = useSortableRow(column.fieldId);
  const field = fields.find((entry) => entry.objId === column.fieldId);
  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-1.5 rounded-lg bg-background",
        isDragging && "relative z-10 shadow-md",
      )}
    >
      <SortableHandle
        handle={handle}
        label={field?.name ?? `column ${index + 1}`}
      />
      <DashboardFieldSelect
        fields={fields}
        accepts={(entry) =>
          isFilterField(entry) &&
          (entry.objId === column.fieldId || !takenIds.includes(entry.objId))
        }
        value={column.fieldId}
        onChange={(fieldId) => {
          if (fieldId != null && fieldId !== "")
            onChange({ ...column, fieldId });
        }}
      />
      <DashboardFieldSelect
        fields={fields}
        accepts={isShowableField}
        value={column.toFieldId}
        onChange={(toFieldId) => onChange({ ...column, toFieldId })}
        noneLabel="→ Nothing"
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove column ${field?.name ?? index + 1}`}
        className="text-muted-foreground hover:text-foreground"
        startIcon={<X size={14} />}
        onClick={onRemove}
      />
    </div>
  );
}

function ListData({ widget, fields, onChange }: DashboardTypeSettingsProps) {
  const list = useMemo<IDashboardList>(
    () => widget.list ?? { columns: [] },
    [widget.list],
  );
  const set = useCallback(
    (patch: Partial<IDashboardList>) =>
      onChange({ list: { ...list, ...patch } }),
    [list, onChange],
  );
  const ids = useMemo(
    () => list.columns.map((column) => column.fieldId),
    [list.columns],
  );
  const nextField = fields.find(
    (field) => isFilterField(field) && !ids.includes(field.objId),
  );
  return (
    <>
      <SettingsField label="Columns" hint={`up to ${MAX_LIST_COLUMNS}`}>
        <div className="flex flex-col gap-1.5">
          <SortableList
            ids={ids}
            onReorder={(order) =>
              set({
                columns: order.flatMap(
                  (id) =>
                    list.columns.find((column) => column.fieldId === id) ?? [],
                ),
              })
            }
          >
            {list.columns.map((column, index) => (
              <ListColumnRow
                key={column.fieldId}
                column={column}
                index={index}
                fields={fields}
                takenIds={ids}
                onChange={(next) =>
                  set({
                    columns: list.columns.map((entry, at) =>
                      at === index ? next : entry,
                    ),
                  })
                }
                onRemove={() =>
                  set({ columns: list.columns.filter((_, at) => at !== index) })
                }
              />
            ))}
          </SortableList>
          <Button
            variant="ghost"
            size="xs"
            className="w-fit text-primary"
            startIcon={<Plus size={13} />}
            disabled={!nextField || list.columns.length >= MAX_LIST_COLUMNS}
            onClick={() =>
              nextField &&
              set({ columns: [...list.columns, { fieldId: nextField.objId }] })
            }
          >
            Add column
          </Button>
        </div>
      </SettingsField>
    </>
  );
}

function BreakdownData({
  widget,
  fields,
  onChange,
}: DashboardTypeSettingsProps) {
  const breakdown: IDashboardBreakdown = widget.breakdown ?? {
    calculation: "count",
    style: "bars",
    limit: 6,
  };
  const set = (patch: Partial<IDashboardBreakdown>) =>
    onChange({ breakdown: { ...breakdown, ...patch } });
  return (
    <>
      <SettingsField
        label="Split by"
        hint="select, member, checkbox or link field"
      >
        <DashboardFieldSelect
          fields={fields}
          accepts={isGroupField}
          value={breakdown.groupFieldId}
          onChange={(groupFieldId) => set({ groupFieldId })}
        />
      </SettingsField>
      <MeasureSettings measure={breakdown} fields={fields} onChange={set} />
      <SettingsField label="Show as">
        <DashboardSegmented
          label="Show as"
          value={breakdown.style}
          options={[
            { value: "bars", label: "Bars" },
            { value: "stacked", label: "Stacked bar" },
          ]}
          onChange={(style) => set({ style })}
        />
      </SettingsField>
      {breakdown.style === "bars" && (
        <SettingsField label="Biggest" hint="groups shown">
          <DashboardSegmented
            label="Biggest groups shown"
            value={String(breakdown.limit)}
            options={asOptions([3, 6, 10, 20])}
            onChange={(value) => set({ limit: Number(value) })}
          />
        </SettingsField>
      )}
    </>
  );
}

function TrendData({ widget, fields, onChange }: DashboardTypeSettingsProps) {
  const trend: IDashboardTrend = widget.trend ?? {
    calculation: "count",
    bucket: "week",
    span: 12,
    chart: "bar",
  };
  const set = (patch: Partial<IDashboardTrend>) =>
    onChange({ trend: { ...trend, ...patch } });
  return (
    <>
      <SettingsField label="Date">
        <DashboardFieldSelect
          fields={fields}
          accepts={isDateField}
          value={trend.dateFieldId}
          onChange={(dateFieldId) => set({ dateFieldId })}
        />
      </SettingsField>
      <MeasureSettings measure={trend} fields={fields} onChange={set} />
      <SettingsField label="One bar per">
        <DashboardSegmented
          label="One bar per"
          value={trend.bucket}
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
          ]}
          onChange={(bucket) => set({ bucket, span: SPANS[bucket][1] })}
        />
      </SettingsField>
      <SettingsField label="How many" hint="ending with the current one">
        <DashboardSegmented
          label="How many"
          value={String(trend.span)}
          options={asOptions(SPANS[trend.bucket])}
          onChange={(value) => set({ span: Number(value) })}
        />
      </SettingsField>
      <SettingsField label="Chart">
        <DashboardSegmented
          label="Chart"
          value={trend.chart}
          options={[
            { value: "bar", label: "Bars" },
            { value: "line", label: "Line" },
          ]}
          onChange={(chart) => set({ chart })}
        />
      </SettingsField>
    </>
  );
}

/** Where a map point comes from, and its latitude and longitude fields there. */
function MapPointSettings({
  label,
  point,
  options,
  optional,
  onChange,
}: {
  label: string;
  point?: IDashboardMapPoint;
  options: ReturnType<typeof pointSources>;
  optional?: boolean;
  onChange: (point?: IDashboardMapPoint) => void;
}) {
  const current = options.find(
    (option) => option.linkFieldId === point?.linkFieldId,
  );
  const sourceKey = (linkFieldId?: string) => linkFieldId ?? "own";
  return (
    <SettingsField label={label}>
      <DashboardSegmented
        label={label}
        value={point ? sourceKey(point.linkFieldId) : "none"}
        options={[
          ...(optional === true ? [{ value: "none", label: "No route" }] : []),
          ...options.map((option) => ({
            value: sourceKey(option.linkFieldId),
            label: option.label,
          })),
        ]}
        onChange={(key) => {
          const option = options.find(
            (entry) => sourceKey(entry.linkFieldId) === key,
          );
          onChange(
            option && {
              linkFieldId: option.linkFieldId,
              latFieldId: option.fields[0]?.objId,
              lngFieldId: option.fields[1]?.objId,
            },
          );
        }}
      />
      {point && current && (
        <div className="grid grid-cols-2 gap-2">
          <DashboardFieldSelect
            fields={current.fields}
            value={point.latFieldId}
            onChange={(latFieldId) => onChange({ ...point, latFieldId })}
            placeholder="Latitude"
          />
          <DashboardFieldSelect
            fields={current.fields}
            value={point.lngFieldId}
            onChange={(lngFieldId) => onChange({ ...point, lngFieldId })}
            placeholder="Longitude"
          />
        </div>
      )}
    </SettingsField>
  );
}

function MapData({
  widget,
  fields,
  sources,
  onChange,
}: DashboardTypeSettingsProps) {
  const map: IDashboardMap = widget.map ?? { from: {} };
  const options = useMemo(
    () => pointSources(fields, sources),
    [fields, sources],
  );
  const set = (patch: Partial<IDashboardMap>) =>
    onChange({ map: { ...map, ...patch } });
  if (options.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        This table has no pair of number fields for latitude and longitude, and
        links to no table that has.
      </p>
    );
  }
  return (
    <>
      <MapPointSettings
        label="Pin at"
        point={map.from}
        options={options}
        onChange={(from) => set({ from: from ?? {} })}
      />
      <MapPointSettings
        label="Route to"
        point={map.to}
        options={options}
        optional
        onChange={(to) => set({ to })}
      />
      <SettingsField label="Pin label">
        <DashboardFieldSelect
          fields={fields}
          accepts={canShowInLookup}
          value={map.titleFieldId}
          onChange={(titleFieldId) => set({ titleFieldId })}
          placeholder="Primary field"
        />
      </SettingsField>
    </>
  );
}

function AttentionData({
  widget,
  fields,
  members,
  onChange,
}: DashboardTypeSettingsProps) {
  const attention: IDashboardAttention = widget.attention ?? { rules: [] };
  const set = (patch: Partial<IDashboardAttention>) =>
    onChange({ attention: { ...attention, ...patch } });
  const setRule = (index: number, patch: Partial<IDashboardAttentionRule>) =>
    set({
      rules: attention.rules.map((rule, at) =>
        at === index ? { ...rule, ...patch } : rule,
      ),
    });
  return (
    <>
      <SettingsField label="Name records by">
        <DashboardFieldSelect
          fields={fields}
          accepts={canShowInLookup}
          value={attention.titleFieldId}
          onChange={(titleFieldId) => set({ titleFieldId })}
          placeholder="Primary field"
        />
      </SettingsField>
      {attention.rules.map((rule, index) => (
        <div
          key={rule.id}
          className="flex flex-col gap-2 rounded-lg border p-3"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
            <Input
              aria-label={`Rule ${index + 1} name`}
              value={rule.name}
              maxLength={40}
              placeholder="e.g. ETA passed"
              onChange={(event) => setRule(index, { name: event.target.value })}
            />
            <DashboardSegmented
              label={`Rule ${index + 1} colour`}
              value={rule.tone}
              options={[
                { value: "red", label: "Red" },
                { value: "amber", label: "Amber" },
              ]}
              onChange={(tone) => setRule(index, { tone })}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove rule ${nonEmpty(rule.name) ?? index + 1}`}
              className="text-muted-foreground hover:text-foreground"
              startIcon={<X size={14} />}
              onClick={() =>
                set({ rules: attention.rules.filter((_, at) => at !== index) })
              }
            />
          </div>
          <DashboardFilterEditor
            fields={fields}
            filter={rule.filter}
            members={members}
            onChange={(filter) => setRule(index, { filter })}
          />
          <Input
            aria-label={`Rule ${index + 1} button`}
            value={rule.actionLabel ?? ""}
            maxLength={20}
            placeholder="Button text, e.g. Fix record"
            onChange={(event) =>
              setRule(index, { actionLabel: event.target.value })
            }
          />
        </div>
      ))}
      <Button
        variant="outline"
        size="xs"
        className="w-fit"
        startIcon={<Plus size={13} />}
        onClick={() =>
          set({
            rules: [
              ...attention.rules,
              {
                id: crypto.randomUUID(),
                name: "",
                tone: "amber",
                filter: { match: "all", conditions: [] },
              },
            ],
          })
        }
      >
        Add rule
      </Button>
    </>
  );
}

const MAX_COUNTS = [
  ...asOptions([10, 20, 30, 50]),
  { value: "all", label: "All" },
];

/** The date field every widget orders its records by, and how many of them it uses. */
export function SortSettings({
  widget,
  fields,
  onChange,
}: Pick<DashboardTypeSettingsProps, "widget" | "fields" | "onChange">) {
  return (
    <>
      <SettingsField label="Sort by" hint="date fields only">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <DashboardFieldSelect
            fields={fields}
            accepts={isDateField}
            value={widget.sortFieldId}
            onChange={(sortFieldId) => onChange({ sortFieldId })}
            noneLabel="Table order"
          />
          <DashboardSegmented
            label="Direction"
            value={widget.sortDirection ?? "asc"}
            options={[
              { value: "asc", label: "Earliest" },
              { value: "desc", label: "Latest" },
            ]}
            onChange={(sortDirection) => onChange({ sortDirection })}
          />
        </div>
      </SettingsField>
      <SettingsField
        label="Show at most"
        hint={widget.type === "attention" ? "rows" : "records"}
      >
        <DashboardSegmented
          label="Show at most"
          value={
            widget.maxCount != null && widget.maxCount !== 0
              ? String(widget.maxCount)
              : "all"
          }
          options={MAX_COUNTS}
          onChange={(value) =>
            onChange({ maxCount: value === "all" ? undefined : Number(value) })
          }
        />
      </SettingsField>
    </>
  );
}

/** The Data settings of each widget type. */
export const TYPE_DATA_SETTINGS: Record<
  IDashboardWidgetType,
  ComponentType<DashboardTypeSettingsProps>
> = {
  metric: MetricData,
  board: BoardData,
  list: ListData,
  breakdown: BreakdownData,
  trend: TrendData,
  map: MapData,
  attention: AttentionData,
};
