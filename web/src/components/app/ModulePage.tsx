import type { ReactNode } from "react";
import { PageHeader } from "@moduleleague/ui";
import { useCurrentNavItem } from "./nav-item-context";

interface ModulePageProps {
  /** Buttons shown on the right of the page header. */
  actions?: ReactNode;
  children: ReactNode;
}

export function ModulePage({ actions, children }: ModulePageProps) {
  const item = useCurrentNavItem();

  return (
    <div className="flex flex-col">
      <PageHeader
        title={item.text}
        description={item.description}
        actions={actions}
      />
      {children}
    </div>
  );
}
