import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { exceptionKeys } from "@/services/exceptions/exception.api";
import { dispatchKeys } from "@/services/dispatches/dispatch.api";
import { recordKeys } from "@/services/records/record.api";
import {
  useDispatchRecords,
  type DispatchRecordsApi,
} from "../Dispatch/useDispatchRecords";

export interface ExceptionApi extends DispatchRecordsApi {
  getExceptions: () => Promise<IException[]>;
  getExceptionRules: () => Promise<IExceptionRule[]>;
  getExceptionSettings: () => Promise<IExceptionSettings>;
  saveExceptionSettings: (
    body: IExceptionSettingsInput,
  ) => Promise<IExceptionSettings>;
  evaluateExceptions: () => Promise<void>;
  createException: (body: IExceptionCreate) => Promise<IExceptionChange>;
  getExceptionActivity: (objId: string) => Promise<IExceptionActivity[]>;
  addExceptionActivity: (
    objId: string,
    body: { kind: "note" | "action"; body: string },
  ) => Promise<IExceptionActivity>;
  assignException: (
    objId: string,
    body: { ownerId?: string; versionNo: number },
  ) => Promise<IExceptionChange>;
  snoozeException: (
    objId: string,
    body: { until: string; versionNo: number; note?: string },
  ) => Promise<IExceptionChange>;
  wakeException: (
    objId: string,
    body: { versionNo: number },
  ) => Promise<IExceptionChange>;
  resolveException: (
    objId: string,
    body: { reason: string; note?: string; versionNo: number },
  ) => Promise<IExceptionChange>;
  planDispatch: (objId: string, body: IDispatchPlan) => Promise<IDispatch>;
  updateRecord: (
    sidebarId: string,
    objId: string,
    body: ISidebarRecordUpdate,
  ) => Promise<ISidebarRecord>;
}

const NO_EXCEPTIONS: IException[] = [];
const NO_RULES: IExceptionRule[] = [];
const NO_ACTIVITY: IExceptionActivity[] = [];

/**
 * Runs the Exceptions page's API: every exception (GET /exceptions), the rules and the fields they read, next to the
 * shipments, dispatches and drivers they are about (see useDispatchRecords), and the timeline of the selected one.
 * Every change puts the changed exception and its new timeline entry in the cache. Fixes that change a shipment or a
 * dispatch run the rules right after (POST /exceptions/evaluate), so an exception whose condition cleared closes itself
 * at once. A failed change reloads the list in case it is stale.
 * Pass a module-level api object so it stays the same between renders.
 * @example
 * const data = useExceptionData(exceptionApi);
 * data.onResolve(exception, "False alarm");
 */
export function useExceptionData(api: ExceptionApi) {
  const queryClient = useQueryClient();
  const records = useDispatchRecords(api);
  // The rules run every minute on the server, so new and auto-closed exceptions show up without a reload
  const exceptionsQuery = useQuery({
    queryKey: exceptionKeys.list(),
    queryFn: api.getExceptions,
    refetchInterval: 60_000,
  });
  const rulesQuery = useQuery({
    queryKey: exceptionKeys.rules(),
    queryFn: api.getExceptionRules,
  });
  const settingsQuery = useQuery({
    queryKey: exceptionKeys.settings(),
    queryFn: api.getExceptionSettings,
  });

  const [selectedId, setSelectedId] = useState<string>();

  const putActivity = useCallback(
    (activity: IExceptionActivity) =>
      queryClient.setQueryData<IExceptionActivity[]>(
        exceptionKeys.activity(activity.exceptionId),
        (current) => current && [...current, activity],
      ),
    [queryClient],
  );
  const putChange = useCallback(
    ({ exception, activity }: IExceptionChange) => {
      queryClient.setQueryData<IException[]>(exceptionKeys.list(), (current) =>
        current?.some((entry) => entry.objId === exception.objId) === true
          ? current.map((entry) =>
              entry.objId === exception.objId ? exception : entry,
            )
          : [exception, ...(current ?? [])],
      );
      putActivity(activity);
    },
    [queryClient, putActivity],
  );
  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: exceptionKeys.all }),
    [queryClient],
  );
  const evaluate = api.evaluateExceptions;
  const rerun = useCallback(async () => {
    await evaluate();
    await reload();
  }, [evaluate, reload]);

  const { mutateAsync: change, isPending: isChanging } = useMutation({
    mutationFn: (run: () => Promise<IExceptionChange>) => run(),
    onSuccess: putChange,
    onError: reload,
  });
  const {
    assignException,
    snoozeException,
    wakeException,
    resolveException,
    createException,
  } = api;
  const onAssign = useCallback(
    (exception: IException, ownerId?: string) =>
      change(() =>
        assignException(exception.objId, {
          ownerId,
          versionNo: exception.versionNo,
        }),
      ),
    [change, assignException],
  );
  const onSnooze = useCallback(
    (exception: IException, until: Date, note?: string) =>
      change(() =>
        snoozeException(exception.objId, {
          until: until.toISOString(),
          note,
          versionNo: exception.versionNo,
        }),
      ),
    [change, snoozeException],
  );
  const onWake = useCallback(
    (exception: IException) =>
      change(() =>
        wakeException(exception.objId, { versionNo: exception.versionNo }),
      ),
    [change, wakeException],
  );
  const onResolve = useCallback(
    (exception: IException, reason: string, note?: string) =>
      change(() =>
        resolveException(exception.objId, {
          reason,
          note,
          versionNo: exception.versionNo,
        }),
      ),
    [change, resolveException],
  );
  const onCreate = useCallback(
    (body: IExceptionCreate) => change(() => createException(body)),
    [change, createException],
  );

  const { mutateAsync: log, isPending: isLogging } = useMutation({
    mutationFn: ({
      exception,
      ...body
    }: {
      exception: IException;
      kind: "note" | "action";
      body: string;
    }) => api.addExceptionActivity(exception.objId, body),
    onSuccess: putActivity,
  });
  const onLog = useCallback(
    (exception: IException, kind: "note" | "action", body: string) =>
      log({ exception, kind, body }),
    [log],
  );

  const { mutateAsync: plan, isPending: isPlanning } = useMutation({
    mutationFn: ({ objId, ...body }: IDispatchPlan & { objId: string }) =>
      api.planDispatch(objId, body),
    onSuccess: async (updated) => {
      queryClient.setQueryData<IDispatch[]>(dispatchKeys.list(), (current) =>
        current?.map((entry) =>
          entry.objId === updated.objId ? updated : entry,
        ),
      );
      await rerun();
    },
  });
  const onPlan = useCallback(
    (dispatch: IDispatch, body: Omit<IDispatchPlan, "versionNo">) =>
      plan({ objId: dispatch.objId, versionNo: dispatch.versionNo, ...body }),
    [plan],
  );

  const { mutateAsync: updateRecord, isPending: isUpdating } = useMutation({
    mutationFn: ({
      sidebarId,
      objId,
      body,
    }: {
      sidebarId: string;
      objId: string;
      body: ISidebarRecordUpdate;
    }) => api.updateRecord(sidebarId, objId, body),
    onSuccess: async (updated) => {
      queryClient.setQueryData<ISidebarRecord[]>(
        recordKeys.list(updated.sidebarId),
        (current) =>
          current?.map((entry) =>
            entry.objId === updated.objId ? updated : entry,
          ),
      );
      await rerun();
    },
  });
  const onUpdateRecord = useCallback(
    (sidebarId: string, objId: string, body: ISidebarRecordUpdate) =>
      updateRecord({ sidebarId, objId, body }),
    [updateRecord],
  );

  const { mutateAsync: onSaveSettings } = useMutation({
    mutationFn: api.saveExceptionSettings,
    onSuccess: async (saved) => {
      queryClient.setQueryData(exceptionKeys.settings(), saved);
      await reload();
    },
  });

  const recordsRetry = records.onRetry;
  const refetchExceptions = exceptionsQuery.refetch;
  const refetchRules = rulesQuery.refetch;
  const refetchSettings = settingsQuery.refetch;
  const onRetry = useCallback(() => {
    recordsRetry();
    void refetchExceptions();
    void refetchRules();
    void refetchSettings();
  }, [recordsRetry, refetchExceptions, refetchRules, refetchSettings]);
  return useMemo(
    () => ({
      ...records,
      exceptions: exceptionsQuery.data ?? NO_EXCEPTIONS,
      /** When the list was last loaded or changed, in ms. */
      updatedAt: exceptionsQuery.dataUpdatedAt,
      rules: rulesQuery.data ?? NO_RULES,
      exceptionSettings: settingsQuery.data,
      isLoading:
        records.isLoading ||
        exceptionsQuery.isLoading ||
        rulesQuery.isLoading ||
        settingsQuery.isLoading,
      error:
        records.error ??
        exceptionsQuery.error ??
        rulesQuery.error ??
        settingsQuery.error,
      onRetry,
      selectedId,
      onSelect: setSelectedId,
      onCreate,
      onAssign,
      onSnooze,
      onWake,
      onResolve,
      onLog,
      onPlan,
      onUpdateRecord,
      onSaveSettings,
      isSaving: isChanging || isLogging || isPlanning || isUpdating,
    }),
    [
      records,
      exceptionsQuery.data,
      exceptionsQuery.dataUpdatedAt,
      exceptionsQuery.isLoading,
      exceptionsQuery.error,
      rulesQuery.data,
      rulesQuery.isLoading,
      rulesQuery.error,
      settingsQuery.data,
      settingsQuery.isLoading,
      settingsQuery.error,
      onRetry,
      selectedId,
      onCreate,
      onAssign,
      onSnooze,
      onWake,
      onResolve,
      onLog,
      onPlan,
      onUpdateRecord,
      onSaveSettings,
      isChanging,
      isLogging,
      isPlanning,
      isUpdating,
    ],
  );
}

export type ExceptionData = ReturnType<typeof useExceptionData>;

/**
 * Loads the timeline of the exception shown (GET /exceptions/{id}/activity); changes made through useExceptionData add to it.
 * @example
 * const activity = useExceptionActivity(exceptionApi.getExceptionActivity, selected?.exception.objId);
 */
export function useExceptionActivity(
  getActivity: ExceptionApi["getExceptionActivity"],
  exceptionId?: string,
) {
  const query = useQuery({
    queryKey: exceptionKeys.activity(exceptionId ?? ""),
    queryFn: () => getActivity(exceptionId ?? ""),
    enabled: exceptionId != null && exceptionId !== "",
  });
  const refetch = query.refetch;
  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  return useMemo(
    () => ({
      entries: query.data ?? NO_ACTIVITY,
      isLoading: query.isLoading,
      error: query.error,
      onRetry,
    }),
    [query.data, query.isLoading, query.error, onRetry],
  );
}

export type ExceptionActivityData = ReturnType<typeof useExceptionActivity>;
