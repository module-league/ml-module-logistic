import { useCallback, useMemo } from "react";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Switch,
} from "@moduleleague/ui";
import { DashboardWidget } from "../widgets/DashboardWidget";
import {
  defaultSettings,
  tableFields,
  WIDGET_WIDTHS,
  widgetTypeOf,
} from "../moduleDashboard.utils";
import type { DashboardWidgetSettingsProps } from "../moduleDashboard.types";
import { DashboardFilterEditor } from "./DashboardFilterEditor";
import { MetricDisplay, TYPE_DATA_SETTINGS } from "./DashboardTypeSettings";
import {
  DashboardSegmented,
  SettingsField,
  SettingsSection,
} from "./DashboardControls";

/**
 * The side sheet that edits one widget: a live preview on top, then where its data comes from,
 * which records it keeps and how it shows. Every change shows on the page at once and is saved with Save layout.
 */
export function DashboardWidgetSettings({
  widget,
  open,
  onOpenChange,
  sources,
  members,
  rangeSidebarId,
  onChange,
}: DashboardWidgetSettingsProps) {
  const entry = widgetTypeOf(widget?.type);
  const source = useMemo(
    () =>
      sources.find((candidate) => candidate.sidebarId === widget?.sidebarId),
    [sources, widget?.sidebarId],
  );
  const fields = useMemo(() => tableFields(source), [source]);
  const patch = useCallback(
    (changes: Partial<IDashboardWidget>) =>
      widget && onChange({ ...widget, ...changes }),
    [widget, onChange],
  );
  // A new table starts the widget's fields and filter over; its label and width stay
  const pickTable = useCallback(
    (sidebarId: string) => {
      if (!widget) return;
      const next = sources.find(
        (candidate) => candidate.sidebarId === sidebarId,
      );
      onChange({
        ...widget,
        ...defaultSettings(widget.type, next, sources),
        label: widget.label,
        sidebarId,
        filter: { match: "all", conditions: [] },
        followsRange: false,
      });
    },
    [widget, sources, onChange],
  );
  const DataSettings = TYPE_DATA_SETTINGS[widget?.type ?? "metric"];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <p className="text-xs text-muted-foreground">{entry.label} widget</p>
          <SheetTitle>Widget settings</SheetTitle>
          <SheetDescription className="sr-only">
            Changes show on the page at once; Save layout keeps them.
          </SheetDescription>
        </SheetHeader>
        {widget && (
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
            <div className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-3">
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Live preview
              </p>
              <div className="pointer-events-none max-h-80 overflow-hidden">
                <DashboardWidget widget={widget} compact />
              </div>
            </div>

            <SettingsSection title="Data">
              <SettingsField label="Table" htmlFor="widget-table">
                <Select value={widget.sidebarId} onValueChange={pickTable}>
                  <SelectTrigger id="widget-table" className="w-full">
                    <SelectValue placeholder="Choose a table">
                      {source?.sidebarText}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {sources.map((candidate) => {
                      const fits = entry.accepts(candidate, sources);
                      return (
                        <SelectItem
                          key={candidate.sidebarId}
                          value={candidate.sidebarId}
                          disabled={!fits}
                          textValue={candidate.sidebarText}
                        >
                          {candidate.sidebarText}
                          {!fits && (
                            <span className="text-xs text-muted-foreground">
                              {entry.requirement}
                            </span>
                          )}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </SettingsField>
              {source && (
                <DataSettings
                  widget={widget}
                  fields={fields}
                  sources={sources}
                  members={members}
                  onChange={patch}
                />
              )}
            </SettingsSection>

            {source && (
              <SettingsSection title="Filter">
                {rangeSidebarId === widget.sidebarId && (
                  <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                    Follow the page date range
                    <Switch
                      checked={!!widget.followsRange}
                      onCheckedChange={(followsRange) =>
                        patch({ followsRange })
                      }
                    />
                  </label>
                )}
                <DashboardFilterEditor
                  fields={fields}
                  filter={widget.filter ?? { match: "all", conditions: [] }}
                  members={members}
                  onChange={(filter) => patch({ filter })}
                />
              </SettingsSection>
            )}

            <SettingsSection title="Display">
              <SettingsField label="Label" htmlFor="widget-label">
                <Input
                  id="widget-label"
                  value={widget.label}
                  maxLength={60}
                  onChange={(event) => patch({ label: event.target.value })}
                />
              </SettingsField>
              {widget.type === "metric" ? (
                <MetricDisplay
                  widget={widget}
                  fields={fields}
                  sources={sources}
                  members={members}
                  onChange={patch}
                />
              ) : (
                <SettingsField
                  label="Note on the right"
                  htmlFor="widget-caption"
                  hint="blank describes the widget"
                >
                  <Input
                    id="widget-caption"
                    value={widget.caption ?? ""}
                    maxLength={40}
                    placeholder="e.g. Active shipments"
                    onChange={(event) => patch({ caption: event.target.value })}
                  />
                </SettingsField>
              )}
              <SettingsField label="Width">
                <DashboardSegmented
                  label="Width"
                  value={widget.width}
                  options={WIDGET_WIDTHS}
                  onChange={(width) => patch({ width })}
                />
              </SettingsField>
            </SettingsSection>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
