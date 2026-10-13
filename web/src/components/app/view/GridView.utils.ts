export function columnsFor(width: number) {
  if (width >= 900) return 3;
  if (width >= 560) return 2;
  return 1;
}
