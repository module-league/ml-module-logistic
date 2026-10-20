import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { dispatchKeys } from "@/services/dispatches/dispatch.api";
import { memberKeys } from "@/services/user/user.api";
import {
  useLookupSources,
  useSidebarLookups,
} from "@/module/page/useRecordSources";

export interface DispatchJobApi {
  getFields: (sidebarId: string) => Promise<ISidebarField[]>;
  getRecords: (sidebarId: string) => Promise<ISidebarRecord[]>;
  getMembers: () => Promise<IUserInfo[]>;
  getDispatchSources: () => Promise<IDispatchSources>;
  createDispatch: (body: IDispatchCreate) => Promise<IDispatch>;
}

const NO_IDS: string[] = [];
const NO_MEMBERS: IUserInfo[] = [];

/**
 * Backs the Dispatch job dialog: whether it is open, the sidebars it picks from (GET /dispatches/sources),
 * their records once it opens, and the save. Pass a module-level api object so it stays the same between renders.
 * @example
 * const job = useDispatchJob(dispatchApi);
 * <DispatchJobDialog job={job} />
 */
export function useDispatchJob(api: DispatchJobApi) {
  const [open, setOpen] = useState(false);
  const sourcesQuery = useQuery({
    queryKey: dispatchKeys.sources(),
    queryFn: api.getDispatchSources,
    enabled: open,
  });
  const membersQuery = useQuery({
    queryKey: memberKeys.all,
    queryFn: api.getMembers,
    enabled: open,
  });
  const sources = sourcesQuery.data;

  const { lookupSources, fieldsBySidebar } = useLookupSources(api.getFields);
  const sidebarIds = useMemo(
    () =>
      open && sources
        ? [
            ...new Set([
              sources?.shipmentSidebarId,
              sources?.driverSidebarId,
              sources?.vehicleSidebarId,
              sources?.locationSidebarId,
            ]),
          ]
        : NO_IDS,
    [open, sources],
  );
  const {
    lookups,
    errors: lookupErrors,
    retry,
  } = useSidebarLookups(api.getRecords, sidebarIds, fieldsBySidebar);

  const refetchSources = sourcesQuery.refetch;
  const onRetry = useCallback(() => {
    refetchSources();
    sidebarIds.forEach(retry);
  }, [refetchSources, sidebarIds, retry]);

  const { mutateAsync: onCreateDispatch, isPending: isCreating } = useMutation({
    mutationFn: api.createDispatch,
  });

  return useMemo(
    () => ({
      open,
      onOpenChange: setOpen,
      sources,
      lookupSources,
      lookups,
      members: membersQuery.data ?? NO_MEMBERS,
      isLoading: sourcesQuery.isLoading,
      error: sourcesQuery.error ?? Object.values(lookupErrors)?.[0],
      onRetry,
      onCreateDispatch,
      isCreating,
    }),
    [
      open,
      sources,
      lookupSources,
      lookups,
      membersQuery.data,
      sourcesQuery.isLoading,
      sourcesQuery.error,
      lookupErrors,
      onRetry,
      onCreateDispatch,
      isCreating,
    ],
  );
}

export type DispatchJobData = ReturnType<typeof useDispatchJob>;
