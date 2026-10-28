import type { ReactNode } from "react";
import {
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@moduleleague/ui";
import { fieldTypeLabel } from "../moduleDashboard.utils";
import type {
  DashboardFieldListProps,
  DashboardFieldSelectProps,
  DashboardSegmentedProps,
} from "../moduleDashboard.types";
import { FieldTypeIcon } from "@/components/custom/fieldTypeIcon";

/** Radix Select can't hold an empty value, so "None" is this. */
const NONE = "__none";

/** A titled block of the widget settings. */
export function SettingsSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A labelled setting: the label over its control, with an optional hint. */
export function SettingsField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
        {hint != null && hint !== "" && (
          <span className="font-normal"> · {hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}

/** A row of mutually exclusive choices, e.g. Count records · Sum · Average. */
export function DashboardSegmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: DashboardSegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex w-fit flex-wrap gap-1", className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "cursor-pointer rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
            option.value === value &&
              "border-primary bg-primary-10 text-primary hover:text-primary",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** A dropdown of a table's fields, each with its type icon. */
export function DashboardFieldSelect({
  fields,
  value,
  onChange,
  accepts,
  placeholder = "Choose a field",
  noneLabel,
  id,
  className,
}: DashboardFieldSelectProps) {
  const offered = accepts ? fields.filter(accepts) : fields;
  const picked = fields.find((field) => field.objId === value);
  return (
    <Select
      value={
        picked
          ? picked.objId
          : noneLabel != null && noneLabel !== ""
            ? NONE
            : ""
      }
      onValueChange={(next) => onChange(next === NONE ? undefined : next)}
    >
      <SelectTrigger id={id} className={cn("w-full min-w-0", className)}>
        <SelectValue placeholder={placeholder}>
          {picked ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <FieldTypeIcon type={picked.type} className="size-3.5 shrink-0" />
              <span className="truncate">{picked.name}</span>
            </span>
          ) : (
            noneLabel
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" searchable={offered.length > 8}>
        {noneLabel != null && noneLabel !== "" && (
          <SelectItem value={NONE} textValue={noneLabel}>
            <span className="text-muted-foreground">{noneLabel}</span>
          </SelectItem>
        )}
        {offered.map((field) => (
          <SelectItem
            key={field.objId}
            value={field.objId}
            textValue={field.name}
          >
            <FieldTypeIcon type={field.type} className="size-3.5" />
            {field.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Every field of the table in a list; the ones that can't be picked are greyed with the reason. */
export function DashboardFieldList({
  fields,
  value,
  onChange,
  reasonOf,
  label,
}: DashboardFieldListProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex max-h-72 flex-col overflow-y-auto rounded-lg border"
    >
      {fields.map((field) => {
        const reason = reasonOf(field);
        const selected = field.objId === value;
        return (
          <button
            key={field.objId}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={reason != null && reason !== ""}
            onClick={() =>
              (reason == null || reason === "") && onChange(field.objId)
            }
            className={cn(
              "flex min-w-0 items-center gap-2.5 border-b px-3 py-2 text-left text-sm last:border-0 focus-visible:bg-muted focus-visible:outline-none",
              reason != null && reason !== ""
                ? "cursor-not-allowed text-muted-foreground/70"
                : "cursor-pointer hover:bg-muted/60",
              selected && "bg-primary-10 font-medium hover:bg-primary-10",
            )}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted">
              <FieldTypeIcon type={field.type} className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate">{field.name}</span>
            <span
              className={cn(
                "shrink-0 text-xs",
                reason != null && reason !== ""
                  ? "text-muted-foreground/70"
                  : "text-muted-foreground",
              )}
            >
              {fieldTypeLabel(field)}
              {reason != null && reason !== "" && ` · ${reason}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
