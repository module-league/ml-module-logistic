import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toFieldCreate } from "@/services/fields/field.api";
import { fieldKeys, putInLists } from "@/services/fields/field.utils";
import { recordKeys } from "@/services/records/record.api";
import type { ModuleData, ModuleDataApi } from "./modulePage.types";

const NO_FIELDS: ISidebarField[] = [];
const NO_RECORDS: ISidebarRecord[] = [];

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

  const { mutateAsync: onAddRecord } = useMutation({
    mutationFn: (values: ISidebarRecordValues) => api.createRecord(id, values),
    onSuccess: (created) =>
      queryClient.setQueryData<ISidebarRecord[]>(
        recordKeys.list(id),
        (current) => [created, ...(current ?? [])],
      ),
  });
  const { mutateAsync: onAddField } = useMutation({
    mutationFn: (field: IField) => api.createField(id, toFieldCreate(field)),
    onSuccess: (created) =>
      putInLists(queryClient, id, (fields) => [...fields, created]),
  });

  const refetchFields = fieldsQuery.refetch;
  const refetchRecords = recordsQuery.refetch;
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

  return useMemo(
    () => ({
      fields: fieldsQuery.data ?? NO_FIELDS,
      fieldsState,
      records: recordsQuery.data ?? NO_RECORDS,
      recordsState,
      onRefreshFields,
      onAddRecord,
      onAddField,
    }),
    [
      fieldsQuery.data,
      fieldsState,
      recordsQuery.data,
      recordsState,
      onRefreshFields,
      onAddRecord,
      onAddField,
    ],
  );
}
