import { GripHorizontal, GripVertical } from "lucide-react";
import { Separator } from "react-resizable-panels";
import { cn } from "@moduleleague/ui";

interface ResizeSeparatorProps {
  /** Orientation of the Group it sits in: "horizontal" panels get a vertical line. */
  orientation: "horizontal" | "vertical";
  className?: string;
}

export function ResizeSeparator({
  orientation,
  className,
}: ResizeSeparatorProps) {
  const vertical = orientation === "horizontal";
  const Grip = vertical ? GripVertical : GripHorizontal;

  return (
    <Separator
      className={cn(
        "group/separator relative z-10 flex items-center justify-center",
        vertical ? "w-1" : "h-1",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-sm border bg-background text-muted-foreground shadow-sm transition-colors",
          "group-data-[separator=hover]/separator:border-primary group-data-[separator=hover]/separator:text-primary",
          "group-data-[separator=active]/separator:border-primary group-data-[separator=active]/separator:bg-primary group-data-[separator=active]/separator:text-primary-foreground",
          vertical ? "h-6 w-3" : "h-3 w-6",
        )}
      >
        <Grip className="size-2.5" />
      </span>
    </Separator>
  );
}
