import { z } from "zod";

/** The first message of each failing path, keyed like "name" or "lookupSettings.categoryId"; empty when the value passes. */
export function zodErrors(schema: z.ZodType, value: unknown) {
  const errors: Record<string, string> = {};
  for (const issue of schema.safeParse(value)?.error?.issues ?? []) {
    errors[issue.path.join(".")] ??= issue.message;
  }
  return errors;
}

/** One record value, checked the way the API checks it; a blank value always passes. */
export function recordValueSchema(field?: IField) {
  switch (field?.type) {
    case "number":
    case "currency":
      return z
        .string()
        .trim()
        .regex(/^(-?(\d+\.?\d*|\.\d+))?$/, "Enter a number, like 12.5.")
        .refine(
          (value) => value.replace(/\D/g, "").length <= 28,
          "Use up to 28 digits.",
        );
    case "time":
      return z
        .string()
        .regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/, "Enter a time like 14:30.");
    case "text":
    case "long_text":
      return z.string().trim().max(1000, "Use up to 1000 characters.");
    default:
      return z.unknown();
  }
}

/** Why a record value can't be saved, or undefined when it can. */
export function recordValueError(field: IField | undefined, value: unknown) {
  return recordValueSchema(field).safeParse(value)?.error?.issues?.[0]?.message;
}

/** The record form's values, one per field in field order; an error lands on its field's input. */
export function recordValuesSchema(fields?: IField[]) {
  return z.object({
    values: z.array(z.string()).superRefine((values, ctx) =>
      fields?.forEach((field, index) => {
        const message = recordValueError(field, values?.[index]);
        if (message) ctx.addIssue({ code: "custom", path: [index], message });
      }),
    ),
  });
}
