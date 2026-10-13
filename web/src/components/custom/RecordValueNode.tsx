import { cn } from "@/ui-kit";
import type { ReactNode } from "react";

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
  if (!value) return <span className="text-muted-foreground">—</span>;
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
