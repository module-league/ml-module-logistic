import { Button, buttonVariants } from "@/components/ui/button";
import type { CalendarProps } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { add, addYears, format, parse } from "date-fns";
import { enUS } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Clock } from "lucide-react";
import * as React from "react";
import { useImperativeHandle, useRef } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DayPicker, type DropdownProps } from "react-day-picker";
import { maskitoInitialCalibrationPlugin } from "@maskito/core";
import { useMaskito } from "@maskito/react";
import {
  maskitoWithPlaceholder,
  maskitoDateOptionsGenerator,
  maskitoDateTimeOptionsGenerator,
} from "@maskito/kit";

// ---------- utils start ----------
/**
 * regular expression to check for valid hour format (01-23)
 */
function isValidHour(value: string) {
  return /^(0[0-9]|1[0-9]|2[0-3])$/.test(value);
}

/**
 * regular expression to check for valid 12 hour format (01-12)
 */
function isValid12Hour(value: string) {
  return /^(0[1-9]|1[0-2])$/.test(value);
}

/**
 * regular expression to check for valid minute format (00-59)
 */
function isValidMinuteOrSecond(value: string) {
  return /^[0-5][0-9]$/.test(value);
}

type GetValidNumberConfig = { max: number; min?: number; loop?: boolean };

function getValidNumber(
  value: string,
  { max, min = 0, loop = false }: GetValidNumberConfig,
) {
  let numericValue = parseInt(value, 10);

  if (!Number.isNaN(numericValue)) {
    if (!loop) {
      if (numericValue > max) numericValue = max;
      if (numericValue < min) numericValue = min;
    } else {
      if (numericValue > max) numericValue = min;
      if (numericValue < min) numericValue = max;
    }
    return numericValue.toString().padStart(2, "0");
  }

  return "00";
}

function getValidHour(value: string) {
  if (isValidHour(value)) return value;
  return getValidNumber(value, { max: 23 });
}

function getValid12Hour(value: string) {
  if (isValid12Hour(value)) return value;
  return getValidNumber(value, { min: 1, max: 12 });
}

function getValidMinuteOrSecond(value: string) {
  if (isValidMinuteOrSecond(value)) return value;
  return getValidNumber(value, { max: 59 });
}

type GetValidArrowNumberConfig = {
  min: number;
  max: number;
  step: number;
};

function getValidArrowNumber(
  value: string,
  { min, max, step }: GetValidArrowNumberConfig,
) {
  let numericValue = parseInt(value, 10);
  if (!Number.isNaN(numericValue)) {
    numericValue += step;
    return getValidNumber(String(numericValue), { min, max, loop: true });
  }
  return "00";
}

function getValidArrowHour(value: string, step: number) {
  return getValidArrowNumber(value, { min: 0, max: 23, step });
}

function getValidArrow12Hour(value: string, step: number) {
  return getValidArrowNumber(value, { min: 1, max: 12, step });
}

function getValidArrowMinuteOrSecond(value: string, step: number) {
  return getValidArrowNumber(value, { min: 0, max: 59, step });
}

function setMinutes(date: Date, value: string) {
  const minutes = getValidMinuteOrSecond(value);
  date.setMinutes(parseInt(minutes, 10));
  return date;
}

function setSeconds(date: Date, value: string) {
  const seconds = getValidMinuteOrSecond(value);
  date.setSeconds(parseInt(seconds, 10));
  return date;
}

function setHours(date: Date, value: string) {
  const hours = getValidHour(value);
  date.setHours(parseInt(hours, 10));
  return date;
}

function set12Hours(date: Date, value: string, period: Period) {
  const hours = parseInt(getValid12Hour(value), 10);
  const convertedHours = convert12HourTo24Hour(hours, period);
  date.setHours(convertedHours);
  return date;
}

type TimePickerType = "minutes" | "seconds" | "hours" | "12hours";
type Period = "AM" | "PM";

function setDateByType(
  date: Date,
  value: string,
  type: TimePickerType,
  period?: Period,
) {
  switch (type) {
    case "minutes":
      return setMinutes(date, value);
    case "seconds":
      return setSeconds(date, value);
    case "hours":
      return setHours(date, value);
    case "12hours": {
      if (!period) return date;
      return set12Hours(date, value, period);
    }
    default:
      return date;
  }
}

function getDateByType(date: Date | null, type: TimePickerType) {
  if (!date) return "00";
  switch (type) {
    case "minutes":
      return getValidMinuteOrSecond(String(date.getMinutes()));
    case "seconds":
      return getValidMinuteOrSecond(String(date.getSeconds()));
    case "hours":
      return getValidHour(String(date.getHours()));
    case "12hours":
      return getValid12Hour(String(display12HourValue(date.getHours())));
    default:
      return "00";
  }
}

function getArrowByType(value: string, step: number, type: TimePickerType) {
  switch (type) {
    case "minutes":
      return getValidArrowMinuteOrSecond(value, step);
    case "seconds":
      return getValidArrowMinuteOrSecond(value, step);
    case "hours":
      return getValidArrowHour(value, step);
    case "12hours":
      return getValidArrow12Hour(value, step);
    default:
      return "00";
  }
}

/**
 * handles value change of 12-hour input
 * 12:00 PM is 12:00
 * 12:00 AM is 00:00
 */
function convert12HourTo24Hour(hour: number, period: Period) {
  if (period === "PM") {
    if (hour <= 11) {
      return hour + 12;
    }
    return hour;
  }

  if (period === "AM") {
    if (hour === 12) return 0;
    return hour;
  }
  return hour;
}

/**
 * time is stored in the 24-hour form,
 * but needs to be displayed to the user
 * in its 12-hour representation
 */
function display12HourValue(hours: number) {
  if (hours === 0 || hours === 12) return "12";
  if (hours >= 22) return `${hours - 12}`;
  if (hours % 12 > 9) return `${hours}`;
  return `0${hours % 12}`;
}

// ---------- utils end ----------

function CalendarDropdown({
  options,
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: DropdownProps) {
  const selected = React.useMemo(
    () => options?.find((option) => String(option?.value) === String(value)),
    [options, value],
  );
  const change = React.useCallback(
    (next: string) =>
      onChange?.({
        target: { value: next },
      } as React.ChangeEvent<HTMLSelectElement>),
    [onChange],
  );

  return (
    <Select value={String(value)} onValueChange={change} disabled={disabled}>
      <SelectTrigger
        aria-label={ariaLabel}
        className="h-7 w-auto gap-1 rounded-md border-none bg-transparent px-2 text-sm font-medium shadow-none hover:bg-primary-10 focus:ring-0 data-[state=open]:bg-primary-10"
      >
        <SelectValue>{selected?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-64 min-w-28">
        {options?.map((option) => (
          <SelectItem
            key={option.value}
            value={String(option.value)}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps & { yearRange?: number }) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months:
          "flex flex-col sm:flex-row space-y-4  sm:space-y-0 justify-center",
        month: "flex flex-col items-center space-y-4",
        month_caption: "flex justify-center pt-2 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center ",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-5 top-5",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-5 top-5",
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: cn("flex", props.showWeekNumber && "justify-end"),
        weekday:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 rounded-1",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal text-inherit aria-selected:opacity-100 rounded-l-md rounded-r-md hover:text-inherit",
        ),
        range_end: "day-range-end",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-l-md rounded-r-md",
        today: "bg-accent text-accent-foreground",
        outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        dropdowns: "flex items-center gap-1",
        ...classNames,
      }}
      components={{
        Dropdown: CalendarDropdown,
        Chevron: ({ ...props }) =>
          props.orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}

interface PeriodSelectorProps {
  period: Period;
  setPeriod?: (m: Period) => void;
  date?: Date | null;
  onDateChange?: (date: Date | undefined) => void;
  onRightFocus?: () => void;
  onLeftFocus?: () => void;
}

const TimePeriodSelect = React.forwardRef<
  HTMLButtonElement,
  PeriodSelectorProps
>(function TimePeriodSelect(
  { period, setPeriod, date, onDateChange, onLeftFocus, onRightFocus },
  ref,
) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowRight") onRightFocus?.();
    if (e.key === "ArrowLeft") onLeftFocus?.();
  };

  const handleValueChange = (value: Period) => {
    setPeriod?.(value);

    /**
     * trigger an update whenever the user switches between AM and PM;
     * otherwise user must manually change the hour each time
     */
    if (date) {
      const tempDate = new Date(date);
      const hours = display12HourValue(date.getHours());
      onDateChange?.(
        setDateByType(
          tempDate,
          hours.toString(),
          "12hours",
          period === "AM" ? "PM" : "AM",
        ),
      );
    }
  };

  return (
    <div className="flex h-8 items-center">
      <Select
        defaultValue={period}
        onValueChange={(value: Period) => handleValueChange(value)}
      >
        <SelectTrigger
          ref={ref}
          className="w-20 focus:bg-accent focus:text-accent-foreground"
          onKeyDown={handleKeyDown}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
});

interface TimePickerInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  picker: TimePickerType;
  date?: Date | null;
  onDateChange?: (date: Date | undefined) => void;
  period?: Period;
  onRightFocus?: () => void;
  onLeftFocus?: () => void;
}

const TimePickerInput = React.forwardRef<
  HTMLInputElement,
  TimePickerInputProps
>(function TimePickerInput(
  {
    className,
    type = "tel",
    value,
    id,
    name,
    date = new Date(new Date().setHours(0, 0, 0, 0)),
    onDateChange,
    onChange,
    onKeyDown,
    picker,
    period,
    onLeftFocus,
    onRightFocus,
    ...props
  },
  ref,
) {
  const [flag, setFlag] = React.useState<boolean>(false);
  const [prevIntKey, setPrevIntKey] = React.useState<string>("0");

  /**
   * allow the user to enter the second digit within 2 seconds
   * otherwise start again with entering first digit
   */
  React.useEffect(() => {
    if (flag) {
      const timer = setTimeout(() => {
        setFlag(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [flag]);

  const calculatedValue = React.useMemo(() => {
    return getDateByType(date, picker);
  }, [date, picker]);

  const calculateNewValue = (key: string) => {
    /*
     * If picker is '12hours' and the first digit is 0, then the second digit is automatically set to 1.
     * The second entered digit will break the condition and the value will be set to 10-12.
     */
    if (picker === "12hours") {
      if (flag && calculatedValue.slice(1, 2) === "1" && prevIntKey === "0")
        return `0${key}`;
    }

    return !flag ? `0${key}` : calculatedValue.slice(1, 2) + key;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") return;
    e.preventDefault();
    if (e.key === "ArrowRight") onRightFocus?.();
    if (e.key === "ArrowLeft") onLeftFocus?.();
    if (["ArrowUp", "ArrowDown"].includes(e.key)) {
      const step = e.key === "ArrowUp" ? 1 : -1;
      const newValue = getArrowByType(calculatedValue, step, picker);
      if (flag) setFlag(false);
      const tempDate = date ? new Date(date) : new Date();
      onDateChange?.(setDateByType(tempDate, newValue, picker, period));
    }
    if (e.key >= "0" && e.key <= "9") {
      if (picker === "12hours") setPrevIntKey(e.key);

      const newValue = calculateNewValue(e.key);
      if (flag) onRightFocus?.();
      setFlag((prev) => !prev);
      const tempDate = date ? new Date(date) : new Date();
      onDateChange?.(setDateByType(tempDate, newValue, picker, period));
    }
  };

  return (
    <Input
      ref={ref}
      id={id || picker}
      name={name || picker}
      className={cn(
        "w-[48px] text-center font-mono text-base tabular-nums caret-transparent focus:bg-accent focus:text-accent-foreground [&::-webkit-inner-spin-button]:appearance-none",
        className,
      )}
      value={value || calculatedValue}
      onChange={(e) => {
        e.preventDefault();
        onChange?.(e);
      }}
      type={type}
      inputMode="decimal"
      onKeyDown={(e) => {
        onKeyDown?.(e);
        handleKeyDown(e);
      }}
      {...props}
    />
  );
});

interface TimePickerProps {
  date?: Date | null;
  onChange?: (date: Date | undefined) => void;
  hourCycle?: 12 | 24;
  /**
   * Determines the smallest unit that is displayed in the datetime picker.
   * Default is 'second'.
   * */
  granularity?: Granularity;
}

interface TimePickerRef {
  minuteRef: HTMLInputElement | null;
  hourRef: HTMLInputElement | null;
  secondRef: HTMLInputElement | null;
}

const TimePicker = React.forwardRef<TimePickerRef, TimePickerProps>(
  function TimePicker(
    { date, onChange, hourCycle = 24, granularity = "second" },
    ref,
  ) {
    const minuteRef = React.useRef<HTMLInputElement>(null);
    const hourRef = React.useRef<HTMLInputElement>(null);
    const secondRef = React.useRef<HTMLInputElement>(null);
    const periodRef = React.useRef<HTMLButtonElement>(null);
    const [period, setPeriod] = React.useState<Period>(
      date && date.getHours() >= 12 ? "PM" : "AM",
    );

    useImperativeHandle(
      ref,
      () => ({
        minuteRef: minuteRef.current,
        hourRef: hourRef.current,
        secondRef: secondRef.current,
        periodRef: periodRef.current,
      }),
      [minuteRef, hourRef, secondRef],
    );

    return (
      <div className="flex items-center justify-center gap-2">
        <label htmlFor="datetime-picker-hour-input" className="cursor-pointer">
          <Clock className="mr-2 h-4 w-4" />
        </label>
        <TimePickerInput
          picker={hourCycle === 24 ? "hours" : "12hours"}
          date={date}
          id="datetime-picker-hour-input"
          onDateChange={onChange}
          ref={hourRef}
          period={period}
          onRightFocus={() => minuteRef.current?.focus()}
        />
        {(granularity === "minute" || granularity === "second") && (
          <>
            :
            <TimePickerInput
              picker="minutes"
              date={date}
              onDateChange={onChange}
              ref={minuteRef}
              onLeftFocus={() => hourRef.current?.focus()}
              onRightFocus={() => secondRef.current?.focus()}
            />
          </>
        )}
        {granularity === "second" && (
          <>
            :
            <TimePickerInput
              picker="seconds"
              date={date}
              onDateChange={onChange}
              ref={secondRef}
              onLeftFocus={() => minuteRef.current?.focus()}
              onRightFocus={() => periodRef.current?.focus()}
            />
          </>
        )}
        {hourCycle === 12 && (
          <div className="grid gap-1 text-center">
            <TimePeriodSelect
              period={period}
              setPeriod={setPeriod}
              date={date}
              onDateChange={(date) => {
                onChange?.(date);
                if (date && date?.getHours() >= 12) {
                  setPeriod("PM");
                } else {
                  setPeriod("AM");
                }
              }}
              ref={periodRef}
              onLeftFocus={() => secondRef.current?.focus()}
            />
          </div>
        )}
      </div>
    );
  },
);

type Granularity = "day" | "minute";

type DateTimePickerProps = {
  defaultOpen?: boolean;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  disabled?: boolean;
  disableCalendar?: CalendarProps["disabled"];
  /** showing `AM/PM` or not. */
  hourCycle?: 12 | 24;
  placeholder?: string;
  /**
   * @deprecated v2.39 onwards support text input, and has fixed format
   *
   * The format is derived from the `date-fns` documentation.
   * @reference https://date-fns.org/v3.6.0/docs/format
   * @default "yyyy-MM-dd"
   **/
  displayFormat?: string;
  /**
   * The granularity prop allows you to control the smallest unit that is displayed by DateTimePicker.
   * By default, the value is `minute`
   **/
  granularity?: Granularity;
  clearable?: boolean;
  className?: string;
  inputClassName?: string;
  style?: React.CSSProperties;
} & Pick<
  CalendarProps,
  "locale" | "weekStartsOn" | "showWeekNumber" | "showOutsideDays"
>;

type DateTimePickerRef = {
  value?: Date;
} & Omit<HTMLButtonElement, "value">;

const DateTimePicker = React.forwardRef<
  Partial<DateTimePickerRef>,
  DateTimePickerProps
>(function DateTimePicker(props, ref) {
  const {
    defaultOpen,
    // locale = enUS,
    value,
    onChange,
    disabled = false,
    // displayFormat = "yyyy-MM-dd",
    placeholder,
    className,
    inputClassName,
    style,
  } = props;

  const buttonRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      ...buttonRef.current,
      value,
    }),
    [value],
  );

  return (
    <div className={cn("relative", className)}>
      <MaskedDateInput
        key={props.value?.toISOString()}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        granularity={props.granularity}
        inputClassName={inputClassName}
      />

      <Popover defaultOpen={defaultOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="xs"
            disabled={disabled}
            aria-label="date-picker-button"
            className={cn(
              "text-black",
              "absolute right-2 top-1/2 -translate-y-1/2",
              // "justify-start text-left font-normal",
              !value && "text-muted-foreground",
              // className,
            )}
            style={style}
            ref={buttonRef}
          >
            <CalendarIcon size={14} />
            {/* <span className="truncate">
              {value ? (
                format(
                  value,
                  displayFormat,
                  // hourCycle === 24
                  //   ? initHourFormat.hour24
                  //   : initHourFormat.hour12,
                  {
                    locale: loc,
                  },
                )
              ) : (
                <span>{placeholder}</span>
              )}
            </span> */}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <DateTimePickerContent {...props} />
        </PopoverContent>
      </Popover>
    </div>
  );
});

function MaskedDateInput({
  value,
  onChange,
  placeholder,
  granularity = "minute",
  inputClassName,
}: Pick<
  DateTimePickerProps,
  "value" | "onChange" | "placeholder" | "granularity" | "inputClassName"
>) {
  const dateFormat =
    granularity === "minute" ? "dd/MM/yyyy, HH:mm" : "dd/MM/yyyy";

  const refMaskInput = useMaskito({
    options: React.useMemo(() => {
      const dateOptions =
        granularity === "day"
          ? maskitoDateOptionsGenerator({
              mode: "dd/mm/yyyy",
              separator: "/",
            })
          : maskitoDateTimeOptionsGenerator({
              dateMode: "dd/mm/yyyy",
              dateSeparator: "/",
              timeMode: "HH:MM AA",
              timeStep: 1,
              dateTimeSeparator: ", ",
            });

      const {
        plugins, // plugins keeps caret inside actual value and remove placeholder on blur
        ...placeholderOptions
      } = maskitoWithPlaceholder(dateFormat, true);

      return {
        ...dateOptions,
        plugins: [
          maskitoInitialCalibrationPlugin(),
          ...plugins,
          ...dateOptions.plugins,
        ],
        preprocessors: [
          // Always put it BEFORE all other preprocessors
          ...placeholderOptions.preprocessors,
          ...dateOptions.preprocessors,
        ],
        postprocessors: [
          ...dateOptions.postprocessors,
          // Always put it AFTER all other postprocessors
          ...placeholderOptions.postprocessors,
        ],
      };
    }, [dateFormat, granularity]),
  });

  const [internalDateVal, setInternalDateVal] = React.useState(
    !value ? "" : format(value, dateFormat),
  );

  return (
    <Input
      className={cn("w-full", inputClassName)}
      aria-label="date-input"
      ref={refMaskInput}
      placeholder={placeholder || dateFormat}
      value={internalDateVal}
      onChange={(e) => setInternalDateVal(e.target.value)}
      onBlur={() => {
        const _date = parse(internalDateVal, dateFormat, new Date());

        if (
          internalDateVal.length === dateFormat.length &&
          !isNaN(_date.valueOf())
        ) {
          onChange?.(_date);
        } else {
          setInternalDateVal(!value ? "" : format(value, dateFormat));
        }
      }}
    />
  );
}

function DateTimePickerContent({
  locale = enUS,
  value,
  onChange,
  hourCycle = 24,
  disableCalendar,
  granularity = "minute",
  clearable,
  ...props
}: DateTimePickerProps) {
  const [month, setMonth] = React.useState<Date>(value ?? new Date());

  /**
   * carry over the current time when a user clicks a new day
   * instead of resetting to 00:00
   */
  const handleSelect = (newDay: Date | undefined) => {
    if (!newDay) return;
    if (!value) {
      onChange?.(newDay);
      setMonth(newDay);
      return;
    }
    const diff = newDay.getTime() - value.getTime();
    const diffInDays = diff / (1000 * 60 * 60 * 24);
    const newDateFull = add(value, { days: Math.ceil(diffInDays) });
    onChange?.(newDateFull);
    setMonth(newDateFull);
  };

  return (
    <>
      <Calendar
        mode="single"
        selected={value}
        month={month}
        onSelect={(d) => handleSelect(d)}
        onMonthChange={setMonth}
        startMonth={new Date(0)}
        endMonth={addYears(new Date(), 20)}
        locale={locale}
        disabled={disableCalendar}
        captionLayout="dropdown"
        {...props}
      />
      {granularity !== "day" && (
        <div className="border-t border-border p-2">
          <TimePicker
            onChange={onChange}
            date={value}
            hourCycle={hourCycle}
            granularity={granularity}
          />
        </div>
      )}

      {!!clearable && (
        <div className="flex items-center gap-2 p-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onChange?.(undefined)}
            disabled={!value}
            title="Clear value"
          >
            Clear
          </Button>
        </div>
      )}
    </>
  );
}

export { DateTimePicker, TimePickerInput, TimePicker };
export type { TimePickerType, DateTimePickerProps, DateTimePickerRef };
