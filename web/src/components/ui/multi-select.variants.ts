import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Variants for the multi-select component to handle different styles.
 * Uses class-variance-authority (cva) to define different styles based on "variant" prop.
 */
export const multiSelectNodeVariants = cva(
  cn(
    "transition h-8 px-2 py-1 inline-flex gap-1 items-center",
    "text-foreground text-xs border rounded-md",
  ),
  {
    variants: {},
  },
);
