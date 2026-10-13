import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@moduleleague/ui";
import { ModulePage } from "@/components/app/ModulePage";
import { ModuleNewRecordForm } from "@/components/app/ModuleNewRecordForm";
import { useCurrentNavItem } from "@/context/navItem.context";
import { apiClient } from "@/lib/apiClient";
import { toFieldCreate, useCreateField } from "@/services/fields/field.api";
import { fieldKeys } from "@/services/fields/field.utils";
import type {
  ModuleRecordField,
  ModuleRecordValues,
} from "@/services/modules/moduleRecord.types";

const getRecordKey = (record: ISidebarRecord) => record.objId;
const getRecordValues = (record: ISidebarRecord) => record.values;

export default function RecordTest() {
  const sidebarId = useCurrentNavItem()?.sidebarId;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [newRecordOpen, setNewRecordOpen] = useState(false);

  const fieldsQuery = useQuery({
    queryKey: fieldKeys.list(sidebarId ?? ""),
    queryFn: () => getLogisticFields(sidebarId ?? ""),
    enabled: !!sidebarId,
  });
  const fields = fieldsQuery.data;
  const recordFields = useMemo<ModuleRecordField[]>(
    () => fields?.map((field) => ({ key: field.objId, field })) ?? [],
    [fields],
  );
  const retryFields = useCallback(() => {
    fieldsQuery.refetch();
  }, [fieldsQuery.refetch]);

  const recordsKey = useMemo(() => ["records", sidebarId], [sidebarId]);
  const recordsQuery = useQuery({
    queryKey: recordsKey,
    queryFn: () => getLogisticRecords(sidebarId ?? ""),
    enabled: !!sidebarId,
  });
  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data]);
  const retryRecords = useCallback(() => {
    recordsQuery.refetch();
  }, [recordsQuery.refetch]);

  const { mutateAsync: createField } = useCreateField(sidebarId);
  const addField = useCallback(
    (field: IField) => createField(toFieldCreate(field)),
    [createField],
  );

  const openNewRecord = useCallback(() => {
    setNewRecordOpen(true);
    fieldsQuery.refetch();
  }, [fieldsQuery.refetch]);

  const { mutateAsync: createRecord } = useMutation({
    mutationFn: (values: ModuleRecordValues) =>
      createLogisticRecord(sidebarId ?? "", values),
    onSuccess: (created) =>
      queryClient.setQueryData<ISidebarRecord[]>(recordsKey, (current) => [
        created,
        ...(current ?? []),
      ]),
  });
  const saveRecord = useCallback(
    async (values: ModuleRecordValues) => {
      await createRecord(values);
      toast.success("Record added");
    },
    [createRecord],
  );

  const deleteRecords = useCallback(
    (keys: string[]) =>
      toast.info(
        `Deleting ${keys.length} ${keys.length === 1 ? "record" : "records"} comes with the records API.`,
      ),
    [],
  );

  const toolbar = useMemo(
    () => ({
      onAdd: openNewRecord,
      addLabel: "New record",
      onDelete: deleteRecords,
      onAddField: addField,
      search,
      onSearchChange: setSearch,
      searchPlaceholder: "Search records",
    }),
    [openNewRecord, deleteRecords, addField, search],
  );
  const empty = useMemo(
    () => ({ actionLabel: "New record", onAction: openNewRecord }),
    [openNewRecord],
  );

  return (
    <>
      <ModulePage
        toolbar={toolbar}
        fields={fields}
        getRecordValues={getRecordValues}
        appView={{
          records,
          getKey: getRecordKey,
          columns: [],
          empty,
          isLoading: recordsQuery.isLoading,
          error: recordsQuery.error,
          onRetry: retryRecords,
        }}
      />
      <ModuleNewRecordForm
        open={newRecordOpen}
        onOpenChange={setNewRecordOpen}
        fields={recordFields}
        isLoading={fieldsQuery.isFetching}
        error={fieldsQuery.error}
        onRetry={retryFields}
        onSave={saveRecord}
      />
    </>
  );
}

async function getLogisticFields(sidebarId: string) {
  const { data } = await apiClient.get<ISidebarField[]>(
    `/sidebars/${encodeURIComponent(sidebarId)}/fields`,
  );
  return data;
}

async function getLogisticRecords(sidebarId: string) {
  const { data } = await apiClient.get<ISidebarRecord[]>(
    `/sidebars/${encodeURIComponent(sidebarId)}/records`,
  );
  return data;
}

async function createLogisticRecord(
  sidebarId: string,
  values: ModuleRecordValues,
) {
  const { data } = await apiClient.post<ISidebarRecord>(
    `/sidebars/${encodeURIComponent(sidebarId)}/records`,
    { values },
  );
  return data;
}
