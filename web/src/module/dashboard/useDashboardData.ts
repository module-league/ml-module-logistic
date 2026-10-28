import { useCallback, useMemo, useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { dashboardKeys } from "@/services/dashboards/dashboard.api";
import { formKeys } from "@/services/forms/form.api";
import { recordKeys } from "@/services/records/record.api";
import { memberKeys } from "@/services/user/user.api";
import {
  useAddRecord,
  useLookupSources,
  useSidebarLookups,
} from "@/module/page/useRecordSources";
import {
  normalizeDashboard,
  sidebarsToLoad,
  toDashboardInput,
} from "./moduleDashboard.utils";
import type {
  ModuleDashboardApi,
  ModuleDashboardData,
} from "./moduleDashboard.types";

const NO_MEMBERS: IUserInfo[] = [];

function formsOf(results: UseQueryResult<ISidebarForm[]>[]) {
  return {
    forms: results.flatMap((result) => result.data ?? []),
    isLoading: results.some((result) => result.isLoading),
    error: results.find((result) => result.error)?.error,
  };
}

/**
 * Runs a dashboard page's API for one sidebar: its saved overview, the draft while customizing,
 * and the records of every table its widgets read. Pass a module-level api object so it stays the same between renders.
 */
export function useDashboardData(
  sidebarId: string | undefined,
  api: ModuleDashboardApi,
): ModuleDashboardData {
  const id = sidebarId ?? "";
  const queryClient = useQueryClient();

  const dashboardQuery = useQuery({
    queryKey: dashboardKeys.detail(id),
    queryFn: () => api.getDashboard(id),
    enabled: sidebarId != null && sidebarId !== "",
  });
  const membersQuery = useQuery({
    queryKey: memberKeys.all,
    queryFn: () => api.getMembers(),
  });

  const saved = useMemo(
    () => normalizeDashboard(dashboardQuery.data, id),
    [dashboardQuery.data, id],
  );
  const [draft, setDraft] = useState<ISidebarDashboard>();
  const layout = draft ?? saved;

  const { lookupSources, fieldsBySidebar } = useLookupSources(api.getFields);
  // Tables a widget can read: every page with fields except this one
  const sources = useMemo(
    () =>
      lookupSources.filter(
        (source) => source.sidebarId !== id && source.fields.length > 0,
      ),
    [lookupSources, id],
  );
  const loadIds = useMemo(
    () => sidebarsToLoad(layout, fieldsBySidebar),
    [layout, fieldsBySidebar],
  );
  const {
    lookups,
    errors: lookupErrors,
    retry: retryLookup,
  } = useSidebarLookups(api.getRecords, loadIds, fieldsBySidebar);
  const onRetryLookup = useCallback(
    (lookupId: string) => {
      void retryLookup(lookupId);
    },
    [retryLookup],
  );

  // Customize offers every table's forms; the page itself only needs the New button's
  const formSidebarIds = useMemo(
    () =>
      draft
        ? sources.map((source) => source.sidebarId)
        : layout.newRecordFormId != null &&
            layout.newRecordFormId !== "" &&
            layout.newRecordSidebarId != null &&
            layout.newRecordSidebarId !== ""
          ? [layout.newRecordSidebarId]
          : [],
    [draft, sources, layout.newRecordFormId, layout.newRecordSidebarId],
  );
  const { forms, ...formsQueryState } = useQueries({
    queries: formSidebarIds.map((formSidebarId) => ({
      queryKey: formKeys.list(formSidebarId),
      queryFn: () => api.getForms(formSidebarId),
    })),
    combine: formsOf,
  });
  const formsState = useMemo(
    () => ({
      isLoading: formsQueryState.isLoading,
      error: formsQueryState.error,
      onRetry: () => {
        void queryClient.refetchQueries({
          queryKey: formKeys.all,
          type: "active",
        });
      },
    }),
    [formsQueryState.isLoading, formsQueryState.error, queryClient],
  );

  const onCustomize = useCallback(
    (start?: ISidebarDashboard) => setDraft(start ?? saved),
    [saved],
  );
  const onCancelCustomize = useCallback(() => setDraft(undefined), []);
  const onLayoutChange = useCallback(
    (update: (current: ISidebarDashboard) => ISidebarDashboard) =>
      setDraft((current) => (current ? update(current) : current)),
    [],
  );

  const { mutateAsync: saveDashboard, isPending: saving } = useMutation({
    mutationFn: (input: ISidebarDashboardInput) => api.saveDashboard(id, input),
    onSuccess: (result) => {
      queryClient.setQueryData(dashboardKeys.detail(id), result);
      setDraft(undefined);
    },
  });
  const onSaveLayout = useCallback(() => {
    if (!draft) return Promise.resolve();
    return saveDashboard(toDashboardInput(draft, saved.versionNo));
  }, [draft, saved.versionNo, saveDashboard]);

  const { mutateAsync: updateRecord } = useMutation({
    mutationFn: ({
      recordSidebarId,
      objId,
      values,
    }: {
      recordSidebarId: string;
      objId: string;
      values: ISidebarRecordValues;
    }) => {
      const latest = queryClient
        .getQueryData<ISidebarRecord[]>(recordKeys.list(recordSidebarId))
        ?.find((record) => record.objId === objId);
      if (!latest)
        return Promise.reject(new Error("The record no longer exists."));
      return api.updateRecord(recordSidebarId, objId, {
        values,
        versionNo: latest.versionNo,
      });
    },
    // The record moves at once, e.g. to the board column it was dropped in
    onMutate: async ({ recordSidebarId, objId, values }) => {
      const key = recordKeys.list(recordSidebarId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ISidebarRecord[]>(key);
      queryClient.setQueryData<ISidebarRecord[]>(key, (current) =>
        current?.map((record) =>
          record.objId === objId
            ? { ...record, values: { ...record.values, ...values } }
            : record,
        ),
      );
      return { previous };
    },
    onError: (_error, { recordSidebarId }, context) =>
      queryClient.setQueryData(
        recordKeys.list(recordSidebarId),
        context?.previous,
      ),
    onSuccess: (updated, { recordSidebarId }) => {
      queryClient.setQueryData<ISidebarRecord[]>(
        recordKeys.list(recordSidebarId),
        (current) =>
          current?.map((record) =>
            record.objId === updated.objId ? updated : record,
          ),
      );
      queryClient.setQueryData(
        recordKeys.detail(recordSidebarId, updated.objId),
        updated,
      );
    },
  });
  const onUpdateRecord = useCallback(
    (recordSidebarId: string, objId: string, values: ISidebarRecordValues) =>
      updateRecord({ recordSidebarId, objId, values }),
    [updateRecord],
  );
  const onAddRecord = useAddRecord(api.createRecord);
  const uploadAttachment = api.uploadAttachment;
  const onUploadAttachment = useCallback(
    (refId: string, file: File) => uploadAttachment(refId, file),
    [uploadAttachment],
  );

  const refetchDashboard = dashboardQuery.refetch;
  const dashboardState = useMemo(
    () => ({
      isLoading: dashboardQuery.isLoading,
      error: dashboardQuery.error,
      onRetry: () => {
        void refetchDashboard();
      },
    }),
    [dashboardQuery.isLoading, dashboardQuery.error, refetchDashboard],
  );

  return useMemo(
    () => ({
      sidebarId: id,
      dashboardState,
      layout,
      isNew: saved.objId == null || saved.objId === "",
      customizing: !!draft,
      onCustomize,
      onCancelCustomize,
      onLayoutChange,
      onSaveLayout,
      saving,
      sources,
      lookups,
      lookupErrors,
      onRetryLookup,
      members: membersQuery.data ?? NO_MEMBERS,
      forms,
      formsState,
      onUpdateRecord,
      onAddRecord,
      onUploadAttachment,
    }),
    [
      id,
      dashboardState,
      layout,
      saved.objId,
      draft,
      onCustomize,
      onCancelCustomize,
      onLayoutChange,
      onSaveLayout,
      saving,
      sources,
      lookups,
      lookupErrors,
      onRetryLookup,
      membersQuery.data,
      forms,
      formsState,
      onUpdateRecord,
      onAddRecord,
      onUploadAttachment,
    ],
  );
}
