import type { ReactNode } from "react";
import { Button, cn, Skeleton } from "@moduleleague/ui";
import { errorParser } from "@/hooks/useErrorParser";
import { hasContent } from "@/lib/nodeHelper";
import type { DashboardWidgetFrameProps } from "../moduleDashboard.types";

/** The card every widget but a metric sits in: its title, an aside on the right, then its body. */
export function DashboardWidgetFrame({
  title,
  aside,
  children,
  className,
}: DashboardWidgetFrameProps) {
  return (
    <section
      className={cn(
        "flex h-full min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground",
        className,
      )}
    >
      <header className="flex min-w-0 items-center justify-between gap-3">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        {hasContent(aside) && (
          <div className="shrink-0 truncate text-xs text-muted-foreground">
            {aside}
          </div>
        )}
      </header>
      {children}
    </section>
  );
}

/** Loading lines while a widget's table loads. */
export function DashboardWidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-label="Loading records">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("h-4", index % 2 !== 0 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** A quiet message in place of a widget's body: nothing matches, or a setting is missing. */
export function DashboardWidgetMessage({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center text-xs text-muted-foreground">
      <p className="max-w-64">{children}</p>
      {action}
    </div>
  );
}

/** Why a widget's records didn't load, with Try again. */
export function DashboardWidgetError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <DashboardWidgetMessage
      action={
        <Button variant="outline" size="xs" onClick={onRetry}>
          Try again
        </Button>
      }
    >
      Couldn't load the records. {errorParser(error)?.message}
    </DashboardWidgetMessage>
  );
}
