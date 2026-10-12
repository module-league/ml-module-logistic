import { useCallback, type ReactNode } from "react";
import { PageHeader, PageToolbar, toast } from "@moduleleague/ui";
import { SAMPLE_PEOPLE } from "../../services/sample-data";
import { useCurrentNavItem } from "../../context/navItem.context";
import type { PageToolbarProps } from "../ml/pageToolbar.types";

interface ModulePageProps {
  /** Buttons shown on the right of the page header. */
  actions?: ReactNode;
  /** Add, filter, export and search row shown under the page header. */
  toolbar?: PageToolbarProps;
  children: ReactNode;
}

export function ModulePage({ actions, toolbar, children }: ModulePageProps) {
  const item = useCurrentNavItem();
  const invitePeople = useCallback(
    () => toast.info("Inviting people comes with the API step."),
    [],
  );

  return (
    <div className="flex flex-col">
      {item?.text?.length || item?.description?.length ? (
        <PageHeader
          title={item?.text}
          description={item?.description}
          hidePageSeparator={item?.hidePageSeparator}
          actions={actions}
          people={SAMPLE_PEOPLE}
          onInvitePeople={invitePeople}
        />
      ) : (
        <></>
      )}
      {toolbar && <PageToolbar {...toolbar} />}
      {children}
    </div>
  );
}
