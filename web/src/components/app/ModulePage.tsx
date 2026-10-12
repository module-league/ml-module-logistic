import { useCallback, useMemo, useState, type ReactNode } from "react";
import { PageHeader, ModulePageToolbar, toast } from "@moduleleague/ui";
import { SAMPLE_PEOPLE } from "../../services/sample-data";
import { useCurrentNavItem } from "../../context/navItem.context";
import type { PageToolbarProps } from "../ml/pageToolbar.types";
import type {
  ModuleAppViewMode,
  ModuleAppViewProps,
} from "../../services/moduleAppView.types";
import { ModuleAppView } from "./ModuleAppView";
import { ModulePageFooter } from "./ModulePageFooter";

interface ModulePageProps<T> {
  /** Buttons shown on the right of the page header. */
  actions?: ReactNode;
  /** Add, filter, export and search row shown under the page header. */
  toolbar?: Omit<PageToolbarProps, "view" | "onViewChange">;
  /** The records, shown as a table by default. */
  appView: Omit<ModuleAppViewProps<T>, "appView" | "page">;
}

export function ModulePage<T>({
  actions,
  toolbar,
  appView,
}: ModulePageProps<T>) {
  const item = useCurrentNavItem();
  const [view, setView] = useState<ModuleAppViewMode>("list");
  const [page, setPage] = useState(1);
  const total = appView?.records?.length ?? 0;
  const pageSize = appView?.pageSize ?? 20;
  const currentPage = useMemo(
    () => Math.min(page, Math.max(1, Math.ceil(total / pageSize))),
    [page, total, pageSize],
  );
  const invitePeople = useCallback(
    () => toast.info("Inviting people comes with the API step."),
    [],
  );
  const changeView = useCallback(
    (next: string) => setView(next as ModuleAppViewMode),
    [],
  );
  const hasGrid = !!appView?.renderCard;

  const pageToolbar = useMemo<PageToolbarProps | undefined>(
    () =>
      toolbar && {
        ...toolbar,
        ...(hasGrid && { view, onViewChange: changeView }),
      },
    [toolbar, hasGrid, view, changeView],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="flex min-h-0 flex-1 flex-col">
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
        {pageToolbar && <ModulePageToolbar {...pageToolbar} />}
        <ModuleAppView
          {...appView}
          appView={view}
          page={currentPage}
          pageSize={pageSize}
        />
      </main>
      <ModulePageFooter
        total={total}
        page={currentPage}
        pageSize={pageSize}
        onPageChange={setPage}
        appView={view}
      />
    </div>
  );
}
