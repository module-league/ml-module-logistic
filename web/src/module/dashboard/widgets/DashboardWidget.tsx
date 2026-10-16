import type { ComponentType } from "react";
import { useDashboard } from "../dashboard.context";
import { useWidgetView } from "../useWidgetView";
import type { DashboardWidgetBodyProps } from "../moduleDashboard.types";
import {
  DashboardWidgetError,
  DashboardWidgetFrame,
  DashboardWidgetMessage,
  DashboardWidgetSkeleton,
} from "./DashboardWidgetFrame";
import { MetricWidget } from "./MetricWidget";
import { BoardWidget } from "./BoardWidget";
import { ListWidget } from "./ListWidget";
import { BreakdownWidget } from "./BreakdownWidget";
import { TrendWidget } from "./TrendWidget";
import { MapWidget } from "./MapWidget";
import { AttentionWidget } from "./AttentionWidget";

const WIDGETS: Record<
  IDashboardWidgetType,
  ComponentType<DashboardWidgetBodyProps>
> = {
  metric: MetricWidget,
  board: BoardWidget,
  list: ListWidget,
  breakdown: BreakdownWidget,
  trend: TrendWidget,
  map: MapWidget,
  attention: AttentionWidget,
};

/** One widget with its records worked out; shows loading lines, the load error or a missing setting in its place. */
export function DashboardWidget({
  widget,
  preview = false,
}: {
  widget: IDashboardWidget;
  preview?: boolean;
}) {
  const view = useWidgetView(widget);
  const { onRetryLookup } = useDashboard();
  const Widget = WIDGETS[widget?.type] ?? MetricWidget;

  if (view.problem || view.isLoading || view.error) {
    return (
      <DashboardWidgetFrame title={widget?.label}>
        {view.problem ? (
          <DashboardWidgetMessage>{view.problem}</DashboardWidgetMessage>
        ) : view.error ? (
          <DashboardWidgetError
            error={view.error}
            onRetry={() => onRetryLookup(widget.sidebarId)}
          />
        ) : (
          <DashboardWidgetSkeleton rows={widget?.type === "metric" ? 2 : 4} />
        )}
      </DashboardWidgetFrame>
    );
  }
  return <Widget widget={widget} view={view} preview={preview} />;
}
