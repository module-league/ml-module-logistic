import { LayoutGrid, TableProperties } from "lucide-react";
import type {
  PageToolbarFilterValue,
  PageToolbarViewOption,
} from "./pageToolbar.types";

/** Below this toolbar width (px), view, filter and export collapse to icons so search stays on the same row. */
export const PAGE_TOOLBAR_COMPACT_WIDTH = 640;

export const PAGE_TOOLBAR_VIEWS: PageToolbarViewOption[] = [
  { value: "list", label: "List view", icon: TableProperties },
  { value: "grid", label: "Grid view", icon: LayoutGrid },
];

export function countActiveFilters(value: PageToolbarFilterValue | undefined): number {
  return Object.values(value ?? {}).reduce(
    (total, values) => total + (values?.length ?? 0),
    0,
  );
}

export function toggleFilterValue(
  value: PageToolbarFilterValue | undefined,
  key: string,
  option: string,
  checked: boolean,
): PageToolbarFilterValue {
  const current = value?.[key] ?? [];
  return {
    ...value,
    [key]: checked
      ? [...current, option]
      : current.filter((selected) => selected !== option),
  };
}

/** Same selections, ignoring order and empty groups. */
export function sameFilterValue(
  a: PageToolbarFilterValue | undefined,
  b: PageToolbarFilterValue | undefined,
): boolean {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  return [...keys].every((key) => {
    const left = a?.[key] ?? [];
    const right = b?.[key] ?? [];
    return left.length === right.length && left.every((value) => right.includes(value));
  });
}

