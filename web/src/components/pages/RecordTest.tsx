import { useCallback, useMemo, useState } from "react";
import { toast } from "@moduleleague/ui";
import { ModulePage } from "@/components/app/ModulePage";
import { useCurrentNavItem } from "@/context/navItem.context";
import {
  toFieldCreate,
  useCreateField,
  useFields,
} from "@/services/fields/field.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  ModuleOpenRecordTarget,
  ModuleRecordValues,
} from "@/services/modules/moduleOpenRecord.types";

const getRecordKey = (record: ISidebarRecord) => record.objId;
const getRecordValues = (record: ISidebarRecord) => record.values;

export default function RecordTest() {
  const sidebarId = useCurrentNavItem()?.sidebarId;
  const queryClient = useQueryClient();
  const { data: fields } = useFields(sidebarId);

  const [search, setSearch] = useState("");
  const [openRecordId, setOpenRecordId] = useState<string>();

  const recordsKey = useMemo(() => ["records", sidebarId], [sidebarId]);

  const { mutateAsync: createField } = useCreateField(sidebarId);
  const addField = useCallback(
    (field: IField) => createField(toFieldCreate(field)),
    [createField],
  );

  const { data: recordData } = useQuery({
    queryKey: recordsKey,
    queryFn: () => getLogisticRecords(sidebarId ?? ""),
    enabled: !!sidebarId,
  });

  const { mutateAsync: createRecord } = useMutation({
    mutationFn: async (values: ModuleRecordValues) => {
      const { data } = await apiClient.post<ISidebarRecord>(
        `/sidebars/${encodeURIComponent(sidebarId ?? "")}/records`,
        { values },
      );
      return data;
    },
    onSuccess: (created) =>
      queryClient.setQueryData<ISidebarRecord[]>(recordsKey, (current) => [
        created,
        ...(current ?? []),
      ]),
  });

  const saveRecord = useCallback(
    async (values: ModuleRecordValues, target: ModuleOpenRecordTarget) => {
      if (target?.mode !== "new") return;
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

  const recordsQuery = useQuery({
    queryKey: recordsKey,
    queryFn: () => getLogisticRecords(sidebarId ?? ""),
    enabled: !!sidebarId,
  });
  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data]);
  const retryRecords = useCallback(() => {
    recordsQuery.refetch();
  }, [recordsQuery.refetch]);

  const toolbar = useMemo(
    () => ({
      addLabel: "New record",
      onDelete: deleteRecords,
      onAddField: addField,
      search,
      onSearchChange: setSearch,
      searchPlaceholder: "Search records",
    }),
    [deleteRecords, addField, search],
  );

  return (
    <ModulePage
      toolbar={toolbar}
      fields={fields}
      onSaveRecord={saveRecord}
      getRecordValues={getRecordValues}
      appView={{
        records,
        getKey: getRecordKey,
        columns: [],
        isLoading: recordsQuery.isLoading,
        error: recordsQuery.error,
        onRetry: retryRecords,
      }}
    />
  );
}
//API called region
async function getLogisticRecords(sidebarId: string) {
  const { data } = await apiClient.get<ISidebarRecord[]>(
    `/sidebars/${encodeURIComponent(sidebarId)}/records`,
  );
  return data;
}

async function getLogisticRecord(sidebarId: string, objId: string) {
  const { data } = await apiClient.get<ISidebarRecord>(
    `/sidebars/${encodeURIComponent(sidebarId)}/records/${encodeURIComponent(objId)}`,
  );
  return data;
}
