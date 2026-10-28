import { useCallback, useMemo } from "react";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
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
import {
  MetricDisplay,
  SortSettings,
  TYPE_DATA_SETTINGS,
} from "./DashboardTypeSettings";
import {
  DashboardSegmented,
  SettingsField,
  SettingsSection,
} from "./DashboardControls";

/**
 * The side sheet that edits one widget: a live preview on the left (on top on narrow screens), and beside it, in the order a widget is built,
 * its label, the table and fields it reads, which records it keeps, their order and count, and how it shows. Every change shows on the page at once and is saved with Save layout.
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
      <SheetContent
        onOpenAutoFocus={(event) => {
          // Start in the settings, not on a button inside the preview
          event.preventDefault();
          document.getElementById("widget-label")?.focus();
        }}
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[600px] data-[side=right]:lg:w-[min(1080px,94vw)] data-[side=right]:lg:max-w-[min(1080px,94vw)]"
      >
        <SheetHeader className="border-b pr-12">
          <p className="text-xs text-muted-foreground">{entry.label} widget</p>
          <SheetTitle>Widget settings</SheetTitle>
          <SheetDescription className="sr-only">
            Changes show on the page at once; Save layout keeps them.
          </SheetDescription>
        </SheetHeader>
        {widget && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
            <div className="flex shrink-0 flex-col gap-2 border-b bg-muted/40 p-4 lg:min-w-0 lg:flex-1 lg:shrink lg:overflow-y-auto lg:overscroll-contain lg:border-r lg:border-b-0 lg:p-6">
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Live preview
              </p>
              <div className="max-h-96 overflow-y-auto overscroll-contain lg:max-h-none lg:overflow-visible">
                <DashboardWidget widget={widget} preview />
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-6 p-4 lg:w-[400px] lg:overflow-y-auto lg:overscroll-contain">
              <SettingsField label="Label" htmlFor="widget-label">
                <Input
                  id="widget-label"
                  value={widget.label}
                  maxLength={60}
                  onChange={(event) => patch({ label: event.target.value })}
                />
              </SettingsField>

              <Separator className="border-b" />

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
                <>
                  <Separator className="border-b" />
                  <SettingsSection title="Filter">
                    {rangeSidebarId === widget.sidebarId && (
                      <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                        Follow the page date range
                        <Switch
                          checked={widget.followsRange === true}
                          onCheckedChange={(followsRange) =>
                            patch({ followsRange })
                          }
                        />
                      </label>
                    )}
                    <DashboardFilterEditor
                      fields={fields}
                      filter={
                        // Widgets saved before filters existed have none
                        widget.filter ?? { match: "all", conditions: [] }
                      }
                      members={members}
                      onChange={(filter) => patch({ filter })}
                    />
                  </SettingsSection>
                </>
              )}

              {source && (
                <>
                  <Separator className="border-b" />
                  <SettingsSection title="Sort & limit">
                    <SortSettings
                      widget={widget}
                      fields={fields}
                      onChange={patch}
                    />
                  </SettingsSection>
                </>
              )}

              <Separator className="border-b" />

              <SettingsSection title="Display">
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
                      onChange={(event) =>
                        patch({ caption: event.target.value })
                      }
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
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
