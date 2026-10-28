import { cn } from "@/ui-kit";
import { Square, SquareCheck } from "lucide-react";
import type { ReactNode } from "react";
import { formatFieldDate, formatFieldTime } from "@/lib/dateHelper";
import { formatFieldNumber } from "@/lib/numberHelper";
import { findMember, parseMemberIds } from "@/lib/memberHelper";
import { MemberChip } from "./MemberChip";
import { AttachmentChipList } from "./AttachmentChip";
import { parseAttachments } from "@/lib/attachmentHelper";
import { selectedOptions } from "@/lib/selectHelper";
import { isLinkingField } from "@/lib/lookupHelper";
import { LinkedRecordChipList } from "./LinkedRecordChip";

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
        "rounded-md overflow-hidden py-1 px-2 text-[0.8em] bg-slate-600",
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
  members,
}: {
  field: IField;
  value?: string | null;
  /** Needed to show member fields as people. */
  members?: IUserInfo[];
}) {
  if (field.type === "checkbox") {
    return value === "true" ? (
      <SquareCheck
        aria-label="Ticked"
        className="inline-block size-4 align-middle text-primary"
      />
    ) : (
      <Square
        aria-label="Not ticked"
        className="inline-block size-4 align-middle text-muted-foreground/40"
      />
    );
  }
  if (value == null || value === "")
    return <span className="text-muted-foreground">—</span>;
  if (field.type === "attachment") {
    return (
      <AttachmentChipList
        attachments={parseAttachments(value)}
        options={field.dropDownValues}
      />
    );
  }
  if (field.type === "member") {
    return (
      <span className="flex min-w-0 items-center gap-1 overflow-hidden">
        {parseMemberIds(value).map((memberId) => (
          <MemberChip key={memberId} member={findMember(members, memberId)} />
        ))}
      </span>
    );
  }
  if (field.isNumeric === true) {
    return (
      <span className="tabular-nums">{formatFieldNumber(field, value)}</span>
    );
  }
  if (field.isDateField) {
    return (
      <span className="tabular-nums">{formatFieldDate(field, value)}</span>
    );
  }
  if (field.type === "time") {
    return (
      <span className="tabular-nums">{formatFieldTime(field, value)}</span>
    );
  }
  if (field.type === "single_select") {
    const option = field.dropDownValues?.find((o) => o.id === value);
    return (
      <SelectionNode dropDownValue={option}>
        {option?.value ?? "Unknown"}
      </SelectionNode>
    );
  }
  if (isLinkingField(field)) {
    return (
      <LinkedRecordChipList field={field} value={value} members={members} />
    );
  }
  if (field.type === "multi_select") {
    return (
      <span className="flex min-w-0 items-center gap-1 overflow-hidden">
        {selectedOptions(field, value).map((option) => (
          <SelectionNode
            key={option.id}
            dropDownValue={option}
            className="shrink-0 truncate"
          >
            {option.value}
          </SelectionNode>
        ))}
      </span>
    );
  }
  return <span>{value}</span>;
}
