import { useCallback, useMemo } from "react";
import {
  useMutation,
  useQueries,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { fieldKeys } from "@/services/fields/field.utils";
import { recordKeys } from "@/services/records/record.api";
import { useWorkspaceContext } from "@/module/workspace/workspace.context";
import type { LookupSource, RecordLookups } from "@/lib/lookupHelper";

const NO_FIELDS: ISidebarField[] = [];

function dataOf<T>(results: UseQueryResult<T>[]) {
  return results.map((result) => result.data);
}

function recordsAndErrors(results: UseQueryResult<ISidebarRecord[]>[]) {
  return {
    records: dataOf(results),
    errors: results.map((result) => result.error),
  };
}

/**
 * Every page's fields, shared with that page's own query: the tables a link field or a widget can read.
 * @example
 * const { lookupSources, fieldsBySidebar } = useLookupSources(getFields);
 */
export function useLookupSources(
  getFields: (sidebarId: string) => Promise<ISidebarField[]>,
) {
  const { items: pages } = useWorkspaceContext();
  const pageFields = useQueries({
    queries: pages.map((page) => ({
      queryKey: fieldKeys.list(page.sidebarId),
      queryFn: () => getFields(page.sidebarId),
    })),
    combine: dataOf<ISidebarField[]>,
  });
  const lookupSources = useMemo<LookupSource[]>(
    () =>
      pages.map((page, index) => ({
        sidebarId: page.sidebarId,
        sidebarText: page.sidebarText,
        fields: pageFields[index] ?? NO_FIELDS,
      })),
    [pages, pageFields],
  );
  const fieldsBySidebar = useMemo(
    () =>
      new Map(pages.map((page, index) => [page.sidebarId, pageFields[index]])),
    [pages, pageFields],
  );
  return { lookupSources, fieldsBySidebar };
}

/**
 * The fields and records of each sidebar, shared with those pages' own queries; one shows up once both have loaded.
 * errors holds why a sidebar's records couldn't load, by sidebarId; retry fetches them again.
 * @example
 * const { lookups } = useSidebarLookups(getRecords, ["shipment-location"], fieldsBySidebar);
 */
export function useSidebarLookups(
  getRecords: (sidebarId: string) => Promise<ISidebarRecord[]>,
  sidebarIds: string[],
  fieldsBySidebar: Map<string, ISidebarField[] | undefined>,
) {
  const queryClient = useQueryClient();
  const results = useQueries({
    queries: sidebarIds.map((sidebarId) => ({
      queryKey: recordKeys.list(sidebarId),
      queryFn: () => getRecords(sidebarId),
    })),
    combine: recordsAndErrors,
  });
  const lookups = useMemo<RecordLookups>(
    () =>
      Object.fromEntries(
        sidebarIds.flatMap((sidebarId, index) => {
          const sidebarRecords = results.records[index];
          const fields = fieldsBySidebar.get(sidebarId);
          return sidebarRecords && fields
            ? [[sidebarId, { fields, records: sidebarRecords }]]
            : [];
        }),
      ),
    [sidebarIds, results.records, fieldsBySidebar],
  );
  const errors = useMemo<Record<string, unknown>>(
    () =>
      Object.fromEntries(
        sidebarIds.flatMap((sidebarId, index) =>
          results.errors[index] ? [[sidebarId, results.errors[index]]] : [],
        ),
      ),
    [sidebarIds, results.errors],
  );
  const retry = useCallback(
    (sidebarId: string) =>
      queryClient.refetchQueries({ queryKey: recordKeys.list(sidebarId) }),
    [queryClient],
  );
  return { lookups, errors, retry };
}

/**
 * Adds a record to any sidebar and puts it first in that sidebar's cached list, which its lookups share.
 * @example
 * const onAddRecord = useAddRecord(createRecord);
 * await onAddRecord("shipment", values);
 */
export function useAddRecord(
  createRecord: (
    sidebarId: string,
    values: ISidebarRecordValues,
  ) => Promise<ISidebarRecord>,
) {
  const queryClient = useQueryClient();
  const { mutateAsync } = useMutation({
    mutationFn: ({
      sidebarId,
      values,
    }: {
      sidebarId: string;
      values: ISidebarRecordValues;
    }) => createRecord(sidebarId, values),
    onSuccess: (created, { sidebarId }) =>
      queryClient.setQueryData<ISidebarRecord[]>(
        recordKeys.list(sidebarId),
        (current) => [created, ...(current ?? [])],
      ),
  });
  return useCallback(
    (sidebarId: string, values: ISidebarRecordValues) =>
      mutateAsync({ sidebarId, values }),
    [mutateAsync],
  );
}
