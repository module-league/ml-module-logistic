import { memo } from "react";
import { Layers, Plus } from "lucide-react";
import { cn, ModuleAddNewButton } from "@moduleleague/ui";
import type { ModuleAppEmptyState } from "../moduleAppView.types";

const BLUEPRINT_CORNERS = [
  "top-2 left-2",
  "top-2 right-2",
  "bottom-2 left-2",
  "bottom-2 right-2",
];

const BLUEPRINT = (
  <div aria-hidden className="relative h-40 w-full max-w-sm">
    <div className="absolute inset-0 [--grid:color-mix(in_oklab,var(--primary)_14%,transparent)] bg-[linear-gradient(to_right,var(--grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid)_1px,transparent_1px)] bg-size-[20px_20px] mask-[radial-gradient(ellipse_at_center,black_45%,transparent_100%)]" />
    {BLUEPRINT_CORNERS.map((corner) => (
      <Plus
        key={corner}
        strokeWidth={1.5}
        className={cn("absolute size-3.5 text-primary/60", corner)}
      />
    ))}
    <div className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-primary-20 bg-background text-primary shadow-[0_10px_24px_-8px_color-mix(in_oklab,var(--primary)_35%,transparent)]">
      <Layers className="size-7" strokeWidth={1.75} />
    </div>
  </div>
);

export const RecordGridEmpty = memo(function RecordGridEmpty({
  title = "No records yet",
  description = "Records you create will show up here.",
  actionLabel,
  onAction,
}: ModuleAppEmptyState) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      {BLUEPRINT}
      <p className="mt-2 font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <ModuleAddNewButton
          label={actionLabel}
          onClick={onAction}
          className="mt-1"
        />
      )}
    </div>
  );
});
