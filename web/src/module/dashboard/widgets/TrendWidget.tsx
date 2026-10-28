import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@moduleleague/ui";
import { useDashboard } from "../dashboard.context";
import {
  describeMeasure,
  formatMeasure,
  trendSeries,
} from "../moduleDashboard.utils";
import type { DashboardWidgetBodyProps } from "../moduleDashboard.types";
import {
  DashboardWidgetFrame,
  DashboardWidgetMessage,
} from "./DashboardWidgetFrame";
import { nonEmpty } from "@/lib/stringHelper";

const BUCKET_TEXT: Record<IDashboardTrend["bucket"], string> = {
  day: "days",
  week: "weeks",
  month: "months",
};

/** One series over time, by a date field: a bar per day, week or month, ending with the current one. */
export function TrendWidget({ widget, view }: DashboardWidgetBodyProps) {
  const { now } = useDashboard();
  const trend = widget.trend;
  const dateField = view.fieldById.get(trend?.dateFieldId ?? "");
  const valueField = view.fieldById.get(trend?.fieldId ?? "");
  const series = useMemo(
    () =>
      trend ? trendSeries(view.records, trend, dateField, valueField, now) : [],
    [trend, view.records, dateField, valueField, now],
  );
  const measureText = describeMeasure(
    trend,
    valueField,
    view.source?.sidebarText ?? "records",
  );
  const config = useMemo<ChartConfig>(
    () => ({ value: { label: measureText, color: "var(--dash-series-1)" } }),
    [measureText],
  );
  const format = (value: unknown) =>
    formatMeasure(Number(value), trend, valueField);
  const axis = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={false}
        minTickGap={16}
        tickMargin={6}
      />
      <YAxis
        width={40}
        tickLine={false}
        axisLine={false}
        allowDecimals={false}
        tickFormatter={format}
      />
      <ChartTooltip
        cursor={trend?.chart === "line" ? true : { fillOpacity: 0.4 }}
        content={
          <ChartTooltipContent
            formatter={(value) => `${measureText}: ${format(value)}`}
          />
        }
      />
    </>
  );

  return (
    <DashboardWidgetFrame
      title={widget.label}
      aside={
        nonEmpty(widget.caption) ??
        (dateField && trend
          ? `By ${dateField.name}, last ${trend.span} ${BUCKET_TEXT[trend.bucket]}`
          : undefined)
      }
    >
      {!dateField ? (
        <DashboardWidgetMessage>
          Pick a date field in this widget's settings.
        </DashboardWidgetMessage>
      ) : (
        <ChartContainer config={config} className="aspect-auto h-52 w-full">
          {trend?.chart === "line" ? (
            <LineChart
              data={series}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              {axis}
              <Line
                dataKey="value"
                type="monotone"
                stroke="var(--color-value)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          ) : (
            <BarChart
              data={series}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              {axis}
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          )}
        </ChartContainer>
      )}
    </DashboardWidgetFrame>
  );
}
