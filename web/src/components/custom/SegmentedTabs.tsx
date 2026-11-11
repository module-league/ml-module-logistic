import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@moduleleague/ui";

export interface SegmentedTabOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Before the label, e.g. a lucide icon at size-3.5. */
  icon?: ReactNode;
  /** A badge after the label, e.g. how many items the tab holds. */
  count?: number;
}

interface SegmentedTabsProps<T extends string> {
  /** What the tabs switch, for screen readers, e.g. "Status". */
  label: string;
  value: T;
  options: SegmentedTabOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Tabs with an underline that slides to the picked one; arrow keys move between them.
 * Stretch it to the height of its bar (e.g. `self-stretch`) so the underline sits on the bar's bottom border.
 * @example
 * <SegmentedTabs label="Status" value={tab} options={[{ value: "open", label: "Open", icon: <CircleAlert />, count: 2 }]} onChange={setTab} />
 */
export function SegmentedTabs<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedTabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState<{ left: number; width: number }>();

  // The underline spans the picked tab's icon, label and badge, and follows it whenever they change size
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const active = list.querySelector<HTMLElement>(
        '[aria-selected="true"] [data-tab-content]',
      );
      if (!active) return setLine(undefined);
      const next = { left: active.offsetLeft, width: active.offsetWidth };
      setLine((current) =>
        current?.left === next.left && current.width === next.width
          ? current
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [value, options]);

  const move = (event: KeyboardEvent, index: number) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    const tabs = listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]');
    tabs?.[options.indexOf(next)]?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={cn("relative flex w-fit items-stretch gap-1", className)}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "flex min-h-8 cursor-pointer items-center px-2.5 text-sm font-medium transition-colors duration-200 ease-in-out focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              isSelected
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span data-tab-content className="flex items-center gap-1.5">
              {option.icon}
              {option.label}
              {option.count !== undefined && (
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums transition-colors duration-200 ease-in-out",
                    isSelected
                      ? "bg-primary-10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {option.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
      {line && (
        <span
          aria-hidden
          className="absolute bottom-0 left-0 h-0.5 rounded-full bg-primary transition-[transform,width] duration-200 ease-in-out motion-reduce:transition-none"
          style={{ width: line.width, transform: `translateX(${line.left}px)` }}
        />
      )}
    </div>
  );
}
