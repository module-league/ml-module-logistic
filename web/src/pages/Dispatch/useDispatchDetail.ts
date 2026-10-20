import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { checkpointKeys } from "@/services/checkpoints/checkpoint.api";

export interface DispatchDetailApi {
  getCheckpoints: (dispatchId: string) => Promise<ICheckpointLog[]>;
  createCheckpoint: (
    dispatchId: string,
    body: ICheckpointLogCreate,
  ) => Promise<ICheckpointLog>;
  updateCheckpointLabel: (
    dispatchId: string,
    objId: string,
    attachmentId: string,
    label?: string,
  ) => Promise<ICheckpointLog>;
  uploadAttachment: (refId: string, file: File) => Promise<IAttachment>;
}

const NO_CHECKPOINTS: ICheckpointLog[] = [];

/**
 * Backs the dispatch detail dialog: which dispatch is open, its checkpoint log (GET /dispatches/{id}/checkpoints),
 * posting to it, which puts the new entry first in the cached log, relabelling a posted file, and uploading files for it.
 * Pass a module-level api object so it stays the same between renders.
 * @example
 * const detail = useDispatchDetail(detailApi);
 * detail.onOpen(dispatch.objId);
 */
export function useDispatchDetail(api: DispatchDetailApi) {
  const queryClient = useQueryClient();
  const [dispatchId, setDispatchId] = useState<string>();
  const id = dispatchId ?? "";

  const checkpointsQuery = useQuery({
    queryKey: checkpointKeys.list(id),
    queryFn: () => api.getCheckpoints(id),
    enabled: !!dispatchId,
  });

  const { mutateAsync: addCheckpoint, isPending: isPosting } = useMutation({
    mutationFn: (body: ICheckpointLogCreate) => api.createCheckpoint(id, body),
    onSuccess: (created) =>
      queryClient.setQueryData<ICheckpointLog[]>(
        checkpointKeys.list(created.dispatchId),
        (current) => [created, ...(current ?? [])],
      ),
  });

  const { mutateAsync: relabel } = useMutation({
    mutationFn: ({
      objId,
      attachmentId,
      label,
    }: {
      objId: string;
      attachmentId: string;
      label?: string;
    }) => api.updateCheckpointLabel(id, objId, attachmentId, label),
    onSuccess: (updated) =>
      queryClient.setQueryData<ICheckpointLog[]>(
        checkpointKeys.list(updated.dispatchId),
        (current) =>
          current?.map((log) => (log.objId === updated.objId ? updated : log)),
      ),
  });
  const onLabel = useCallback(
    (objId: string, attachmentId: string, label?: string) =>
      relabel({ objId, attachmentId, label }),
    [relabel],
  );

  const upload = api.uploadAttachment;
  const onUpload = useCallback((file: File) => upload(id, file), [upload, id]);
  const onClose = useCallback(() => setDispatchId(undefined), []);
  const refetch = checkpointsQuery.refetch;
  const onRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  return useMemo(
    () => ({
      dispatchId,
      onOpen: setDispatchId,
      onClose,
      checkpoints: checkpointsQuery.data ?? NO_CHECKPOINTS,
      isLoading: checkpointsQuery.isLoading,
      error: checkpointsQuery.error,
      onRetry,
      onAddCheckpoint: addCheckpoint,
      isPosting,
      onLabel,
      onUpload,
    }),
    [
      dispatchId,
      onClose,
      checkpointsQuery.data,
      checkpointsQuery.isLoading,
      checkpointsQuery.error,
      onRetry,
      addCheckpoint,
      isPosting,
      onLabel,
      onUpload,
    ],
  );
}

export type DispatchDetailData = ReturnType<typeof useDispatchDetail>;
