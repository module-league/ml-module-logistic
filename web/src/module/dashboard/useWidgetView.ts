import { useMemo } from "react";
import { useDashboard } from "./dashboard.context";
import { filterRecords, tableFields } from "./moduleDashboard.utils";
import type { DashboardWidgetView } from "./moduleDashboard.types";

const NO_RECORDS: ISidebarRecord[] = [];

/**
 * A widget's table, its fields and the records it shows: after the widget's own filter,
 * and the page date range when it follows it.
 */
export function useWidgetView(widget: IDashboardWidget): DashboardWidgetView {
  const { layout, sources, lookups, lookupErrors, now, range } = useDashboard();
  const source = useMemo(
    () => sources.find((entry) => entry?.sidebarId === widget?.sidebarId),
    [sources, widget?.sidebarId],
  );
  const fields = useMemo(() => tableFields(source), [source]);
  const fieldById = useMemo(
    () => new Map(fields.map((field) => [field.objId, field])),
    [fields],
  );
  const loaded = lookups?.[widget?.sidebarId];
  const allRecords = loaded?.records ?? NO_RECORDS;

  const rangeField =
    widget?.followsRange && layout.rangeSidebarId === widget?.sidebarId
      ? fieldById.get(layout.rangeFieldId ?? "")
      : undefined;
  const records = useMemo(() => {
    const filtered = filterRecords(allRecords, widget?.filter, fieldById, now);
    if (!rangeField) return filtered;
    return filterRecords(
      filtered,
      {
        match: "all",
        conditions: [
          {
            fieldId: rangeField.objId,
            operator: "within",
            value: range,
          },
        ],
      },
      fieldById,
      now,
    );
  }, [allRecords, widget?.filter, fieldById, now, rangeField, range]);

  const problem = !widget?.sidebarId
    ? "Pick a table in this widget's settings."
    : !source
      ? "The table this widget reads isn't in the module any more."
      : undefined;

  return {
    source,
    fields,
    fieldById,
    records,
    isLoading: !problem && !loaded && !lookupErrors?.[widget?.sidebarId],
    error: lookupErrors?.[widget?.sidebarId],
    problem,
  };
}
