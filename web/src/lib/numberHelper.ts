export type NumberSettings = NonNullable<IField["numberSettings"]>;

export const DEFAULT_NUMBER_SETTINGS: NumberSettings = {
  symbol: "$",
  decimalPlaces: 2,
  abbreviation: "none",
};

export const NUMBER_ABBREVIATIONS: Record<
  NumberSettings["abbreviation"],
  { label: string; divisor: number; suffix: string }
> = {
  none: { label: "None", divisor: 1, suffix: "" },
  thousand: { label: "Thousand", divisor: 1e3, suffix: "K" },
  million: { label: "Million", divisor: 1e6, suffix: "M" },
  billion: { label: "Billion", divisor: 1e9, suffix: "B" },
};

/** Formats a number with the field's settings: `-$34.0M` for -34000000 with symbol "$", 1 decimal place and "million". Without decimalPlaces the decimals show as typed. */
export function formatNumber(
  value: number,
  settings?: Partial<NumberSettings>,
) {
  const { divisor, suffix } =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- saved field settings may hold an abbreviation this build doesn't know
    NUMBER_ABBREVIATIONS[settings?.abbreviation ?? "none"] ??
    NUMBER_ABBREVIATIONS.none;
  const decimalPlaces = settings?.decimalPlaces;
  const amount = Math.abs(value / divisor).toLocaleString("en-US", {
    minimumFractionDigits: decimalPlaces ?? 0,
    maximumFractionDigits: decimalPlaces ?? 20,
  });
  return `${value < 0 ? "-" : ""}${settings?.symbol ?? ""}${amount}${suffix}`;
}

/** A stored number or currency value as the field shows it; the raw text when it isn't a number. */
export function formatFieldNumber(
  field: Pick<IField, "numberSettings">,
  value?: string | null,
) {
  if (value == null || value === "") return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return formatNumber(amount, field.numberSettings);
}
