import { useMemo, useState, type CSSProperties } from "react";
import { Clock, X } from "lucide-react";
import {
  Button,
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
  TimePicker,
} from "@/ui-kit";
import {
  formatFieldTime,
  parseFieldTime,
  toFieldTimeValue,
} from "@/lib/dateHelper";
import { RECORD_INPUT_CLASS } from "./recordInput.utils";

/**
 * A time field's input: shows the time in the field's 12- or 24-hour format, stores it as "HH:mm".
 * @example
 * <RecordTimeInput field={field} value="14:30" onChange={setValue} />
 */
export function RecordTimeInput({
  id,
  field,
  value,
  onChange,
  placeholder,
  disabled,
  defaultOpen = false,
  className,
  style,
}: {
  id?: string;
  field: Pick<IField, "timeFormat">;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  defaultOpen?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const date = useMemo(() => parseFieldTime(value), [value]);
  const text = useMemo(() => formatFieldTime(field, value), [field, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          className={cn(
            RECORD_INPUT_CLASS,
            "flex w-full cursor-pointer items-center gap-2 border bg-background px-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          style={style}
        >
          <Clock className="size-4 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              "flex-1 truncate tabular-nums",
              !text && "text-muted-foreground",
            )}
          >
            {text || placeholder || "Pick a time"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-auto flex-col gap-2 p-3">
        <TimePicker
          date={date}
          hourCycle={field?.timeFormat === "HH:mm" ? 24 : 12}
          granularity="minute"
          onChange={(next) => onChange?.(toFieldTimeValue(next))}
        />
        {!!value && (
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground hover:text-foreground"
            startIcon={<X size={13} />}
            onClick={() => {
              onChange?.("");
              setOpen(false);
            }}
          >
            Clear time
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
