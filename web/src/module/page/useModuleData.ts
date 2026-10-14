import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toFieldCreate } from "@/services/fields/field.api";
import { fieldKeys, putInLists } from "@/services/fields/field.utils";
import { recordKeys } from "@/services/records/record.api";
import { memberKeys } from "@/services/user/user.api";
import type { ModuleData, ModuleDataApi } from "./modulePage.types";

const NO_FIELDS: ISidebarField[] = [];
const NO_RECORDS: ISidebarRecord[] = [];
const NO_MEMBERS: IUserInfo[] = [];

/** Runs the page's API for one sidebar and returns it as ModuleData. Pass a module-level api object so it stays the same between renders. */
export function useModuleData(
  sidebarId: string | undefined,
  api: ModuleDataApi,
): ModuleData {
  const id = sidebarId ?? "";
  const queryClient = useQueryClient();

  const fieldsQuery = useQuery({
    queryKey: fieldKeys.list(id),
    queryFn: () => api.getFields(id),
    enabled: !!sidebarId,
  });
  const recordsQuery = useQuery({
    queryKey: recordKeys.list(id),
    queryFn: () => api.getRecords(id),
    enabled: !!sidebarId,
  });

  const membersQuery = useQuery({
    queryKey: memberKeys.all,
    queryFn: () => api.getMembers(),
  });

  const [openedRecordId, setOpenedRecordId] = useState<string>();
  const recordQuery = useQuery({
    queryKey: recordKeys.detail(id, openedRecordId ?? ""),
    queryFn: () => api.getRecord(id, openedRecordId ?? ""),
    enabled: !!sidebarId && !!openedRecordId,
    placeholderData: () =>
      queryClient
        .getQueryData<ISidebarRecord[]>(recordKeys.list(id))
        ?.find((record) => record?.objId === openedRecordId),
  });
  const openedRecord = recordQuery.data;

  const { mutateAsync: onAddRecord } = useMutation({
    mutationFn: (values: ISidebarRecordValues) => api.createRecord(id, values),
    onSuccess: (created) =>
      queryClient.setQueryData<ISidebarRecord[]>(
        recordKeys.list(id),
        (current) => [created, ...(current ?? [])],
      ),
  });
  const { mutateAsync: updateRecord } = useMutation({
    mutationFn: ({ objId, body }: { objId: string; body: ISidebarRecordUpdate }) =>
      api.updateRecord(id, objId, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(recordKeys.detail(id, updated.objId), updated);
      queryClient.setQueryData<ISidebarRecord[]>(recordKeys.list(id), (current) =>
        current?.map((record) =>
          record?.objId === updated.objId ? updated : record,
        ),
      );
    },
  });
  const onUpdateRecord = useCallback(
    (values: ISidebarRecordValues) => {
      if (!openedRecord) return Promise.reject(new Error("No record is open."));
      const latest =
        queryClient.getQueryData<ISidebarRecord>(
          recordKeys.detail(id, openedRecord.objId),
        ) ?? openedRecord;
      return updateRecord({
        objId: latest.objId,
        body: { values, versionNo: latest.versionNo },
      });
    },
    [id, openedRecord, queryClient, updateRecord],
  );
  const onCloseRecord = useCallback(() => setOpenedRecordId(undefined), []);

  const { mutateAsync: onAddField } = useMutation({
    mutationFn: (field: IField) => api.createField(id, toFieldCreate(field)),
    onSuccess: (created) =>
      putInLists(queryClient, id, (fields) => [...fields, created]),
  });

  const refetchFields = fieldsQuery.refetch;
  const refetchRecords = recordsQuery.refetch;
  const refetchRecord = recordQuery.refetch;
  const onRetryRecord = useCallback(() => {
    refetchRecord();
  }, [refetchRecord]);
  const onRefreshFields = useCallback(() => {
    refetchFields();
  }, [refetchFields]);
  const onRetryRecords = useCallback(() => {
    refetchRecords();
  }, [refetchRecords]);

  const fieldsState = useMemo(
    () => ({
      isLoading: fieldsQuery.isFetching,
      error: fieldsQuery.error,
      onRetry: onRefreshFields,
    }),
    [fieldsQuery.isFetching, fieldsQuery.error, onRefreshFields],
  );
  const recordsState = useMemo(
    () => ({
      isLoading: recordsQuery.isLoading || fieldsQuery.isLoading,
      error: recordsQuery.error ?? fieldsQuery.error,
      onRetry: fieldsQuery.error ? onRefreshFields : onRetryRecords,
    }),
    [
      recordsQuery.isLoading,
      recordsQuery.error,
      fieldsQuery.isLoading,
      fieldsQuery.error,
      onRefreshFields,
      onRetryRecords,
    ],
  );

  const openedRecordState = useMemo(
    () => ({
      isLoading: recordQuery.isLoading,
      error: recordQuery.error,
      onRetry: onRetryRecord,
    }),
    [recordQuery.isLoading, recordQuery.error, onRetryRecord],
  );

  return useMemo(
    () => ({
      fields: fieldsQuery.data ?? NO_FIELDS,
      fieldsState,
      records: recordsQuery.data ?? NO_RECORDS,
      recordsState,
      members: membersQuery.data ?? NO_MEMBERS,
      onRefreshFields,
      onAddRecord,
      openedRecordId,
      openedRecord,
      openedRecordState,
      onOpenRecord: setOpenedRecordId,
      onCloseRecord,
      onUpdateRecord,
      onAddField,
    }),
    [
      openedRecordId,
      openedRecord,
      openedRecordState,
      onCloseRecord,
      onUpdateRecord,
      fieldsQuery.data,
      fieldsState,
      recordsQuery.data,
      recordsState,
      membersQuery.data,
      onRefreshFields,
      onAddRecord,
      onAddField,
    ],
  );
}
