import { useCallback, useMemo, useState, type ReactNode } from "react";
import { PageHeader, ModulePageToolbar, toast } from "@moduleleague/ui";
import { SAMPLE_PEOPLE } from "../../services/sample-data";
import { useCurrentNavItem } from "../../context/navItem.context";
import type { PageToolbarProps } from "../ml/pageToolbar.types";
import type {
  ModuleAppViewMode,
  ModuleAppViewProps,
} from "../../services/moduleAppView.types";
import { arrayMove } from "@dnd-kit/sortable";
import { ModuleAppView } from "./ModuleAppView";
import { ModulePageFooter } from "./ModulePageFooter";

interface ModulePageProps<T> {
  /** Buttons shown on the right of the page header. */
  actions?: ReactNode;
  /** Add, filter, export and search row shown under the page header. */
  toolbar?: Omit<
    PageToolbarProps,
    | "view"
    | "onViewChange"
    | "columnOptions"
    | "hiddenColumns"
    | "onHiddenColumnsChange"
    | "onColumnOrderChange"
    | "selectedCount"
    | "onDeleteSelected"
    | "onCancelSelection"
  >;
  /** The records, shown as a table by default. */
  appView: Omit<
    ModuleAppViewProps<T>,
    | "appView"
    | "page"
    | "columnWidths"
    | "onColumnResize"
    | "onColumnReorder"
    | "pinnedColumns"
    | "onColumnPinToggle"
    | "selectedKeys"
    | "onSelectionChange"
    | "onRowReorder"
    | "onAdd"
    | "addLabel"
  >;
}

export function ModulePage<T>({
  actions,
  toolbar,
  appView,
}: ModulePageProps<T>) {
  const item = useCurrentNavItem();
  const [view, setView] = useState<ModuleAppViewMode>("list");
  const [page, setPage] = useState(1);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [pinnedColumns, setPinnedColumns] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [rowOrder, setRowOrder] = useState<string[]>([]);
  const orderedRecords = useMemo(() => {
    if (!rowOrder.length) return appView?.records ?? [];
    const position = new Map(rowOrder.map((key, index) => [key, index]));
    return [...(appView?.records ?? [])].sort(
      (a, b) =>
        (position.get(appView?.getKey(a)) ?? Number.MAX_SAFE_INTEGER) -
        (position.get(appView?.getKey(b)) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [appView?.records, appView?.getKey, rowOrder]);
  const reorderRow = useCallback(
    (activeKey: string, overKey: string) => {
      const keys = orderedRecords.map((record) => appView?.getKey(record));
      setRowOrder(
        arrayMove(keys, keys.indexOf(activeKey), keys.indexOf(overKey)),
      );
    },
    [orderedRecords, appView?.getKey],
  );
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
  const orderedColumns = useMemo(() => {
    const position = (key: string) => {
      const index = columnOrder.indexOf(key);
      return index < 0 ? Number.MAX_SAFE_INTEGER : index;
    };
    return [...(appView?.columns ?? [])].sort(
      (a, b) => position(a?.key) - position(b?.key),
    );
  }, [appView?.columns, columnOrder]);
  const columnOptions = useMemo(
    () =>
      orderedColumns?.map((column) => ({
        key: column?.key,
        label: typeof column?.header === "string" ? column.header : column?.key,
      })),
    [orderedColumns],
  );
  const visibleColumns = useMemo(() => {
    const shown = orderedColumns?.filter(
      (column) => !hiddenColumns.includes(column?.key),
    );
    return [
      ...shown.filter((column) => pinnedColumns.includes(column?.key)),
      ...shown.filter((column) => !pinnedColumns.includes(column?.key)),
    ];
  }, [orderedColumns, hiddenColumns, pinnedColumns]);
  const selectedCount = useMemo(() => {
    const keys = new Set(
      appView?.records?.map((record) => appView?.getKey(record)),
    );
    return selectedKeys.filter((key) => keys.has(key)).length;
  }, [appView?.records, appView?.getKey, selectedKeys]);
  const clearSelection = useCallback(() => setSelectedKeys([]), []);
  const togglePinnedColumn = useCallback(
    (key: string) =>
      setPinnedColumns((current) =>
        current.includes(key)
          ? current.filter((pinned) => pinned !== key)
          : [...current, key],
      ),
    [],
  );

  const resizeColumn = useCallback(
    (key: string, width: number) =>
      setColumnWidths((current) => ({ ...current, [key]: width })),
    [],
  );
  const reorderVisibleColumns = useCallback(
    (visibleKeys: string[]) => {
      let next = 0;
      setColumnOrder(
        orderedColumns.map((column) =>
          hiddenColumns.includes(column?.key)
            ? column?.key
            : visibleKeys[next++],
        ),
      );
    },
    [orderedColumns, hiddenColumns],
  );

  const deleteSelected = useCallback(() => {
    toolbar?.onDelete?.(selectedKeys);
    setSelectedKeys([]);
  }, [toolbar, selectedKeys]);

  const pageToolbar = useMemo<PageToolbarProps | undefined>(
    () =>
      toolbar && {
        ...toolbar,
        ...(hasGrid && { view, onViewChange: changeView }),
        ...(view === "list" && {
          columnOptions,
          hiddenColumns,
          onHiddenColumnsChange: setHiddenColumns,
          onColumnOrderChange: setColumnOrder,
        }),
        selectedCount,
        onDeleteSelected: toolbar?.onDelete ? deleteSelected : undefined,
        onCancelSelection: clearSelection,
      },
    [
      toolbar,
      hasGrid,
      view,
      changeView,
      columnOptions,
      hiddenColumns,
      selectedCount,
      deleteSelected,
      clearSelection,
    ],
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
          columns={visibleColumns}
          columnWidths={columnWidths}
          onColumnResize={resizeColumn}
          onColumnReorder={reorderVisibleColumns}
          pinnedColumns={pinnedColumns}
          onColumnPinToggle={togglePinnedColumn}
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          records={orderedRecords}
          onRowReorder={reorderRow}
          onAdd={toolbar?.onAdd}
          addLabel={toolbar?.addLabel}
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
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
      />
    </div>
  );
}
