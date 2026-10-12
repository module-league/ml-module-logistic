import { LayoutGrid, TableProperties } from "lucide-react";
import type {
  PageToolbarFilterValue,
  PageToolbarViewOption,
} from "./pageToolbar.types";

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
