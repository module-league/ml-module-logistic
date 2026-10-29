import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The --spacing-* tokens of styles/layout.css, so h-page-header and h-10 are known to conflict
const twMerge = extendTailwindMerge({
  extend: { theme: { spacing: ["page-header", "page-toolbar", "dialog"] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
