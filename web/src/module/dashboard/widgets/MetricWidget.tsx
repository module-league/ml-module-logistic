import { useMemo } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@moduleleague/ui";
import { useDashboard } from "../dashboard.context";
import {
  describeFilter,
  describeMeasure,
  formatMeasure,
  groupRecords,
  measureRecords,
  nextRecordCaption,
  TONE_CLASS,
  titleFieldOf,
} from "../moduleDashboard.utils";
import type { DashboardWidgetBodyProps } from "../moduleDashboard.types";

const DEFAULT_METRIC: IDashboardMetric = {
  calculation: "count",
  caption: "auto",
  tone: "none",
};

/** One headline number with a line under it; coloured by its tone while above zero. */
export function MetricWidget({ widget, view }: DashboardWidgetBodyProps) {
  const { members, lookups, now } = useDashboard();
  const metric = widget?.metric ?? DEFAULT_METRIC;
  const field = view.fieldById.get(metric.fieldId ?? "");
  const value = useMemo(
    () => measureRecords(view.records, metric, field),
    [view.records, metric, field],
  );
  const tableText = view.source?.sidebarText ?? "records";
  const caption = useMemo(() => {
    switch (metric.caption) {
      case "count":
        return `Across ${view.records.length.toLocaleString("en-US")} ${tableText}`;
      case "split":
        return (
          groupRecords(
            view.records,
            view.fieldById.get(metric.splitFieldId ?? ""),
            members,
            lookups,
          )
            .filter((group) => group.records.length)
            .map((group) => `${group.records.length} ${group.label}`)
            .join(" · ") || "Nothing to split yet"
        );
      case "next":
        return nextRecordCaption(
          view.records,
          view.fieldById.get(metric.nextFieldId ?? ""),
          titleFieldOf(view.fields),
          now,
          members,
          lookups,
        );
      case "custom":
        return metric.captionText ?? "";
      default:
        return [
          describeMeasure(metric, field, tableText),
          describeFilter(widget?.filter, view.fieldById, members),
        ]
          .filter(Boolean)
          .join(" · ");
    }
  }, [metric, view, field, tableText, members, lookups, now, widget?.filter]);
  const tone =
    metric.tone !== "none" && (value ?? 0) > 0 ? metric.tone : undefined;

  return (
    <section
      className={cn(
        "flex h-full min-w-0 flex-col gap-1 rounded-xl border bg-card p-4 text-card-foreground",
        tone && TONE_CLASS[tone],
      )}
    >
      <p
        className={cn(
          "flex min-w-0 items-center gap-1.5 text-sm",
          !tone && "text-muted-foreground",
        )}
      >
        {tone === "red" && <TriangleAlert className="size-3.5 shrink-0" />}
        <span className="truncate">{widget?.label}</span>
      </p>
      <p className="flex min-w-0 items-baseline gap-1.5">
        <span className="truncate text-3xl font-semibold tracking-tight">
          {formatMeasure(value, metric, field)}
        </span>
        {metric.unit && (
          <span className={cn("text-sm", !tone && "text-muted-foreground")}>
            {metric.unit}
          </span>
        )}
      </p>
      {caption && (
        <p
          className={cn(
            "truncate text-xs",
            tone ? "opacity-80" : "text-muted-foreground",
          )}
          title={caption}
        >
          {caption}
        </p>
      )}
    </section>
  );
}
