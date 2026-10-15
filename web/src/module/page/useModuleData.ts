import { useCallback, useMemo, useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toFieldCreate, toFieldUpdate } from "@/services/fields/field.api";
import { fieldKeys, putInLists } from "@/services/fields/field.utils";
import { recordKeys } from "@/services/records/record.api";
import { formKeys } from "@/services/forms/form.api";
import { memberKeys } from "@/services/user/user.api";
import { useWorkspaceContext } from "@/module/workspace/workspace.context";
import {
  isLinkingField,
  type LookupSource,
  type RecordLookups,
} from "@/lib/lookupHelper";
import type { ModuleData, ModuleDataApi } from "./modulePage.types";

const NO_FIELDS: ISidebarField[] = [];
const NO_RECORDS: ISidebarRecord[] = [];
const NO_MEMBERS: IUserInfo[] = [];
const NO_FORMS: ISidebarForm[] = [];

function dataOf<T>(results: UseQueryResult<T>[]) {
  return results.map((result) => result.data);
}

/** Runs the page's API for one sidebar and returns it as ModuleData. Pass a module-level api object so it stays the same between renders. */
export function useModuleData(
  sidebarId: string | undefined,
  api: ModuleDataApi,
): ModuleData {
  const id = sidebarId ?? "";
  const queryClient = useQueryClient();

  const fieldsQuery = useQuery({
    queryKey: fieldKeys.list(id),
    queryFn: () => api.getFields(id),
    enabled: !!sidebarId,
  });
  const recordsQuery = useQuery({
    queryKey: recordKeys.list(id),
    queryFn: () => api.getRecords(id),
    enabled: !!sidebarId,
  });

  const membersQuery = useQuery({
    queryKey: memberKeys.all,
    queryFn: () => api.getMembers(),
  });

  // Every page's fields, shared with that page's own query: they list the sidebars a link field can link to
  const { items: pages } = useWorkspaceContext();
  const pageFields = useQueries({
    queries: pages.map((page) => ({
      queryKey: fieldKeys.list(page.sidebarId),
      queryFn: () => api.getFields(page.sidebarId),
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

  // Records of the sidebars this sidebar's link and lookup fields point at, shared with those pages' own queries
  const lookupSidebarIds = useMemo(
    () => [
      ...new Set(
        (fieldsQuery.data ?? NO_FIELDS)
          .filter(isLinkingField)
          .map((field) => field?.lookupSettings?.categoryId)
          .filter((categoryId): categoryId is string => !!categoryId),
      ),
    ],
    [fieldsQuery.data],
  );
  const lookupRecords = useQueries({
    queries: lookupSidebarIds.map((lookupId) => ({
      queryKey: recordKeys.list(lookupId),
      queryFn: () => api.getRecords(lookupId),
    })),
    combine: dataOf<ISidebarRecord[]>,
  });
  const lookups = useMemo<RecordLookups>(
    () =>
      Object.fromEntries(
        lookupSidebarIds.flatMap((lookupId, index) => {
          const records = lookupRecords[index];
          const fields = fieldsBySidebar.get(lookupId);
          return records && fields ? [[lookupId, { fields, records }]] : [];
        }),
      ),
    [lookupSidebarIds, lookupRecords, fieldsBySidebar],
  );

  const [openedRecordId, setOpenedRecordId] = useState<string>();
  const recordQuery = useQuery({
    queryKey: recordKeys.detail(id, openedRecordId ?? ""),
    queryFn: () => api.getRecord(id, openedRecordId ?? ""),
    enabled: !!sidebarId && !!openedRecordId,
    placeholderData: () =>
      queryClient
        .getQueryData<ISidebarRecord[]>(recordKeys.list(id))
        ?.find((record) => record?.objId === openedRecordId),
  });
  const openedRecord = recordQuery.data;

  const { mutateAsync: onAddRecord } = useMutation({
    mutationFn: (values: ISidebarRecordValues) => api.createRecord(id, values),
    onSuccess: (created) =>
      queryClient.setQueryData<ISidebarRecord[]>(
        recordKeys.list(id),
        (current) => [created, ...(current ?? [])],
      ),
  });
  const { mutateAsync: updateRecord } = useMutation({
    mutationFn: ({
      objId,
      body,
    }: {
      objId: string;
      body: ISidebarRecordUpdate;
    }) => api.updateRecord(id, objId, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(recordKeys.detail(id, updated.objId), updated);
      queryClient.setQueryData<ISidebarRecord[]>(
        recordKeys.list(id),
        (current) =>
          current?.map((record) =>
            record?.objId === updated.objId ? updated : record,
          ),
      );
    },
  });
  const onUpdateRecord = useCallback(
    (values: ISidebarRecordValues) => {
      if (!openedRecord) return Promise.reject(new Error("No record is open."));
      const latest =
        queryClient.getQueryData<ISidebarRecord>(
          recordKeys.detail(id, openedRecord.objId),
        ) ?? openedRecord;
      return updateRecord({
        objId: latest.objId,
        body: { values, versionNo: latest.versionNo },
      });
    },
    [id, openedRecord, queryClient, updateRecord],
  );
  const onCloseRecord = useCallback(() => setOpenedRecordId(undefined), []);

  const { mutateAsync: onDeleteRecords } = useMutation({
    mutationFn: (ids: string[]) => api.deleteRecords(id, ids),
    onSuccess: (_, ids) => {
      const deleted = new Set(ids);
      queryClient.setQueryData<ISidebarRecord[]>(
        recordKeys.list(id),
        (current) => current?.filter((record) => !deleted.has(record?.objId)),
      );
      ids.forEach((objId) =>
        queryClient.removeQueries({ queryKey: recordKeys.detail(id, objId) }),
      );
      setOpenedRecordId((current) =>
        current && deleted.has(current) ? undefined : current,
      );
      // Records that linked to them were changed too, in this sidebar or another
      queryClient.invalidateQueries({ queryKey: recordKeys.all });
    },
  });

  const { mutateAsync: onAddField } = useMutation({
    mutationFn: (field: IField) => api.createField(id, toFieldCreate(field)),
    onSuccess: (created) =>
      putInLists(queryClient, id, (fields) => [...fields, created]),
  });

  const { mutateAsync: updateField } = useMutation({
    mutationFn: ({
      objId,
      body,
    }: {
      objId: string;
      body: ISidebarFieldUpdate;
    }) => api.updateField(objId, body),
    onSuccess: (updated) => {
      putInLists(queryClient, id, (fields) =>
        fields.map((field) =>
          field?.objId === updated.objId ? updated : field,
        ),
      );
      // Turning off several links trims the saved records, so they are fetched again
      if (updated?.type === "link_table") {
        queryClient.invalidateQueries({ queryKey: recordKeys.list(id) });
      }
    },
  });
  const onUpdateField = useCallback(
    (objId: string, edited: IField) => {
      const saved = queryClient
        .getQueryData<ISidebarField[]>(fieldKeys.list(id))
        ?.find((field) => field?.objId === objId);
      if (!saved) return Promise.reject(new Error("Field not found."));
      return updateField({ objId, body: toFieldUpdate(saved, edited) });
    },
    [id, queryClient, updateField],
  );
  const { mutateAsync: onDeleteField } = useMutation({
    mutationFn: (objId: string) => api.deleteField(objId),
    onSuccess: (_, objId) =>
      putInLists(queryClient, id, (fields) =>
        fields.filter((field) => field?.objId !== objId),
      ),
  });

  const uploadAttachment = api.uploadAttachment;
  const onUploadAttachment = useCallback(
    (file: File) => uploadAttachment(id, file),
    [id, uploadAttachment],
  );

  const refetchFields = fieldsQuery.refetch;
  const refetchRecords = recordsQuery.refetch;
  const refetchRecord = recordQuery.refetch;
  const onRetryRecord = useCallback(() => {
    refetchRecord();
  }, [refetchRecord]);
  const onRefreshFields = useCallback(() => {
    refetchFields();
  }, [refetchFields]);
  const onRetryRecords = useCallback(() => {
    refetchRecords();
  }, [refetchRecords]);

  const fieldsState = useMemo(
    () => ({
      isLoading: fieldsQuery.isFetching,
      error: fieldsQuery.error,
      onRetry: onRefreshFields,
    }),
    [fieldsQuery.isFetching, fieldsQuery.error, onRefreshFields],
  );
  const recordsState = useMemo(
    () => ({
      isLoading: recordsQuery.isLoading || fieldsQuery.isLoading,
      error: recordsQuery.error ?? fieldsQuery.error,
      onRetry: fieldsQuery.error ? onRefreshFields : onRetryRecords,
    }),
    [
      recordsQuery.isLoading,
      recordsQuery.error,
      fieldsQuery.isLoading,
      fieldsQuery.error,
      onRefreshFields,
      onRetryRecords,
    ],
  );

  const formsQuery = useQuery({
    queryKey: formKeys.list(id),
    queryFn: () => api.getForms(id),
    enabled: !!sidebarId,
  });
  const setForms = useCallback(
    (update: (forms: ISidebarForm[]) => ISidebarForm[]) =>
      queryClient.setQueryData<ISidebarForm[]>(formKeys.list(id), (current) =>
        update(current ?? NO_FORMS),
      ),
    [queryClient, id],
  );
  // A new default clears the old one on the server, so the cached list does the same
  const putForm = useCallback(
    (saved: ISidebarForm) =>
      setForms((forms) => {
        const next = forms.some((form) => form?.objId === saved.objId)
          ? forms.map((form) => (form?.objId === saved.objId ? saved : form))
          : [...forms, saved];
        return saved.isDefault
          ? next.map((form) =>
              form?.objId === saved.objId
                ? form
                : { ...form, isDefault: false },
            )
          : next;
      }),
    [setForms],
  );
  const { mutateAsync: onAddForm } = useMutation({
    mutationFn: (form: ISidebarFormInput) => api.createForm(id, form),
    onSuccess: putForm,
  });
  const { mutateAsync: updateForm } = useMutation({
    mutationFn: ({ objId, form }: { objId: string; form: ISidebarFormInput }) =>
      api.updateForm(objId, form),
    onSuccess: putForm,
  });
  const onUpdateForm = useCallback(
    (objId: string, form: ISidebarFormInput) => {
      const latest = queryClient
        .getQueryData<ISidebarForm[]>(formKeys.list(id))
        ?.find((saved) => saved?.objId === objId);
      return updateForm({
        objId,
        form: { ...form, versionNo: latest?.versionNo },
      });
    },
    [id, queryClient, updateForm],
  );
  const { mutateAsync: onDeleteForm } = useMutation({
    mutationFn: (objId: string) => api.deleteForm(objId),
    onSuccess: (_, objId) =>
      setForms((forms) => forms.filter((form) => form?.objId !== objId)),
  });
  const { mutateAsync: onReorderForms } = useMutation({
    mutationFn: (formIds: string[]) => api.reorderForms(id, formIds),
    onMutate: (formIds) =>
      setForms((forms) =>
        formIds.flatMap((formId) =>
          forms.filter((form) => form?.objId === formId),
        ),
      ),
    onSuccess: (forms) => queryClient.setQueryData(formKeys.list(id), forms),
    onError: () =>
      queryClient.invalidateQueries({ queryKey: formKeys.list(id) }),
  });
  const refetchForms = formsQuery.refetch;
  const onRetryForms = useCallback(() => {
    refetchForms();
  }, [refetchForms]);
  const formsState = useMemo(
    () => ({
      isLoading: formsQuery.isLoading,
      error: formsQuery.error,
      onRetry: onRetryForms,
    }),
    [formsQuery.isLoading, formsQuery.error, onRetryForms],
  );

  const openedRecordState = useMemo(
    () => ({
      isLoading: recordQuery.isLoading,
      error: recordQuery.error,
      onRetry: onRetryRecord,
    }),
    [recordQuery.isLoading, recordQuery.error, onRetryRecord],
  );

  return useMemo(
    () => ({
      fields: fieldsQuery.data ?? NO_FIELDS,
      fieldsState,
      records: recordsQuery.data ?? NO_RECORDS,
      recordsState,
      members: membersQuery.data ?? NO_MEMBERS,
      onRefreshFields,
      onAddRecord,
      openedRecordId,
      openedRecord,
      openedRecordState,
      onOpenRecord: setOpenedRecordId,
      onCloseRecord,
      onUpdateRecord,
      onDeleteRecords,
      onAddField,
      onUpdateField,
      onDeleteField,
      onUploadAttachment,
      lookupSources,
      lookups,
      forms: formsQuery.data ?? NO_FORMS,
      formsState,
      onAddForm,
      onUpdateForm,
      onDeleteForm,
      onReorderForms,
    }),
    [
      formsQuery.data,
      formsState,
      onAddForm,
      onUpdateForm,
      onDeleteForm,
      onReorderForms,
      lookupSources,
      lookups,
      openedRecordId,
      openedRecord,
      openedRecordState,
      onCloseRecord,
      onUpdateRecord,
      onDeleteRecords,
      fieldsQuery.data,
      fieldsState,
      recordsQuery.data,
      recordsState,
      membersQuery.data,
      onRefreshFields,
      onAddRecord,
      onAddField,
      onUpdateField,
      onDeleteField,
      onUploadAttachment,
    ],
  );
}
