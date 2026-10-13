import { memo } from "react";
import { CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { FIELD_TYPE_ICONS } from "./fieldTypeIcon.utils";
import type { FieldTypeIconProps } from "./fieldTypeIcon.types";

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
