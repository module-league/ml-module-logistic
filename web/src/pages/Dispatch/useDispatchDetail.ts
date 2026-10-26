import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { checkpointKeys } from "@/services/checkpoints/checkpoint.api";
import { dispatchKeys } from "@/services/dispatches/dispatch.api";
import { exceptionKeys } from "@/services/exceptions/exception.api";

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
  moveDispatch: (
    objId: string,
    body: IDispatchMove,
  ) => Promise<IDispatchMoveResult>;
  createException: (body: IExceptionCreate) => Promise<IExceptionChange>;
  getExceptionRules: () => Promise<IExceptionRule[]>;
}

const NO_CHECKPOINTS: ICheckpointLog[] = [];
const NO_RULES: IExceptionRule[] = [];

/**
 * Backs the dispatch detail dialog: which dispatch is open, its checkpoint log (GET /dispatches/{id}/checkpoints),
 * posting to it, which puts the new entry first in the cached log, relabelling a posted file, uploading files for it, and moving
 * it to another status (PUT /dispatches/{id}/status), which updates the board's dispatch and logs the move; a cancelled
 * dispatch leaves the board, so the dialog closes, and a failed move reloads the dispatches in case they are stale.
 * Also raises an exception on it by hand (POST /exceptions, under a manual rule from GET /exceptions/rules), added to the
 * Exceptions page's list if that is loaded. Opens on initialId when given, e.g. from a ?dispatch= link.
 * Pass a module-level api object so it stays the same between renders.
 * @example
 * const detail = useDispatchDetail(detailApi, searchParams.get("dispatch") ?? undefined);
 * detail.onOpen(dispatch.objId);
 */
export function useDispatchDetail(api: DispatchDetailApi, initialId?: string) {
  const queryClient = useQueryClient();
  const [dispatchId, setDispatchId] = useState(initialId);
  const rulesQuery = useQuery({
    queryKey: exceptionKeys.rules(),
    queryFn: api.getExceptionRules,
  });
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

  const { mutateAsync: move, isPending: isMoving } = useMutation({
    mutationFn: ({ objId, ...body }: IDispatchMove & { objId: string }) =>
      api.moveDispatch(objId, body),
    onSuccess: ({ dispatch, checkpoint }) => {
      queryClient.setQueryData<IDispatch[]>(dispatchKeys.list(), (current) =>
        current?.map((entry) =>
          entry.objId === dispatch.objId ? dispatch : entry,
        ),
      );
      queryClient.setQueryData<ICheckpointLog[]>(
        checkpointKeys.list(dispatch.objId),
        (current) => [checkpoint, ...(current ?? [])],
      );
      if (dispatch.status === "cancelled") setDispatchId(undefined);
    },
    onError: () =>
      queryClient.invalidateQueries({ queryKey: dispatchKeys.list() }),
  });
  const onMove = useCallback(
    (dispatch: IDispatch, change: Omit<IDispatchMove, "versionNo">) =>
      move({ objId: dispatch.objId, versionNo: dispatch.versionNo, ...change }),
    [move],
  );

  const { mutateAsync: onReportException, isPending: isReporting } =
    useMutation({
      mutationFn: api.createException,
      onSuccess: ({ exception }) =>
        queryClient.setQueryData<IException[]>(
          exceptionKeys.list(),
          (current) => current && [exception, ...current],
        ),
    });

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
      onMove,
      isMoving,
      onReportException,
      isReporting,
      rules: rulesQuery.data ?? NO_RULES,
    }),
    [
      rulesQuery.data,
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
      onMove,
      isMoving,
      onReportException,
      isReporting,
    ],
  );
}

export type DispatchDetailData = ReturnType<typeof useDispatchDetail>;
