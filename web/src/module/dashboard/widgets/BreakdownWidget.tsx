import { useMemo } from "react";
import { useDashboard } from "../dashboard.context";
import {
  describeMeasure,
  formatMeasure,
  groupColor,
  groupRecords,
  measureRecords,
} from "../moduleDashboard.utils";
import type { DashboardWidgetBodyProps } from "../moduleDashboard.types";
import {
  DashboardWidgetFrame,
  DashboardWidgetMessage,
} from "./DashboardWidgetFrame";
import { nonEmpty } from "@/lib/stringHelper";

/**
 * How the records split by a field. Bars rank the biggest groups against the largest;
 * a stacked bar shows each group's share with a legend, in the field's own order and colours.
 */
export function BreakdownWidget({ widget, view }: DashboardWidgetBodyProps) {
  const { members, lookups } = useDashboard();
  const breakdown = widget.breakdown;
  const groupField = view.fieldById.get(breakdown?.groupFieldId ?? "");
  const valueField = view.fieldById.get(breakdown?.fieldId ?? "");
  const groups = useMemo(
    () =>
      groupRecords(view.records, groupField, members, lookups)
        .map((group, index) => ({
          ...group,
          color: group.color ?? groupColor(index, group.key),
          value: measureRecords(group.records, breakdown, valueField) ?? 0,
        }))
        .filter((group) => group.value > 0),
    [view.records, groupField, members, lookups, breakdown, valueField],
  );
  const total = groups.reduce((sum, group) => sum + group.value, 0);
  const stacked = breakdown?.style === "stacked";
  const limit = breakdown?.limit ?? 6;
  const ranked = useMemo(
    () => [...groups].sort((a, b) => b.value - a.value).slice(0, limit),
    [groups, limit],
  );
  const largest = ranked[0]?.value ?? 0;
  const format = (value: number) => formatMeasure(value, breakdown, valueField);

  return (
    <DashboardWidgetFrame
      title={widget.label}
      aside={
        nonEmpty(widget.caption) ??
        describeMeasure(
          breakdown,
          valueField,
          view.source?.sidebarText ?? "records",
        )
      }
    >
      {!groupField ? (
        <DashboardWidgetMessage>
          Pick a field to split by in this widget's settings.
        </DashboardWidgetMessage>
      ) : groups.length === 0 ? (
        <DashboardWidgetMessage>
          No records to break down.
        </DashboardWidgetMessage>
      ) : stacked ? (
        <div className="flex flex-col gap-3">
          <div
            className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
            role="img"
            aria-label={groups
              .map((group) => `${group.label} ${format(group.value)}`)
              .join(", ")}
          >
            {groups.map((group) => (
              <div
                key={group.key}
                title={`${group.label}: ${format(group.value)} (${Math.round((group.value / total) * 100)}%)`}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${(group.value / total) * 100}%`,
                  backgroundColor: group.color,
                }}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {groups.map((group) => (
              <li key={group.key} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <span className="text-muted-foreground">{group.label}</span>
                <span className="font-medium">{format(group.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {ranked.map((group) => (
            <li
              key={group.key}
              title={`${group.label}: ${format(group.value)}`}
            >
              <div className="flex items-start justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {group.label}
                  </span>
                  {group.caption != null && group.caption !== "" && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {group.caption}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-semibold">
                  {format(group.value)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${largest !== 0 ? (group.value / largest) * 100 : 0}%`,
                  }}
                />
              </div>
            </li>
          ))}
          {groups.length > ranked.length && (
            <li className="text-xs text-muted-foreground">
              + {groups.length - ranked.length} more
            </li>
          )}
        </ul>
      )}
    </DashboardWidgetFrame>
  );
}
