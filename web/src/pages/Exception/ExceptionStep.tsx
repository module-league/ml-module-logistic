import type { ReactNode } from "react";
import { cn } from "@moduleleague/ui";

interface ExceptionStepProps {
  title: string;
  hint?: string;
  /** Always on the right, so every row's controls line up. */
  actions?: ReactNode;
  /** What the row opens up under its title, e.g. an AI answer. */
  children?: ReactNode;
  className?: string;
}

/**
 * One row of the "What to do" panel: what to do on the left, its controls on the right.
 * @example
 * <ExceptionStep title="Fix the problem" actions={<Button size="xs">Link destination</Button>} />
 */
export function ExceptionStep({
  title,
  hint,
  actions,
  children,
  className,
}: ExceptionStepProps) {
  return (
    <div className={cn("flex flex-col gap-3 p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
          <h4 className="text-sm font-medium">{title}</h4>
          {hint !== undefined && (
            <p className="text-xs text-pretty text-muted-foreground">{hint}</p>
          )}
        </div>
        {actions !== undefined && (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
