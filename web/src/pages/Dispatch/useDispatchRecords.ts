import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { dispatchKeys } from "@/services/dispatches/dispatch.api";
import { memberKeys } from "@/services/user/user.api";
import {
  useLookupSources,
  useSidebarLookups,
} from "@/module/page/useRecordSources";

export interface DispatchRecordsApi {
  getFields: (sidebarId: string) => Promise<ISidebarField[]>;
  getRecords: (sidebarId: string) => Promise<ISidebarRecord[]>;
  getMembers: () => Promise<IUserInfo[]>;
  getDispatches: () => Promise<IDispatch[]>;
  getDispatchSources: () => Promise<IDispatchSources>;
  getDispatchSettings: () => Promise<IDispatchSettings>;
}

const NO_IDS: string[] = [];
const NO_MEMBERS: IUserInfo[] = [];
const NO_DISPATCHES: IDispatch[] = [];

/**
 * Loads what a dispatch board is built from: the sidebars dispatches pick from (GET /dispatches/sources), which shipment
 * fields the card reads (GET /dispatches/settings), those sidebars' fields and records, every dispatch and the members,
 * with one loading state, one error and one retry for them all.
 * Pass a module-level api object so it stays the same between renders.
 * @example
 * const records = useDispatchRecords(api);
 * buildDispatchBoard(records.sources, records.lookups, records.dispatches, records.members);
 */
export function useDispatchRecords(api: DispatchRecordsApi) {
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
              sources.shipmentSidebarId,
              sources.driverSidebarId,
              sources.vehicleSidebarId,
              sources.locationSidebarId,
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
        !lookupSources.some((source) => source.sidebarId === sidebarId),
    );
    return missing != null && missing !== ""
      ? new Error(
          `'${missing}' isn't a page of this module. Fix the Dispatch section of the API's appsettings.`,
        )
      : Object.values(lookupErrors)[0];
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
    (error == null &&
      sidebarIds.some((sidebarId) => lookups[sidebarId] === undefined));

  const refetchSources = sourcesQuery.refetch;
  const refetchDispatches = dispatchesQuery.refetch;
  const refetchSettings = settingsQuery.refetch;
  const onRetry = useCallback(() => {
    void refetchSources();
    void refetchDispatches();
    void refetchSettings();
    sidebarIds.forEach((sidebarId) => void retry(sidebarId));
  }, [refetchSources, refetchDispatches, refetchSettings, sidebarIds, retry]);

  return useMemo(
    () => ({
      sources,
      lookupSources,
      lookups,
      dispatches: dispatchesQuery.data ?? NO_DISPATCHES,
      settings: settingsQuery.data,
      members: membersQuery.data ?? NO_MEMBERS,
      isLoading,
      error,
      onRetry,
    }),
    [
      sources,
      lookupSources,
      lookups,
      dispatchesQuery.data,
      settingsQuery.data,
      membersQuery.data,
      isLoading,
      error,
      onRetry,
    ],
  );
}

export type DispatchRecords = ReturnType<typeof useDispatchRecords>;
