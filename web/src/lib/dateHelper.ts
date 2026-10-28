import {
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  format as fnsFormat,
  parse as fnsParse,
  isSameDay,
  isSameMonth,
  isSameWeek,
  isThisYear,
  isValid,
  parseISO,
} from "date-fns";

/**
 * Parse date object to default system format (ISO)
 */
export function dateToString(
  date: Date | string = new Date(),
  /** @default "yyyy-MM-dd'T'HH:mm:ss'Z'"*/
  format: string = "yyyy-MM-dd'T'HH:mm:ss'Z'",
) {
  if (typeof date === "string") {
    return fnsFormat(new Date(date), format);
  } else {
    return fnsFormat(date, format);
  }
}

/**
 * Parse date object to user friendly format (Without timestamp)
 */
export function dateToFriendlyString(
  /** @default new Date() */
  date: Date | string = new Date(),
  /** @default "dd MMM yyyy" */
  format: string = "dd MMM yyyy",
) {
  return dateToString(date, format);
}

/**
 * Parse date object to user friendly format (With timestamp)
 */
export function dateToFriendlyLongString(
  /** @default new Date() */
  date: Date | string = new Date(),
  /** @default "dd MMM yyyy, hh:mm:ss a" */
  format: string = "dd MMM yyyy, hh:mm:ss a",
) {
  return dateToString(date, format);
}

export function parseDate(
  date?: string,
  format = "yyyy-MM-dd'T'HH:mm:ss'Z'",
  referenceDate = new Date(),
): Date {
  if (date == null || date === "") {
    return new Date();
  } else {
    return fnsParse(date, format, referenceDate);
  }
}

/** Simple extension to `date-fns` `formatDate` */
export function formatDate(
  date: Date | string,
  options?: {
    omitSameYear?: boolean;
    includeTime?: boolean;
  },
) {
  if (options?.omitSameYear === true && isThisYear(date)) {
    if (options.includeTime === true) {
      return fnsFormat(date, "dd MMM, hh:mm a");
    } else {
      return fnsFormat(date, "dd MMM");
    }
  } else {
    if (options?.includeTime === true) {
      return fnsFormat(date, "dd MMM yyyy, hh:mm a");
    } else {
      return fnsFormat(date, "dd MMM yyyy");
    }
  }
}

export function formatDateDistance(
  dateStart: Date | string | undefined,
  dateEnd: Date | string | undefined = new Date(),
) {
  if (dateStart === undefined || dateStart === "") return;

  const _dateStart = new Date(dateStart);
  const _dateEnd = new Date(dateEnd);

  const daysAgo = Math.abs(differenceInDays(_dateStart, _dateEnd));
  const monthsAgo = Math.abs(differenceInMonths(_dateStart, _dateEnd));
  const yearsAgo = Math.abs(differenceInYears(_dateStart, _dateEnd));

  if (isSameDay(_dateStart, _dateEnd)) {
    return `today`;
  } else if (daysAgo === 1) {
    return `yesterday`;
  } else if (isSameWeek(_dateStart, _dateEnd)) {
    return `this week`;
  } else if (isSameMonth(_dateStart, _dateEnd)) {
    return `this month`;
  } else if (daysAgo < 31) {
    return `${daysAgo} day(s) ago`;
  } else if (monthsAgo < 12) {
    return `${monthsAgo} month(s) ago`;
  } else {
    return `${yearsAgo} year(s) ago`;
  }
}

type FieldDateSettings = Partial<
  Pick<IField, "dateFormat" | "displayTime" | "timeFormat">
>;

/** The date-fns pattern a date field shows its values in, e.g. "dd/MM/yyyy hh:mm a". */
export function fieldDateFormat(field?: FieldDateSettings) {
  const date = field?.dateFormat ?? "dd/MM/yyyy";
  return field?.displayTime === true
    ? `${date} ${field.timeFormat ?? "hh:mm a"}`
    : date;
}

/** A stored date value ("yyyy-MM-dd" or an ISO date-time) as a local Date. */
export function parseFieldDate(value?: string | null) {
  if (value == null || value === "") return undefined;
  const date = parseISO(value);
  return isValid(date) ? date : undefined;
}

/** What a date field stores: "yyyy-MM-dd", or a UTC ISO string when it shows time. */
export function toFieldDateValue(
  field: FieldDateSettings | undefined,
  date?: Date,
) {
  if (!date) return "";
  return field?.displayTime === true
    ? date.toISOString()
    : fnsFormat(date, "yyyy-MM-dd");
}

/** A stored time value ("HH:mm", 24-hour) as today's Date at that time. */
export function parseFieldTime(value?: string | null) {
  const [, hours, minutes] =
    /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value ?? "") ?? [];
  if (hours == null || hours === "") return undefined;
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date;
}

/** What a time field stores: "HH:mm", 24-hour, whatever format it shows in. */
export function toFieldTimeValue(date?: Date) {
  return date ? fnsFormat(date, "HH:mm") : "";
}

/** A stored time in the field's 12- or 24-hour format, e.g. "02:30 PM". */
export function formatFieldTime(
  field: Pick<IField, "timeFormat"> | undefined,
  value?: string | null,
) {
  const date = parseFieldTime(value);
  return date ? fnsFormat(date, field?.timeFormat ?? "hh:mm a") : "";
}

export function formatFieldDate(
  field: FieldDateSettings | undefined,
  value?: string | null,
) {
  const date = parseFieldDate(value);
  return date ? fnsFormat(date, fieldDateFormat(field)) : "";
}
