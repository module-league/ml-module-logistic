import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dispatchKeys } from "@/services/dispatches/dispatch.api";
import {
  useDispatchRecords,
  type DispatchRecordsApi,
} from "./useDispatchRecords";

export interface DispatchApi extends DispatchRecordsApi {
  saveDispatchSettings: (
    body: IDispatchSettingsInput,
  ) => Promise<IDispatchSettings>;
  createDispatch: (body: IDispatchCreate) => Promise<IDispatch>;
}

/**
 * Runs the Dispatch page's API: everything useDispatchRecords loads, plus saving the card settings and planning a
 * dispatch, which update the cache. Also holds the full assign dialog.
 * Pass a module-level api object so it stays the same between renders.
 * @example
 * const data = useDispatchData(dispatchApi);
 * <DispatchPage data={data} />
 */
export function useDispatchData(api: DispatchApi) {
  const queryClient = useQueryClient();
  const records = useDispatchRecords(api);

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
      ...records,
      onSaveSettings,
      onCreateDispatch,
      isCreating,
      dialog,
      onOpenDialog,
      onDialogOpenChange,
    }),
    [
      records,
      onSaveSettings,
      onCreateDispatch,
      isCreating,
      dialog,
      onOpenDialog,
      onDialogOpenChange,
    ],
  );
}

export type DispatchData = ReturnType<typeof useDispatchData>;
