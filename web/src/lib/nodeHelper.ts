import type { ReactNode } from "react";

/**
 * Whether React draws anything for the node: null, undefined, booleans and "" render nothing.
 * @param node - Content passed as children or a slot prop.
 * @returns True when there is something to wrap or show.
 * @example
 * {hasContent(aside) && <div>{aside}</div>}
 */
export function hasContent(node: ReactNode): boolean {
  return node != null && typeof node !== "boolean" && node !== "";
}
