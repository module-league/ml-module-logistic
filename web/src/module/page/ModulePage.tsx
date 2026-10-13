import { useCallback, useMemo, useState } from "react";
import { PageHeader, ModulePageToolbar, toast } from "@moduleleague/ui";
import { SAMPLE_PEOPLE } from "@/services/logistic/logistic.sample";
import { useCurrentNavItem } from "@/module/shell/navItem.context";
import type { ModuleAppViewMode } from "@/module/appView/moduleAppView.types";
import type { ModulePageProps } from "./modulePage.types";
import { arrayMove } from "@dnd-kit/sortable";
import { ModuleAppView } from "@/module/appView/ModuleAppView";
import { ModulePageFooter } from "./ModulePageFooter";
import { RecordValueNode } from "@/module/record/RecordValueNode";
import type { ModuleRecordField } from "@/module/record/moduleRecord.types";

export function ModulePage<T>({
  actions,
  toolbar,
  appView,
  fields,
  getRecordValues,
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
  const [pinnedRows, setPinnedRows] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<IField[]>([]);
  const addField = useCallback(
    (field: IField) =>
      setCustomFields((current) => [
        ...current,
        {
          ...field,
          displayOrder: (appView?.columns?.length ?? 0) + current.length,
        },
      ]),
    [appView?.columns?.length],
  );
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
  const shownPinnedRows = useMemo(() => {
    if (!pinnedRows.length) return pinnedRows;
    const keys = new Set(
      appView?.records?.map((record) => appView?.getKey(record)),
    );
    return pinnedRows.filter((key) => keys.has(key));
  }, [appView?.records, appView?.getKey, pinnedRows]);
  const togglePinnedRow = useCallback(
    (key: string) =>
      setPinnedRows((current) =>
        current.includes(key)
          ? current.filter((pinned) => pinned !== key)
          : [...current, key],
      ),
    [],
  );
  const total = appView?.records?.length ?? 0;
  const pinnedCount = view === "list" ? shownPinnedRows.length : 0;
  const pageSize = appView?.pageSize ?? 20;
  const currentPage = useMemo(
    () =>
      Math.min(page, Math.max(1, Math.ceil((total - pinnedCount) / pageSize))),
    [page, total, pinnedCount, pageSize],
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
  const recordFields = useMemo<ModuleRecordField[]>(
    () =>
      fields
        ? fields.map((field) => ({ key: field.objId, field }))
        : customFields.map((field) => ({ key: `field:${field.name}`, field })),
    [fields, customFields],
  );
  const orderedColumns = useMemo(() => {
    const position = (key: string) => {
      const index = columnOrder.indexOf(key);
      return index < 0 ? Number.MAX_SAFE_INTEGER : index;
    };
    const fieldColumns = recordFields.map(({ key, field }) => ({
      key,
      header: field.name,
      cell: (record: T) => (
        <RecordValueNode
          field={field}
          value={getRecordValues?.(record)?.[key]}
        />
      ),
    }));
    return [...(appView?.columns ?? []), ...fieldColumns].sort(
      (a, b) => position(a?.key) - position(b?.key),
    );
  }, [appView?.columns, recordFields, columnOrder, getRecordValues]);
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
  const deleteRow = useCallback(
    (key: string) => toolbar?.onDelete?.([key]),
    [toolbar],
  );

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
          onAddField: toolbar?.onAddField ?? addField,
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
      addField,
      selectedCount,
      deleteSelected,
      clearSelection,
    ],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="flex min-h-0 flex-1 flex-col">
        {item?.sidebarText?.length || item?.sidebarDesc?.length ? (
          <PageHeader
            title={item?.sidebarText}
            description={item?.sidebarDesc}
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
          pinnedRows={shownPinnedRows}
          onRowPinToggle={togglePinnedRow}
          onRowDelete={toolbar?.onDelete ? deleteRow : undefined}
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
        pinnedCount={pinnedCount}
      />
    </div>
  );
}
