import {
  absDependencies,
  addDependencies,
  ceilDependencies,
  create,
  divideDependencies,
  floorDependencies,
  maxDependencies,
  meanDependencies,
  minDependencies,
  modDependencies,
  multiplyDependencies,
  parseDependencies,
  powDependencies,
  roundDependencies,
  sqrtDependencies,
  subtractDependencies,
  sumDependencies,
  unaryMinusDependencies,
  unaryPlusDependencies,
} from "mathjs";

/** The functions a formula can call, as the editor suggests them; math.js knows no others here. */
export const FORMULA_FUNCTIONS = [
  {
    name: "round",
    signature: "round(value, decimals)",
    description: "Rounds to the decimal places given, or to a whole number.",
  },
  {
    name: "sum",
    signature: "sum(a, b, …)",
    description: "Adds the values together.",
  },
  {
    name: "mean",
    signature: "mean(a, b, …)",
    description: "The average of the values.",
  },
  {
    name: "min",
    signature: "min(a, b, …)",
    description: "The smallest value.",
  },
  { name: "max", signature: "max(a, b, …)", description: "The largest value." },
  {
    name: "abs",
    signature: "abs(value)",
    description: "The value without its minus sign.",
  },
  {
    name: "floor",
    signature: "floor(value)",
    description: "Rounds down to a whole number.",
  },
  {
    name: "ceil",
    signature: "ceil(value)",
    description: "Rounds up to a whole number.",
  },
  { name: "sqrt", signature: "sqrt(value)", description: "The square root." },
];

const math = create(
  {
    parseDependencies,
    addDependencies,
    subtractDependencies,
    multiplyDependencies,
    divideDependencies,
    modDependencies,
    powDependencies,
    unaryMinusDependencies,
    unaryPlusDependencies,
    roundDependencies,
    sumDependencies,
    meanDependencies,
    minDependencies,
    maxDependencies,
    absDependencies,
    floorDependencies,
    ceilDependencies,
    sqrtDependencies,
  },
  { number: "number" },
);
const parse = math.parse;
// A formula is typed by people, so it can't reach the instance itself
math.import(
  {
    import: () => {
      throw new Error("import isn't available in a formula.");
    },
    parse: () => {
      throw new Error("parse isn't available in a formula.");
    },
  },
  { override: true },
);

/** A field in a formula: {fieldObjId} as saved, {Field name} in the editor. */
const REFERENCE = /\{([^{}]*)\}/g;
const scopeName = (index: number) => `__f${index}`;

type CompiledFormula =
  | { ids: string[]; evaluate: (scope: Record<string, number>) => unknown }
  | { error: string };
const compiled = new Map<string, CompiledFormula>();

/** The fields a formula can read. */
export const isFormulaInput = (field?: Pick<IField, "type">) =>
  field?.type === "number" || field?.type === "currency";

/** Parses a saved expression once; its field references become scope names. */
function compileFormula(expression: string): CompiledFormula {
  const cached = compiled.get(expression);
  if (cached) return cached;
  const ids: string[] = [];
  const text = expression.replace(REFERENCE, (_, id: string) => {
    if (!ids.includes(id)) ids.push(id);
    return scopeName(ids.indexOf(id));
  });
  let result: CompiledFormula;
  try {
    const code = parse(text).compile();
    result = { ids, evaluate: (scope) => code.evaluate(scope) };
  } catch (error) {
    result = { error: (error as Error).message };
  }
  compiled.set(expression, result);
  return result;
}

/** Runs a formula over field values; an empty field counts as 0. Undefined when it doesn't work out to a number, e.g. after dividing by 0. */
export function evaluateFormula(
  expression: string | undefined,
  values?: Record<string, string | null | undefined>,
) {
  if (!expression?.trim()) return undefined;
  const formula = compileFormula(expression);
  if ("error" in formula) return undefined;
  try {
    const result = formula.evaluate(
      Object.fromEntries(
        formula.ids.map((id, index) => [
          scopeName(index),
          Number(values?.[id]) || 0,
        ]),
      ),
    );
    // Drops floating point noise, e.g. 0.1 + 0.2
    return typeof result === "number" && Number.isFinite(result)
      ? Number.parseFloat(result.toPrecision(12))
      : undefined;
  } catch {
    return undefined;
  }
}

/** A formula field's value for a record, as stored numbers are: plain text. */
export function formulaValue(
  field: Pick<IField, "formulaSettings">,
  values?: Record<string, string | null | undefined>,
) {
  return evaluateFormula(
    field?.formulaSettings?.expression,
    values,
  )?.toString();
}

/** Why a saved expression can't be worked out, or undefined when it can. */
export function formulaError(expression: string) {
  if (!expression.trim()) return "Write the formula.";
  const formula = compileFormula(expression);
  if ("error" in formula) return formula.error;
  try {
    const sample = formula.evaluate(
      Object.fromEntries(formula.ids.map((_, index) => [scopeName(index), 1])),
    );
    if (typeof sample !== "number")
      return "The formula must work out to one number.";
  } catch (error) {
    return (error as Error).message.replace(/__f\d+/g, "a field");
  }
  return undefined;
}

/** A saved expression as the editor shows it: each {fieldObjId} as {Field name}. */
export function toFormulaText(
  expression: string | undefined,
  fields: ISidebarField[],
) {
  return (expression ?? "").replace(
    REFERENCE,
    (_, id: string) =>
      `{${fields.find((field) => field.objId === id)?.name ?? "Unknown field"}}`,
  );
}

/** What the editor shows, as saved: each {Field name} as {fieldObjId}; names that aren't a number field are listed in unknown. */
export function fromFormulaText(text: string, fields: ISidebarField[]) {
  const unknown: string[] = [];
  const expression = text.replace(REFERENCE, (match, name: string) => {
    const field = fields.find(
      (entry) => entry.name.toLowerCase() === name.trim().toLowerCase(),
    );
    if (!field) unknown.push(name);
    return field ? `{${field.objId}}` : match;
  });
  return { expression: expression.trim(), unknown };
}
