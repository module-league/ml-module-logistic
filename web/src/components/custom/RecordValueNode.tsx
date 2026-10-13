import { cn } from "@/ui-kit";
import { Square, SquareCheck } from "lucide-react";
import type { ReactNode } from "react";
import { formatFieldDate } from "@/lib/dateHelper";

type SpanProps = Omit<
  React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLSpanElement>,
    HTMLSpanElement
  >,
  "children"
>;

type SelectionNodeProps = SpanProps & {
  dropDownValue: IFieldDropDownValue | undefined;
  children: ReactNode;
};
export function SelectionNode(props: SelectionNodeProps) {
  const { dropDownValue, className, style, ...others } = props;
  return (
    <span
      className={cn(
        "rounded-lg overflow-hidden py-1 px-2 text-[0.8em] bg-slate-600",
        className,
      )}
      style={{
        backgroundColor: dropDownValue?.colorCode,
        color: "white",
        ...style,
      }}
      title={dropDownValue?.value}
      {...others}
    />
  );
}

export function RecordValueNode({
  field,
  value,
}: {
  field: IField;
  value?: string | null;
}) {
  if (field?.type === "checkbox") {
    return value === "true" ? (
      <SquareCheck aria-label="Ticked" className="size-4 text-primary" />
    ) : (
      <Square aria-label="Not ticked" className="size-4 text-muted-foreground/40" />
    );
  }
  if (!value) return <span className="text-muted-foreground">—</span>;
  if (field?.type === "date") {
    return <span className="tabular-nums">{formatFieldDate(field, value)}</span>;
  }
  if (field?.type === "single_select") {
    const option = field?.dropDownValues?.find((o) => o?.id === value);
    return (
      <SelectionNode dropDownValue={option}>
        {option?.value ?? "Unknown"}
      </SelectionNode>
    );
  }
  return (
    <span className={field?.isNumeric ? "tabular-nums" : undefined}>
      {value}
    </span>
  );
}
