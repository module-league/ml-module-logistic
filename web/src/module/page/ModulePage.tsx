import { useCallback, useMemo, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import {
  PageHeader,
  ModulePageToolbar,
  toast,
  FieldTypeIcon,
  ModuleDeleteFieldDialog,
  ModuleEditFieldDialog,
} from "@moduleleague/ui";
import type { PageToolbarProps } from "@/components/ml/pageToolbar.types";
import { useCurrentUser } from "@/services/user/current.user";
import { useCurrentNavItem } from "@/module/shell/navItem.context";
import type { ModuleAppColumn } from "@/module/appView/moduleAppView.types";
import { ModuleAppView } from "@/module/appView/ModuleAppView";
import { ModuleNewRecordForm } from "@/module/record/ModuleNewRecordForm";
import { ModuleOpenRecord } from "@/module/record/ModuleOpenRecord";
import { ConfirmDeleteDialog } from "@/components/custom/ConfirmDeleteDialog";
import { ModuleFormDialog } from "@/module/form/ModuleFormDialog";
import { RecordValueNode } from "@/components/custom/RecordValueNode";
import { RecordLookupContext } from "@/components/custom/RecordLookup.context";
import { toRecordText } from "@/module/record/moduleRecord.utils";
import { ModulePageFooter } from "./ModulePageFooter";
import { recordFieldValue, SYSTEM_FIELDS } from "./modulePage.utils";
import type {
  ModuleFieldAction,
  ModulePageProps,
  ModuleRecordDeletion,
} from "./modulePage.types";

const ADD_LABEL = "New record";
const getRecordKey = (record: ISidebarRecord) => record?.objId;

export function ModulePage({ data, actions, pageSize = 20 }: ModulePageProps) {
  const { fields, records, members, lookupSources, lookups } = data;
  const item = useCurrentNavItem();
  const user = useCurrentUser();
  const people = useMemo(() => [user], [user]);
  const [newRecordOpen, setNewRecordOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [pinnedColumns, setPinnedColumns] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [rowOrder, setRowOrder] = useState<string[]>([]);
  const [pinnedRows, setPinnedRows] = useState<string[]>([]);
  const [fieldAction, setFieldAction] = useState<ModuleFieldAction>();
  const [recordDeletion, setRecordDeletion] = useState<ModuleRecordDeletion>();
  const [formsOpen, setFormsOpen] = useState(false);

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

  const gridFields = useMemo(
    () => [...(fields ?? []), ...SYSTEM_FIELDS],
    [fields],
  );

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records ?? [];
    return (
      records?.filter((record) =>
        gridFields.some((field) =>
          toRecordText(field, recordFieldValue(field, record), members, lookups)
            .toLowerCase()
            .includes(term),
        ),
      ) ?? []
    );
  }, [records, gridFields, search, members, lookups]);

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
  const recordNavigation = useMemo(() => {
    const pinned = new Set(shownPinnedRows);
    const keys = [
      ...shownPinnedRows,
      ...orderedRecords.map(getRecordKey).filter((key) => !pinned.has(key)),
    ];
    const index = keys.indexOf(data.openedRecordId ?? "");
    if (index < 0) return {};
    return { previousKey: keys[index - 1], nextKey: keys[index + 1] };
  }, [orderedRecords, shownPinnedRows, data.openedRecordId]);
  const total = filteredRecords.length;
  const pinnedCount = shownPinnedRows.length;
  const currentPage = useMemo(
    () =>
      Math.min(page, Math.max(1, Math.ceil((total - pinnedCount) / pageSize))),
    [page, total, pinnedCount, pageSize],
  );
  const openForms = useCallback(() => {
    setFormsOpen(true);
    onRefreshFields();
  }, [onRefreshFields]);
  const invitePeople = useCallback(
    () => toast.info("Inviting people comes with the API step."),
    [],
  );

  const orderedColumns = useMemo<ModuleAppColumn<ISidebarRecord>[]>(() => {
    const position = (key: string) => {
      const index = columnOrder.indexOf(key);
      return index < 0 ? Number.MAX_SAFE_INTEGER : index;
    };
    return gridFields
      .map((field) => ({
        key: field.objId,
        header: field.name,
        icon: <FieldTypeIcon type={field.type} />,
        className: field.type === "checkbox" ? "text-center" : undefined,
        system: field.isSystemField,
        cell: (record: ISidebarRecord) => (
          <RecordValueNode
            field={field}
            value={recordFieldValue(field, record)}
            members={members}
          />
        ),
      }))
      .sort((a, b) => position(a.key) - position(b.key));
  }, [gridFields, columnOrder, members]);
  const fieldTypeById = useMemo(
    () => new Map(gridFields.map((field) => [field?.objId, field?.type])),
    [gridFields],
  );
  const columnOptions = useMemo(
    () =>
      orderedColumns.map((column) => ({
        key: column.key,
        label: String(column.header),
        type: fieldTypeById.get(column.key),
        system: column.system,
      })),
    [orderedColumns, fieldTypeById],
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
  const deleteSelected = useCallback(() => {
    const keys = new Set(records?.map(getRecordKey));
    setRecordDeletion({
      keys: selectedKeys.filter((key) => keys.has(key)),
      open: true,
    });
  }, [records, selectedKeys]);
  const deleteRow = useCallback(
    (key: string) => setRecordDeletion({ keys: [key], open: true }),
    [],
  );
  const changeRecordDeletionOpen = useCallback(
    (open: boolean) =>
      setRecordDeletion((current) =>
        current ? { ...current, open } : current,
      ),
    [],
  );
  const deletingCount = recordDeletion?.keys?.length ?? 0;
  const onDeleteRecords = data.onDeleteRecords;
  const confirmDeleteRecords = useCallback(async () => {
    const keys = recordDeletion?.keys ?? [];
    await onDeleteRecords(keys);
    const deleted = new Set(keys);
    const keep = (current: string[]) =>
      current.filter((key) => !deleted.has(key));
    setSelectedKeys(keep);
    setPinnedRows(keep);
    setRowOrder(keep);
  }, [recordDeletion?.keys, onDeleteRecords]);
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

  const hideColumn = useCallback(
    (key: string) =>
      setHiddenColumns((current) =>
        current.includes(key) ? current : [...current, key],
      ),
    [],
  );
  const editColumn = useCallback(
    (key: string) => {
      onRefreshFields();
      setFieldAction({ kind: "edit", fieldId: key, open: true });
    },
    [onRefreshFields],
  );
  const deleteColumn = useCallback(
    (key: string) =>
      setFieldAction({ kind: "delete", fieldId: key, open: true }),
    [],
  );
  const changeFieldActionOpen = useCallback(
    (open: boolean) =>
      setFieldAction((current) => (current ? { ...current, open } : current)),
    [],
  );
  const actionField = useMemo(
    () => fields?.find((field) => field?.objId === fieldAction?.fieldId),
    [fields, fieldAction?.fieldId],
  );
  const otherFieldNames = useMemo(
    () =>
      fields
        ?.filter((field) => field?.objId !== fieldAction?.fieldId)
        .map((field) => field?.name) ?? [],
    [fields, fieldAction?.fieldId],
  );
  const onUpdateField = data.onUpdateField;
  const saveField = useCallback(
    (edited: IField) =>
      actionField
        ? onUpdateField(actionField.objId, edited)
        : Promise.reject(new Error("The field no longer exists.")),
    [actionField, onUpdateField],
  );
  const onDeleteField = data.onDeleteField;
  const deleteField = useCallback(
    () =>
      actionField
        ? onDeleteField(actionField.objId)
        : Promise.reject(new Error("The field no longer exists.")),
    [actionField, onDeleteField],
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

  const linkFields = useMemo(
    () => fields?.filter((field) => field?.type === "link_table") ?? [],
    [fields],
  );
  const lookupContext = useMemo(
    () => ({
      sidebarId: item?.sidebarId,
      sources: lookupSources,
      linkFields,
      lookups,
    }),
    [item?.sidebarId, lookupSources, linkFields, lookups],
  );

  const pageToolbar = useMemo<PageToolbarProps>(
    () => ({
      onAdd: openNewRecord,
      addLabel: ADD_LABEL,
      search,
      onSearchChange: setSearch,
      searchPlaceholder: "Search records",
      columnOptions,
      hiddenColumns,
      onHiddenColumnsChange: setHiddenColumns,
      onColumnOrderChange: setColumnOrder,
      onAddField: data.onAddField,
      onEditField: editColumn,
      selectedCount,
      onDeleteSelected: deleteSelected,
      onCancelSelection: clearSelection,
    }),
    [
      openNewRecord,
      search,
      columnOptions,
      hiddenColumns,
      data.onAddField,
      editColumn,
      selectedCount,
      deleteSelected,
      clearSelection,
    ],
  );

  return (
    <RecordLookupContext.Provider value={lookupContext}>
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
              onOpenForms={openForms}
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
            onColumnEdit={editColumn}
            onColumnHide={hideColumn}
            onColumnDelete={deleteColumn}
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            onRowReorder={reorderRow}
            pinnedRows={shownPinnedRows}
            onRowPinToggle={togglePinnedRow}
            onRowDelete={deleteRow}
            onRowExpand={openRecord}
            onAddField={data.onAddField}
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
        <ModuleFormDialog
          {...data.formsState}
          open={formsOpen}
          onOpenChange={setFormsOpen}
          title={item?.sidebarText ?? ""}
          fields={fields}
          members={members}
          forms={data.forms}
          onAddForm={data.onAddForm}
          onUpdateForm={data.onUpdateForm}
          onDeleteForm={data.onDeleteForm}
          onReorderForms={data.onReorderForms}
          onUploadAttachment={data.onUploadAttachment}
        />
        <ModuleNewRecordForm
          {...data.fieldsState}
          open={newRecordOpen}
          onOpenChange={setNewRecordOpen}
          fields={fields}
          members={members}
          onUploadAttachment={data.onUploadAttachment}
          onSave={saveRecord}
        />
        <ModuleOpenRecord
          recordKey={data.openedRecordId}
          onClose={data.onCloseRecord}
          fields={fields}
          members={members}
          onUploadAttachment={data.onUploadAttachment}
          record={data.openedRecord}
          {...recordNavigation}
          onNavigate={onOpenRecord}
          isLoading={openedRecordLoading}
          error={data.openedRecordState?.error ?? data.fieldsState?.error}
          onRetry={data.openedRecordState?.onRetry}
          onSave={data.onUpdateRecord}
        />
        <ModuleEditFieldDialog
          key={actionField?.objId}
          field={fieldAction?.kind === "edit" ? actionField : undefined}
          open={fieldAction?.kind === "edit" && fieldAction.open}
          onOpenChange={changeFieldActionOpen}
          onSave={saveField}
          takenNames={otherFieldNames}
        />
        <ModuleDeleteFieldDialog
          field={fieldAction?.kind === "delete" ? actionField : undefined}
          open={fieldAction?.kind === "delete" && fieldAction.open}
          onOpenChange={changeFieldActionOpen}
          onDelete={deleteField}
        />
        <ConfirmDeleteDialog
          open={!!recordDeletion?.open}
          onOpenChange={changeRecordDeletionOpen}
          title={
            deletingCount === 1
              ? "Delete this record?"
              : `Delete ${deletingCount} records?`
          }
          description="Links to them from link to another record fields are removed too. This can't be undone."
          confirmLabel={
            deletingCount === 1
              ? "Delete record"
              : `Delete ${deletingCount} records`
          }
          successMessage={
            deletingCount === 1
              ? "Record deleted"
              : `${deletingCount} records deleted`
          }
          onConfirm={confirmDeleteRecords}
        />
      </div>
    </RecordLookupContext.Provider>
  );
}
