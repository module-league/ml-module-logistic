import { useMemo } from "react";
import { format, startOfDay } from "date-fns";
import { cn } from "@moduleleague/ui";
import { parseFieldDate } from "@/lib/dateHelper";
import { toRecordText } from "@/lib/recordTextHelper";
import { recordFieldValue } from "@/module/page/modulePage.utils";
import { RecordValueNode } from "@/components/custom/RecordValueNode";
import { useDashboard } from "../dashboard.context";
import { isDateField } from "../moduleDashboard.utils";
import type { DashboardWidgetBodyProps } from "../moduleDashboard.types";
import {
  DashboardWidgetFrame,
  DashboardWidgetMessage,
} from "./DashboardWidgetFrame";
import { nonEmpty } from "@/lib/stringHelper";

/** The top records in a table, in the widget's sort order; a row opens its record. Dates show as chips, red once passed. */
export function ListWidget({
  widget,
  view,
  preview,
}: DashboardWidgetBodyProps) {
  const { members, lookups, now, onOpenRecord } = useDashboard();
  const list = widget.list;
  const columns = useMemo(
    () =>
      list?.columns.flatMap((column) => {
        const field = view.fieldById.get(column.fieldId);
        return field
          ? [{ field, toField: view.fieldById.get(column.toFieldId ?? "") }]
          : [];
      }) ?? [],
    [list?.columns, view.fieldById],
  );
  const sortField = view.fieldById.get(widget.sortFieldId ?? "");
  const rows = view.records;
  const today = startOfDay(now);
  const textOf = (field: ISidebarField, record: ISidebarRecord) =>
    nonEmpty(
      toRecordText(field, recordFieldValue(field, record), members, lookups),
    ) ?? "—";

  return (
    <DashboardWidgetFrame
      title={widget.label}
      aside={
        nonEmpty(widget.caption) ??
        (sortField
          ? `Sorted by ${sortField.name}`
          : `${view.matching.length} records`)
      }
    >
      {columns.length === 0 ? (
        <DashboardWidgetMessage>
          Add columns in this widget's settings.
        </DashboardWidgetMessage>
      ) : rows.length === 0 ? (
        <DashboardWidgetMessage>
          No records match this list.
        </DashboardWidgetMessage>
      ) : (
        <div className="-mx-1 min-w-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                {columns.map(({ field, toField }) => (
                  <th
                    key={field.objId}
                    className="px-1 pb-2 font-medium whitespace-nowrap"
                  >
                    {toField ? `${field.name} → ${toField.name}` : field.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((record) => (
                <tr
                  key={record.objId}
                  tabIndex={preview === true ? undefined : 0}
                  onClick={
                    preview === true
                      ? undefined
                      : () => onOpenRecord(widget.sidebarId, record.objId)
                  }
                  onKeyDown={(event) =>
                    event.key === "Enter" &&
                    preview !== true &&
                    onOpenRecord(widget.sidebarId, record.objId)
                  }
                  className={cn(
                    "border-b last:border-0",
                    preview !== true &&
                      "cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
                  )}
                >
                  {columns.map(({ field, toField }, index) => {
                    const value = recordFieldValue(field, record);
                    const date = isDateField(field)
                      ? parseFieldDate(value)
                      : undefined;
                    return (
                      <td
                        key={field.objId}
                        className={cn(
                          "max-w-64 truncate px-1 py-2.5",
                          index === 0 && "font-medium",
                        )}
                      >
                        {toField ? (
                          `${textOf(field, record)} → ${textOf(toField, record)}`
                        ) : date ? (
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
                              date < today
                                ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                : "bg-primary-10 text-primary",
                            )}
                          >
                            {format(date, "d MMM")}
                          </span>
                        ) : (
                          <RecordValueNode
                            field={field}
                            value={value}
                            members={members}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardWidgetFrame>
  );
}
