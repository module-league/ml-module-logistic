"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate, type Locale } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { Select2, SelectItem } from "./select";
import { enUS } from "date-fns/locale";

export type CalendarProps = DayPickerProps & {
  /**
   * In the year view, the number of years to display at once.
   * @default 12
   */
  yearRange?: number;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  yearRange = 12,
  ...props
}: CalendarProps) {
  const { components, ...others } = props;

  const YEARS = React.useMemo(() => genYears(yearRange), [yearRange]);
  const MONTHS = React.useMemo(() => {
    let locale: Pick<Locale, "options" | "localize" | "formatLong"> = enUS;
    const { options, localize, formatLong } = props.locale || {};
    if (options && localize && formatLong) {
      locale = {
        options,
        localize,
        formatLong,
      };
    }
    return genMonths(locale);
  }, [props.locale]);

  const [currentMonth, setCurrentMonth] = React.useState(
    props.defaultMonth || new Date(),
  );
  const handleMonthChange = (newMonth: Date) => {
    setCurrentMonth(newMonth);
    props.onMonthChange?.(newMonth);
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months:
          "flex flex-col sm:flex-row space-y-4 relative sm:space-y-0 justify-center",
        month: "flex flex-col items-center space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center absolute top-0 right-0 px-1",
        button_previous: buttonVariants({ variant: "outline", size: "icon" }),
        button_next: buttonVariants({ variant: "outline", size: "icon" }),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: cn("flex", props.showWeekNumber && "justify-end"),
        weekday: "text-muted-foreground rounded-md w-10 font-normal text-sm",
        week: "flex w-full mt-2",
        day: cn(
          "p-0 size-10 text-sm flex-1 flex items-center justify-center rounded-md",
          "has-[button]:hover:bg-accent-hover has-[button]:hover:text-accent-foreground",
          "has-[button]:hover:aria-selected:bg-primary! has-[button]:hover:aria-selected:text-primary-foreground",
        ),
        // day: cn(
        //   "size-10 text-center text-sm p-0 relative",
        //   "[&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent",
        //   "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 rounded-1",
        // ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "text-inherit cursor-pointer size-10 p-0 font-normal transition-none",
          "hover:bg-transparent hover:text-inherit aria-selected:opacity-100",
        ),
        range_start: "rounded-r-none",
        range_end: "rounded-l-none",
        selected: cn(
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          "focus:bg-primary focus:text-primary-foreground rounded-l-md rounded-r-md",
        ),
        today: "bg-accent text-accent-foreground",
        outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground rounded-none!",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ ...props }) =>
          props.orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
        MonthCaption: ({ calendarMonth }) => {
          return (
            <div className="inline-flex gap-1 self-start">
              <Select2
                value={currentMonth.getMonth().toString()}
                onValueChange={(value) => {
                  const newDate = new Date(calendarMonth.date);
                  newDate.setMonth(Number.parseInt(value, 10));
                  handleMonthChange(newDate);
                }}
                className="w-fit gap-1 border-none text-sm focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent"
              >
                {MONTHS.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </Select2>
              <Select2
                value={currentMonth.getFullYear().toString()}
                onValueChange={(value) => {
                  const newDate = new Date(calendarMonth.date);
                  newDate.setFullYear(Number.parseInt(value, 10));
                  handleMonthChange(newDate);
                }}
                className="w-fit gap-1 border-none text-sm focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent"
              >
                {YEARS.map((year) => (
                  <SelectItem key={year.value} value={year.value.toString()}>
                    {year.label}
                  </SelectItem>
                ))}
              </Select2>
            </div>
          );
        },
        ...components,
      }}
      month={currentMonth}
      onMonthChange={handleMonthChange}
      {...others}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

function genMonths(
  locale: Pick<Locale, "options" | "localize" | "formatLong">,
) {
  return Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: formatDate(new Date(2021, i), "MMMM", { locale }),
  }));
}

function genYears(yearRange = 50) {
  const today = new Date();
  return Array.from({ length: yearRange * 2 + 1 }, (_, i) => ({
    value: today.getFullYear() - yearRange + i,
    label: (today.getFullYear() - yearRange + i).toString(),
  }));
}
