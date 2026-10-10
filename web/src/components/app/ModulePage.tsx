import type { ReactNode } from "react";
import { PageHeader } from "@moduleleague/ui";
import { useCurrentNavItem } from "./nav-item-context";
 
interface ModulePageProps {
  /** Buttons shown on the right of the page header. */
  actions?: ReactNode;
  children: ReactNode;
}
 
/**
 * Wrap every sidebar page in src/pages with this.
 * Title and description come from src/config/config.ts, so the sidebar label
 * and the page header can never disagree.
 */
export function ModulePage({ actions, children }: ModulePageProps) {
  const item = useCurrentNavItem();
 
  return (
    <div className="flex flex-col">
      <PageHeader title={item.text} description={item.description} actions={actions} />
      {children}
    </div>
  );
}
