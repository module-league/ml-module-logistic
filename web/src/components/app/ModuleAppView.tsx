import { useMemo } from "react";
import type { ModuleAppViewProps } from "../../services/moduleAppView.types";
import { ModuleEmptyAppView } from "./ModuleEmptyAppView";
import { GridView } from "./view/GridView";
import { ListView } from "./view/ListView";

export function ModuleAppView<T>({
  records,
  getKey,
  columns,
  renderCard,
  appView = "list",
  pageSize = 20,
  page = 1,
  empty,
  columnWidths,
  onColumnResize,
  onColumnReorder,
  onAdd,
  addLabel,
  pinnedColumns,
  onColumnPinToggle,
  selectedKeys,
  onSelectionChange,
  onRowReorder,
  pinnedRows,
  onRowPinToggle,
  onRowDelete,
}: ModuleAppViewProps<T>) {
  const total = records?.length ?? 0;
  const visible = useMemo(() => {
    if (!pinnedRows?.length) {
      return records?.slice((page - 1) * pageSize, page * pageSize) ?? [];
    }
    const byKey = new Map(records?.map((record) => [getKey(record), record]));
    const pinned = pinnedRows
      .map((key) => byKey.get(key))
      .filter((record): record is T => !!record);
    const rest =
      records?.filter((record) => !pinnedRows.includes(getKey(record))) ?? [];
    return [...pinned, ...rest.slice((page - 1) * pageSize, page * pageSize)];
  }, [records, getKey, pinnedRows, page, pageSize]);

  if (!appView) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {appView === "grid" && renderCard ? (
        total === 0 ? (
          <div className="min-h-0 flex-1 overflow-auto">
            <ModuleEmptyAppView {...empty} />
          </div>
        ) : (
          <GridView records={records} getKey={getKey} renderCard={renderCard} />
        )
      ) : (
        <ListView
          records={visible}
          pageSize={pageSize}
          onAdd={onAdd}
          addLabel={addLabel}
          getKey={getKey}
          columns={columns}
          empty={empty}
          columnWidths={columnWidths}
          onColumnResize={onColumnResize}
          onColumnReorder={onColumnReorder}
          pinnedColumns={pinnedColumns}
          onColumnPinToggle={onColumnPinToggle}
          selectedKeys={selectedKeys}
          onSelectionChange={onSelectionChange}
          onRowReorder={onRowReorder}
          pinnedRows={pinnedRows}
          onRowPinToggle={onRowPinToggle}
          onRowDelete={onRowDelete}
        />
      )}
    </div>
  );
}
