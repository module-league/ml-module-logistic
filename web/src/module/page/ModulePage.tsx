import { useCallback, useMemo, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import {
  PageHeader,
  ModulePageToolbar,
  toast,
  type PageToolbarFilterValue,
  type PageToolbarInputOption,
} from "@moduleleague/ui";
import type { PageToolbarProps } from "@/components/ml/pageToolbar.types";
import { useCurrentUser } from "@/services/user/current.user";
import { useCurrentNavItem } from "@/module/shell/navItem.context";
import type { ModuleAppColumn } from "@/module/appView/moduleAppView.types";
import { ModuleAppView } from "@/module/appView/ModuleAppView";
import { ModuleNewRecordForm } from "@/module/record/ModuleNewRecordForm";
import { ModuleOpenRecord } from "@/module/record/ModuleOpenRecord";
import { RecordValueNode } from "@/components/custom/RecordValueNode";
import { toRecordText } from "@/module/record/moduleRecord.utils";
import { ModulePageFooter } from "./ModulePageFooter";
import type { ModulePageProps } from "./modulePage.types";

const ADD_LABEL = "New record";
const getRecordKey = (record: ISidebarRecord) => record?.objId;

export function ModulePage({ data, actions, pageSize = 20 }: ModulePageProps) {
  const { fields, records } = data;
  const item = useCurrentNavItem();
  const user = useCurrentUser();
  const people = useMemo(() => [user], [user]);
  const [newRecordOpen, setNewRecordOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PageToolbarFilterValue>({});
  const [page, setPage] = useState(1);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [pinnedColumns, setPinnedColumns] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [rowOrder, setRowOrder] = useState<string[]>([]);
  const [pinnedRows, setPinnedRows] = useState<string[]>([]);

  const onRefreshFields = data.onRefreshFields;
  const openNewRecord = useCallback(() => {
    setNewRecordOpen(true);
    onRefreshFields();
  }, [onRefreshFields]);
  const onOpenRecord = data.onOpenRecord;
  const openRecord = useCallback(
    (objId: string) => {
      onOpenRecord(objId);
      onRefreshFields();
    },
    [onOpenRecord, onRefreshFields],
  );
  const openedRecordLoading =
    !!data.fieldsState?.isLoading || !!data.openedRecordState?.isLoading;
  const onAddRecord = data.onAddRecord;
  const saveRecord = useCallback(
    async (values: ISidebarRecordValues) => {
      await onAddRecord(values);
      toast.success("Record added");
    },
    [onAddRecord],
  );

  const inputOptions = useMemo<PageToolbarInputOption[]>(
    () =>
      fields
        ?.filter((field) => field?.type === "single_select")
        .map((field) => ({
          key: field.objId,
          label: field.name,
          options:
            field.dropDownValues?.map((option) => ({
              value: option?.id,
              label: option?.value,
            })) ?? [],
        })) ?? [],
    [fields],
  );
  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (
      records?.filter((record) => {
        const matchesFilter = Object.entries(filter).every(
          ([fieldId, picked]) =>
            !picked?.length || picked.includes(record?.values?.[fieldId] ?? ""),
        );
        if (!matchesFilter) return false;
        if (!term) return true;
        return fields?.some((field) =>
          toRecordText(field, record?.values?.[field.objId])
            .toLowerCase()
            .includes(term),
        );
      }) ?? []
    );
  }, [records, fields, search, filter]);

  const orderedRecords = useMemo(() => {
    if (!rowOrder.length) return filteredRecords;
    const position = new Map(rowOrder.map((key, index) => [key, index]));
    return [...filteredRecords].sort(
      (a, b) =>
        (position.get(getRecordKey(a)) ?? Number.MAX_SAFE_INTEGER) -
        (position.get(getRecordKey(b)) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [filteredRecords, rowOrder]);
  const reorderRow = useCallback(
    (activeKey: string, overKey: string) => {
      const keys = orderedRecords.map(getRecordKey);
      setRowOrder(
        arrayMove(keys, keys.indexOf(activeKey), keys.indexOf(overKey)),
      );
    },
    [orderedRecords],
  );
  const shownPinnedRows = useMemo(() => {
    if (!pinnedRows.length) return pinnedRows;
    const keys = new Set(filteredRecords.map(getRecordKey));
    return pinnedRows.filter((key) => keys.has(key));
  }, [filteredRecords, pinnedRows]);
  const togglePinnedRow = useCallback(
    (key: string) =>
      setPinnedRows((current) =>
        current.includes(key)
          ? current.filter((pinned) => pinned !== key)
          : [...current, key],
      ),
    [],
  );
  const total = filteredRecords.length;
  const pinnedCount = shownPinnedRows.length;
  const currentPage = useMemo(
    () =>
      Math.min(page, Math.max(1, Math.ceil((total - pinnedCount) / pageSize))),
    [page, total, pinnedCount, pageSize],
  );
  const invitePeople = useCallback(
    () => toast.info("Inviting people comes with the API step."),
    [],
  );

  const orderedColumns = useMemo<ModuleAppColumn<ISidebarRecord>[]>(() => {
    const position = (key: string) => {
      const index = columnOrder.indexOf(key);
      return index < 0 ? Number.MAX_SAFE_INTEGER : index;
    };
    return (
      fields
        ?.map((field) => ({
          key: field.objId,
          header: field.name,
          cell: (record: ISidebarRecord) => (
            <RecordValueNode
              field={field}
              value={record?.values?.[field.objId]}
            />
          ),
        }))
        .sort((a, b) => position(a.key) - position(b.key)) ?? []
    );
  }, [fields, columnOrder]);
  const columnOptions = useMemo(
    () =>
      orderedColumns.map((column) => ({
        key: column.key,
        label: String(column.header),
      })),
    [orderedColumns],
  );
  const visibleColumns = useMemo(() => {
    const shown = orderedColumns.filter(
      (column) => !hiddenColumns.includes(column.key),
    );
    return [
      ...shown.filter((column) => pinnedColumns.includes(column.key)),
      ...shown.filter((column) => !pinnedColumns.includes(column.key)),
    ];
  }, [orderedColumns, hiddenColumns, pinnedColumns]);
  const selectedCount = useMemo(() => {
    const keys = new Set(records?.map(getRecordKey));
    return selectedKeys.filter((key) => keys.has(key)).length;
  }, [records, selectedKeys]);
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
          hiddenColumns.includes(column.key) ? column.key : visibleKeys[next++],
        ),
      );
    },
    [orderedColumns, hiddenColumns],
  );

  const empty = useMemo(
    () =>
      records?.length
        ? {
            title: "No matching records",
            description: "Try another search or clear the filters.",
          }
        : { actionLabel: ADD_LABEL, onAction: openNewRecord },
    [records?.length, openNewRecord],
  );

  const pageToolbar = useMemo<PageToolbarProps>(
    () => ({
      onAdd: openNewRecord,
      addLabel: ADD_LABEL,
      inputOptions,
      filterValue: filter,
      onFilterChange: setFilter,
      search,
      onSearchChange: setSearch,
      searchPlaceholder: "Search records",
      columnOptions,
      hiddenColumns,
      onHiddenColumnsChange: setHiddenColumns,
      onColumnOrderChange: setColumnOrder,
      onAddField: data.onAddField,
      selectedCount,
      onCancelSelection: clearSelection,
    }),
    [
      openNewRecord,
      inputOptions,
      filter,
      search,
      columnOptions,
      hiddenColumns,
      data.onAddField,
      selectedCount,
      clearSelection,
    ],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="flex min-h-0 flex-1 flex-col">
        {!!(item?.sidebarText?.length || item?.sidebarDesc?.length) && (
          <PageHeader
            title={item?.sidebarText}
            description={item?.sidebarDesc}
            hidePageSeparator={item?.hidePageSeparator}
            actions={actions}
            people={people}
            onInvitePeople={invitePeople}
          />
        )}
        <ModulePageToolbar {...pageToolbar} />
        <ModuleAppView
          {...data.recordsState}
          records={orderedRecords}
          getKey={getRecordKey}
          columns={visibleColumns}
          empty={empty}
          columnWidths={columnWidths}
          onColumnResize={resizeColumn}
          onColumnReorder={reorderVisibleColumns}
          pinnedColumns={pinnedColumns}
          onColumnPinToggle={togglePinnedColumn}
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          onRowReorder={reorderRow}
          pinnedRows={shownPinnedRows}
          onRowPinToggle={togglePinnedRow}
          onRowExpand={openRecord}
          onAdd={openNewRecord}
          addLabel={ADD_LABEL}
          pageSize={pageSize}
          page={currentPage}
        />
      </main>
      <ModulePageFooter
        total={total}
        page={currentPage}
        pageSize={pageSize}
        onPageChange={setPage}
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        pinnedCount={pinnedCount}
      />
      <ModuleNewRecordForm
        {...data.fieldsState}
        open={newRecordOpen}
        onOpenChange={setNewRecordOpen}
        fields={fields}
        onSave={saveRecord}
      />
      <ModuleOpenRecord
        recordKey={data.openedRecordId}
        onClose={data.onCloseRecord}
        fields={fields}
        record={data.openedRecord}
        isLoading={openedRecordLoading}
        error={data.openedRecordState?.error ?? data.fieldsState?.error}
        onRetry={data.openedRecordState?.onRetry}
        onSave={data.onUpdateRecord}
      />
    </div>
  );
}
