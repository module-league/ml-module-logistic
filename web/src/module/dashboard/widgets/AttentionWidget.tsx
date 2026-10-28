import { useMemo } from "react";
import { cn } from "@moduleleague/ui";
import { parseFieldDate } from "@/lib/dateHelper";
import { recordFieldValue } from "@/module/page/modulePage.utils";
import { useDashboard } from "../dashboard.context";
import {
  daysLate,
  filterRecords,
  recordTitle,
  TONE_CLASS,
  titleFieldOf,
} from "../moduleDashboard.utils";
import type { DashboardWidgetBodyProps } from "../moduleDashboard.types";
import {
  DashboardWidgetFrame,
  DashboardWidgetMessage,
} from "./DashboardWidgetFrame";
import { nonEmpty } from "@/lib/stringHelper";

/**
 * The records that break a rule, red rules first; a record matching several rules shows the first.
 * A rule that tests a date "is before" shows how many days late each record is.
 */
export function AttentionWidget({
  widget,
  view,
  preview,
}: DashboardWidgetBodyProps) {
  const { members, lookups, now, onOpenRecord } = useDashboard();
  const attention = widget.attention;
  const titleField = titleFieldOf(view.fields, attention?.titleFieldId);
  const flagged = useMemo(() => {
    const rules = [...(attention?.rules ?? [])].sort(
      (a, b) => Number(a.tone === "amber") - Number(b.tone === "amber"),
    );
    const seen = new Set<string>();
    return rules.flatMap((rule) => {
      if (rule.filter.conditions.length === 0) return [];
      const lateField = view.fieldById.get(
        rule.filter.conditions.find(
          (condition) => condition.operator === "before",
        )?.fieldId ?? "",
      );
      return filterRecords(
        view.matching,
        rule.filter,
        view.fieldById,
        now,
      ).flatMap((record) => {
        if (seen.has(record.objId)) return [];
        seen.add(record.objId);
        const late = lateField
          ? daysLate(parseFieldDate(recordFieldValue(lateField, record)), now)
          : 0;
        return [{ record, rule, late }];
      });
    });
  }, [attention?.rules, view.matching, view.fieldById, now]);
  const shown =
    widget.maxCount != null && widget.maxCount !== 0
      ? flagged.slice(0, widget.maxCount)
      : flagged;

  return (
    <DashboardWidgetFrame
      title={widget.label}
      aside={
        nonEmpty(widget.caption) ??
        `${flagged.length} ${flagged.length === 1 ? "record" : "records"}`
      }
    >
      {attention?.rules.length == null || attention.rules.length === 0 ? (
        <DashboardWidgetMessage>
          Add a rule in this widget's settings.
        </DashboardWidgetMessage>
      ) : flagged.length === 0 ? (
        <DashboardWidgetMessage>
          Nothing needs attention.
        </DashboardWidgetMessage>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map(({ record, rule, late }) => (
            <li key={record.objId}>
              <button
                type="button"
                disabled={preview}
                onClick={() => onOpenRecord(widget.sidebarId, record.objId)}
                className={cn(
                  "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-opacity hover:opacity-85 disabled:cursor-default",
                  TONE_CLASS[rule.tone],
                )}
              >
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">
                    {recordTitle(record, titleField, members, lookups)}
                  </span>
                  <span className="opacity-80"> · {rule.name}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold">
                  {late > 0
                    ? `${late} ${late === 1 ? "day" : "days"} late`
                    : (nonEmpty(rule.actionLabel) ?? "Open")}
                </span>
              </button>
            </li>
          ))}
          {flagged.length > shown.length && (
            <li className="text-xs text-muted-foreground">
              + {flagged.length - shown.length} more
            </li>
          )}
        </ul>
      )}
    </DashboardWidgetFrame>
  );
}
