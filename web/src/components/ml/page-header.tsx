import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  /** Main page title, e.g. "Job Orders". */
  title: string;
  /** Optional line shown under the title. */
  description?: string;
  /** Buttons or other actions shown on the right. */
  actions?: ReactNode;
  /** Extra Tailwind classes. They override the defaults. */
  className?: string;
  hidePageSeparator?: boolean;
}

/**
 * Standard header at the top of every module page.
 * @example
 * <PageHeader title="Job Orders" actions={<Button>New</Button>} />
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  hidePageSeparator = false,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex items-start justify-between gap-4 pb-4",
        !hidePageSeparator && "border-b",
        className,
      )}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
