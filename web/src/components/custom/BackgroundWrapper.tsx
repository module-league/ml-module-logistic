import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** How strongly the module's theme gradient shows through; dark mode is always fainter so text keeps its contrast. */
export type BackgroundIntensity = "faint" | "subtle" | "medium";

const INTENSITY_CLASS: Record<BackgroundIntensity, string> = {
  faint: "opacity-15 dark:opacity-5",
  subtle: "opacity-30 dark:opacity-10",
  medium: "opacity-50 dark:opacity-15",
};

interface BackgroundWrapperProps extends ComponentProps<"div"> {
  /** @default "subtle" */
  intensity?: BackgroundIntensity;
}

/**
 * A page surface tinted with the module's theme gradient (--module-backdrop, which follows the preset picked in settings), at
 * low opacity over the normal background, so a page matches the shell around it. Lay the page out with className as on any div.
 * @example
 * <BackgroundWrapper className="flex h-full flex-col gap-3 p-4">
 *   <Board />
 * </BackgroundWrapper>
 */
export function BackgroundWrapper({
  intensity = "subtle",
  className,
  children,
  ...props
}: BackgroundWrapperProps) {
  return (
    <div className={cn("relative isolate bg-background", className)} {...props}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 bg-(image:--module-backdrop)",
          INTENSITY_CLASS[intensity],
        )}
      />
      {children}
    </div>
  );
}
