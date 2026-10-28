import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DOCUMENT_REF_ID,
  documentKeys,
} from "@/services/documents/document.api";
import { recordKeys } from "@/services/records/record.api";
import { parseAttachments, toAttachmentValue } from "@/lib/attachmentHelper";
import {
  useDispatchRecords,
  type DispatchRecordsApi,
} from "../Dispatch/useDispatchRecords";
import { recordUpdate } from "../Exception/exception.utils";

export interface DocumentApi extends DispatchRecordsApi {
  getDocuments: () => Promise<IShipmentChecklist[]>;
  getDocumentRules: () => Promise<IDocumentRules>;
  getDocumentSettings: () => Promise<IDocumentSettings>;
  saveDocumentSettings: (
    body: IDocumentSettingsInput,
  ) => Promise<IDocumentSettings>;
  fileDocument: (body: IDocumentFile) => Promise<IShipmentChecklist>;
  generateDocument: (body: {
    shipmentId: string;
    docType: string;
  }) => Promise<IShipmentChecklist>;
  verifyDocument: (
    objId: string,
    body: { versionNo: number; expiresAt?: string },
  ) => Promise<IShipmentChecklist>;
  rejectDocument: (
    objId: string,
    body: { versionNo: number; reason: string },
  ) => Promise<IShipmentChecklist>;
  getDocumentActivity: (objId: string) => Promise<IDocumentActivity[]>;
  uploadAttachment: (refId: string, file: File) => Promise<IAttachment>;
  updateRecord: (
    sidebarId: string,
    objId: string,
    body: ISidebarRecordUpdate,
  ) => Promise<ISidebarRecord>;
}

const NO_CHECKLISTS: IShipmentChecklist[] = [];
const NO_ACTIVITY: IDocumentActivity[] = [];

/**
 * Runs the Documents page's API: every shipment's checklist (GET /documents), the rules and the fields they read, next to
 * the shipments they are about (see useDispatchRecords). Each change returns the shipment's checklist, which replaces it in
 * the cache; a failed change reloads the list in case it is stale. Files dropped for a shipment go into its attachment field
 * (PUT /records), where they wait to be classified.
 * Pass a module-level api object so it stays the same between renders.
 * @example
 * const data = useDocumentData(documentApi, searchParams.get("shipment") ?? undefined);
 * data.onVerify(document);
 */
export function useDocumentData(api: DocumentApi, initialShipmentId?: string) {
  const queryClient = useQueryClient();
  const records = useDispatchRecords(api);
  const documentsQuery = useQuery({
    queryKey: documentKeys.list(),
    queryFn: api.getDocuments,
  });
  const rulesQuery = useQuery({
    queryKey: documentKeys.rules(),
    queryFn: api.getDocumentRules,
  });
  const settingsQuery = useQuery({
    queryKey: documentKeys.settings(),
    queryFn: api.getDocumentSettings,
  });
  const [selectedId, setSelectedId] = useState(initialShipmentId);

  const putChecklist = useCallback(
    (checklist: IShipmentChecklist) =>
      queryClient.setQueryData<IShipmentChecklist[]>(
        documentKeys.list(),
        (current) =>
          current?.map((entry) =>
            entry.shipmentId === checklist.shipmentId ? checklist : entry,
          ),
      ),
    [queryClient],
  );
  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: documentKeys.all }),
    [queryClient],
  );
  const { mutateAsync: change, isPending: isChanging } = useMutation({
    mutationFn: (run: () => Promise<IShipmentChecklist>) => run(),
    onSuccess: (checklist) => {
      putChecklist(checklist);
      void queryClient.invalidateQueries({
        queryKey: [...documentKeys.all, "activity"],
      });
    },
    onError: reload,
  });

  const {
    fileDocument,
    generateDocument,
    verifyDocument,
    rejectDocument,
    uploadAttachment,
  } = api;
  const onFile = useCallback(
    (body: IDocumentFile) => change(() => fileDocument(body)),
    [change, fileDocument],
  );
  const onUpload = useCallback(
    (shipmentId: string, docType: string, file: File) =>
      change(async () => {
        const uploaded = await uploadAttachment(DOCUMENT_REF_ID, file);
        return fileDocument({ shipmentId, docType, attachmentId: uploaded.id });
      }),
    [change, uploadAttachment, fileDocument],
  );
  const onGenerate = useCallback(
    (shipmentId: string, docType: string) =>
      change(() => generateDocument({ shipmentId, docType })),
    [change, generateDocument],
  );
  const onVerify = useCallback(
    (document: IShipmentDocument, expiresAt?: Date) =>
      change(() =>
        verifyDocument(document.objId ?? "", {
          versionNo: document.versionNo,
          expiresAt: expiresAt?.toISOString(),
        }),
      ),
    [change, verifyDocument],
  );
  const onReject = useCallback(
    (document: IShipmentDocument, reason: string) =>
      change(() =>
        rejectDocument(document.objId ?? "", {
          versionNo: document.versionNo,
          reason,
        }),
      ),
    [change, rejectDocument],
  );

  const settings = settingsQuery.data;
  const shipmentSidebarId = records.sources?.shipmentSidebarId ?? "";
  const { mutateAsync: drop, isPending: isDropping } = useMutation({
    mutationFn: async ({
      shipmentId,
      files,
    }: {
      shipmentId: string;
      files: File[];
    }) => {
      const fieldId = settings?.attachmentFieldId ?? "";
      const uploaded = await Promise.all(
        files.map((file) => uploadAttachment(shipmentSidebarId, file)),
      );
      const record = records.lookups[shipmentSidebarId]?.records.find(
        (entry) => entry.objId === shipmentId,
      );
      const current = parseAttachments(record?.values[fieldId]);
      const body = recordUpdate(
        records.lookups,
        shipmentSidebarId,
        shipmentId,
        fieldId,
        toAttachmentValue([...current, ...uploaded]),
      );
      if (!body) throw new Error("The shipment isn't loaded; reload the page.");
      return api.updateRecord(shipmentSidebarId, shipmentId, body);
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData<ISidebarRecord[]>(
        recordKeys.list(updated.sidebarId),
        (current) =>
          current?.map((entry) =>
            entry.objId === updated.objId ? updated : entry,
          ),
      );
      await reload();
    },
  });
  const onDrop = useCallback(
    (shipmentId: string, files: File[]) => drop({ shipmentId, files }),
    [drop],
  );

  const { mutateAsync: onSaveSettings } = useMutation({
    mutationFn: api.saveDocumentSettings,
    onSuccess: async (saved) => {
      queryClient.setQueryData(documentKeys.settings(), saved);
      await reload();
    },
  });

  const recordsRetry = records.onRetry;
  const refetchDocuments = documentsQuery.refetch;
  const refetchRules = rulesQuery.refetch;
  const refetchSettings = settingsQuery.refetch;
  const onRetry = useCallback(() => {
    recordsRetry();
    void refetchDocuments();
    void refetchRules();
    void refetchSettings();
  }, [recordsRetry, refetchDocuments, refetchRules, refetchSettings]);

  return useMemo(
    () => ({
      ...records,
      checklists: documentsQuery.data ?? NO_CHECKLISTS,
      rules: rulesQuery.data,
      documentSettings: settings,
      isLoading:
        records.isLoading ||
        documentsQuery.isLoading ||
        rulesQuery.isLoading ||
        settingsQuery.isLoading,
      error:
        records.error ??
        documentsQuery.error ??
        rulesQuery.error ??
        settingsQuery.error,
      onRetry,
      selectedId,
      onSelect: setSelectedId,
      onFile,
      onUpload,
      onGenerate,
      onVerify,
      onReject,
      onDrop,
      onSaveSettings,
      isSaving: isChanging || isDropping,
    }),
    [
      records,
      documentsQuery.data,
      documentsQuery.isLoading,
      documentsQuery.error,
      rulesQuery.data,
      rulesQuery.isLoading,
      rulesQuery.error,
      settings,
      settingsQuery.isLoading,
      settingsQuery.error,
      onRetry,
      selectedId,
      onFile,
      onUpload,
      onGenerate,
      onVerify,
      onReject,
      onDrop,
      onSaveSettings,
      isChanging,
      isDropping,
    ],
  );
}

export type DocumentData = ReturnType<typeof useDocumentData>;

/**
 * Loads a document's versions, verifies and rejects (GET /documents/{id}/activity) while its history is open.
 * @example
 * const history = useDocumentActivity(documentApi.getDocumentActivity, open ? document.objId : undefined);
 */
export function useDocumentActivity(
  getActivity: DocumentApi["getDocumentActivity"],
  documentId?: string,
) {
  const query = useQuery({
    queryKey: documentKeys.activity(documentId ?? ""),
    queryFn: () => getActivity(documentId ?? ""),
    enabled: documentId != null && documentId !== "",
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
