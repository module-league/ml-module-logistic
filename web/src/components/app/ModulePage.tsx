import { useCallback, type ReactNode } from "react";
import { PageHeader, toast } from "@moduleleague/ui";
import { SAMPLE_PEOPLE } from "../../services/sample-data";
import { useCurrentNavItem } from "../../context/navItem.context";

interface ModulePageProps {
  /** Buttons shown on the right of the page header. */
  actions?: ReactNode;
  children: ReactNode;
}

export function ModulePage({ actions, children }: ModulePageProps) {
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
      {children}
    </div>
  );
}
