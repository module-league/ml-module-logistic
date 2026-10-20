import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dispatchKeys } from "@/services/dispatches/dispatch.api";
import { memberKeys } from "@/services/user/user.api";
import {
  useLookupSources,
  useSidebarLookups,
} from "@/module/page/useRecordSources";

export interface DispatchApi {
  getFields: (sidebarId: string) => Promise<ISidebarField[]>;
  getRecords: (sidebarId: string) => Promise<ISidebarRecord[]>;
  getMembers: () => Promise<IUserInfo[]>;
  getDispatches: () => Promise<IDispatch[]>;
  getDispatchSources: () => Promise<IDispatchSources>;
  getDispatchSettings: () => Promise<IDispatchSettings>;
  saveDispatchSettings: (
    body: IDispatchSettingsInput,
  ) => Promise<IDispatchSettings>;
  createDispatch: (body: IDispatchCreate) => Promise<IDispatch>;
}

const NO_IDS: string[] = [];
const NO_MEMBERS: IUserInfo[] = [];
const NO_DISPATCHES: IDispatch[] = [];

/**
 * Runs the Dispatch page's API: the sidebars dispatches pick from (GET /dispatches/sources), which shipment fields the board
 * reads (GET /dispatches/settings), the sidebars' fields and records, every dispatch, and the saves, which update the cache.
 * Also holds the full assign dialog.
 * Pass a module-level api object so it stays the same between renders.
 * @example
 * const data = useDispatchData(dispatchApi);
 * <DispatchPage data={data} />
 */
export function useDispatchData(api: DispatchApi) {
  const queryClient = useQueryClient();
  const sourcesQuery = useQuery({
    queryKey: dispatchKeys.sources(),
    queryFn: api.getDispatchSources,
  });
  const dispatchesQuery = useQuery({
    queryKey: dispatchKeys.list(),
    queryFn: api.getDispatches,
  });
  const settingsQuery = useQuery({
    queryKey: dispatchKeys.settings(),
    queryFn: api.getDispatchSettings,
  });
  const membersQuery = useQuery({
    queryKey: memberKeys.all,
    queryFn: api.getMembers,
  });
  const sources = sourcesQuery.data;

  const { lookupSources, fieldsBySidebar } = useLookupSources(api.getFields);
  const sidebarIds = useMemo(
    () =>
      sources
        ? [
            ...new Set([
              sources?.shipmentSidebarId,
              sources?.driverSidebarId,
              sources?.vehicleSidebarId,
              sources?.locationSidebarId,
            ]),
          ]
        : NO_IDS,
    [sources],
  );
  const {
    lookups,
    errors: lookupErrors,
    retry,
  } = useSidebarLookups(api.getRecords, sidebarIds, fieldsBySidebar);

  const lookupError = useMemo(() => {
    const missing = sidebarIds.find(
      (sidebarId) =>
        !lookupSources?.some((source) => source?.sidebarId === sidebarId),
    );
    return missing
      ? new Error(
          `'${missing}' isn't a page of this module. Fix the Dispatch section of the API's appsettings.`,
        )
      : Object.values(lookupErrors)?.[0];
  }, [sidebarIds, lookupSources, lookupErrors]);
  const error =
    sourcesQuery.error ??
    dispatchesQuery.error ??
    settingsQuery.error ??
    lookupError;
  const isLoading =
    sourcesQuery.isLoading ||
    dispatchesQuery.isLoading ||
    settingsQuery.isLoading ||
    (!error && sidebarIds.some((sidebarId) => !lookups?.[sidebarId]));

  const refetchSources = sourcesQuery.refetch;
  const refetchDispatches = dispatchesQuery.refetch;
  const refetchSettings = settingsQuery.refetch;
  const onRetry = useCallback(() => {
    refetchSources();
    refetchDispatches();
    refetchSettings();
    sidebarIds.forEach(retry);
  }, [refetchSources, refetchDispatches, refetchSettings, sidebarIds, retry]);

  const { mutateAsync: onSaveSettings } = useMutation({
    mutationFn: api.saveDispatchSettings,
    onSuccess: (saved) =>
      queryClient.setQueryData(dispatchKeys.settings(), saved),
  });

  const { mutateAsync: onCreateDispatch, isPending: isCreating } = useMutation({
    mutationFn: api.createDispatch,
    onSuccess: (created) =>
      queryClient.setQueryData<IDispatch[]>(dispatchKeys.list(), (current) => [
        created,
        ...(current ?? []),
      ]),
  });

  const [dialog, setDialog] = useState<{
    open: boolean;
    draft: Partial<IDispatchCreate>;
  }>({ open: false, draft: {} });
  const onOpenDialog = useCallback(
    (draft: Partial<IDispatchCreate> = {}) => setDialog({ open: true, draft }),
    [],
  );
  const onDialogOpenChange = useCallback(
    (open: boolean) => setDialog((current) => ({ ...current, open })),
    [],
  );

  return useMemo(
    () => ({
      sources,
      lookupSources,
      lookups,
      dispatches: dispatchesQuery.data ?? NO_DISPATCHES,
      settings: settingsQuery.data,
      onSaveSettings,
      members: membersQuery.data ?? NO_MEMBERS,
      isLoading,
      error,
      onRetry,
      onCreateDispatch,
      isCreating,
      dialog,
      onOpenDialog,
      onDialogOpenChange,
    }),
    [
      sources,
      lookupSources,
      lookups,
      dispatchesQuery.data,
      settingsQuery.data,
      onSaveSettings,
      membersQuery.data,
      isLoading,
      error,
      onRetry,
      onCreateDispatch,
      isCreating,
      dialog,
      onOpenDialog,
      onDialogOpenChange,
    ],
  );
}

export type DispatchData = ReturnType<typeof useDispatchData>;
