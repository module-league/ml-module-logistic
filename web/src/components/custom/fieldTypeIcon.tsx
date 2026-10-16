import { memo } from "react";
import { CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react";

import {
  AlignLeft,
  Banknote,
  Braces,
  Calendar,
  CalendarClock,
  CalendarPlus,
  Clock,
  Copy,
  FileArchive,
  Hash,
  Link2,
  ListChecks,
  ListOrdered,
  ListTodo,
  Network,
  Paperclip,
  TextSearch,
  SquareCheck,
  Type,
  User,
  UserPen,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

export const FIELD_TYPE_ICONS: Record<IField["type"], LucideIcon> = {
  text: Type,
  long_text: AlignLeft,
  number: Hash,
  single_select: ListChecks,
  multi_select: ListTodo,
  checkbox: SquareCheck,
  date: Calendar,
  time: Clock,
  member: User,
  link_table: Link2,
  lookup: TextSearch,
  mirror: Copy,
  templating: Braces,
  currency: Banknote,
  associate: Network,
  attachment: Paperclip,
  record_attachment: FileArchive,
  ds_creator_id: UserPlus,
  ds_create_time: CalendarPlus,
  ds_updater_id: UserPen,
  ds_update_time: CalendarClock,
  ds_running_number: ListOrdered,
};

export interface FieldTypeIconProps extends Omit<LucideProps, "ref"> {
  /** Without a type a dashed circle is shown. */
  type?: IField["type"];
}

export const FieldTypeIcon = memo(function FieldTypeIcon({
  type,
  className,
  size,
  ...props
}: FieldTypeIconProps) {
  const Icon = (type && FIELD_TYPE_ICONS[type]) || CircleDashed;
  return (
    <Icon
      aria-hidden
      className={cn("size-3.5 shrink-0 text-muted-foreground", className)}
      size={size}
      {...props}
    />
  );
});
