import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingKeys } from "@/services/billing/billing.api";
import { checkpointKeys } from "@/services/checkpoints/checkpoint.api";
import { useCurrentUser } from "@/services/user/current.user";
import {
  useDispatchRecords,
  type DispatchRecordsApi,
} from "../Dispatch/useDispatchRecords";

export interface BillingApi extends DispatchRecordsApi {
  getBillingOverview: () => Promise<IBillingOverview>;
  getBillingRates: () => Promise<IBillingRates>;
  getBillingSettings: () => Promise<IBillingSettings>;
  saveBillingSettings: (
    body: IBillingSettingsInput,
  ) => Promise<IBillingSettings>;
  previewInvoice: (body: IInvoiceCreate) => Promise<Blob>;
  createInvoice: (body: IInvoiceCreate) => Promise<IInvoice>;
  sendInvoice: (
    objId: string,
    body: { versionNo: number },
  ) => Promise<IInvoice>;
  payInvoice: (
    objId: string,
    body: { versionNo: number; method: string; reference?: string },
  ) => Promise<IInvoice>;
  voidInvoice: (
    objId: string,
    body: { versionNo: number; reason: string },
  ) => Promise<IInvoice>;
}

/**
 * Runs the Billing page's API: what's ready to bill with its price, what's held back, every invoice and the totals
 * (GET /billing), the rate cards and the fields billing reads, next to the shipments they're about (see useDispatchRecords).
 * Every invoice change reloads the overview, since it moves shipments between ready and invoiced and changes the totals;
 * sending also reloads the dispatches' checkpoint logs, which gain the Billed entry.
 * Pass a module-level api object so it stays the same between renders.
 * @example
 * const data = useBillingData(billingApi);
 * const invoice = await data.onCreate({ shipmentId, lineKeys });
 */
export function useBillingData(api: BillingApi) {
  const queryClient = useQueryClient();
  const records = useDispatchRecords(api);
  // Only the signed-in user is known until the member list comes from Keycloak
  const me = useCurrentUser();
  const members = useMemo(() => [me], [me]);
  const overviewQuery = useQuery({
    queryKey: billingKeys.overview(),
    queryFn: api.getBillingOverview,
  });
  const ratesQuery = useQuery({
    queryKey: billingKeys.rates(),
    queryFn: api.getBillingRates,
  });
  const settingsQuery = useQuery({
    queryKey: billingKeys.settings(),
    queryFn: api.getBillingSettings,
  });

  const reload = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: billingKeys.overview() }),
        queryClient.invalidateQueries({ queryKey: checkpointKeys.all }),
      ]),
    [queryClient],
  );
  const { mutateAsync: change, isPending: isChanging } = useMutation({
    mutationFn: (run: () => Promise<IInvoice>) => run(),
    onSettled: reload,
  });

  const {
    createInvoice,
    sendInvoice,
    payInvoice,
    voidInvoice,
    previewInvoice,
  } = api;
  const onCreate = useCallback(
    (body: IInvoiceCreate) => change(() => createInvoice(body)),
    [change, createInvoice],
  );
  const onSend = useCallback(
    (invoice: IInvoice) =>
      change(() =>
        sendInvoice(invoice.objId, { versionNo: invoice.versionNo }),
      ),
    [change, sendInvoice],
  );
  const onPay = useCallback(
    (invoice: IInvoice, method: string, reference?: string) =>
      change(() =>
        payInvoice(invoice.objId, {
          versionNo: invoice.versionNo,
          method,
          reference,
        }),
      ),
    [change, payInvoice],
  );
  const onVoid = useCallback(
    (invoice: IInvoice, reason: string) =>
      change(() =>
        voidInvoice(invoice.objId, { versionNo: invoice.versionNo, reason }),
      ),
    [change, voidInvoice],
  );
  const { mutateAsync: onPreview, isPending: isPreviewing } = useMutation({
    mutationFn: async (body: IInvoiceCreate) => {
      const url = URL.createObjectURL(await previewInvoice(body));
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });

  const { mutateAsync: onSaveSettings } = useMutation({
    mutationFn: api.saveBillingSettings,
    onSuccess: async (saved) => {
      queryClient.setQueryData(billingKeys.settings(), saved);
      await reload();
    },
  });

  const recordsRetry = records.onRetry;
  const refetchOverview = overviewQuery.refetch;
  const refetchRates = ratesQuery.refetch;
  const refetchSettings = settingsQuery.refetch;
  const onRetry = useCallback(() => {
    recordsRetry();
    void refetchOverview();
    void refetchRates();
    void refetchSettings();
  }, [recordsRetry, refetchOverview, refetchRates, refetchSettings]);

  return useMemo(
    () => ({
      ...records,
      members,
      overview: overviewQuery.data,
      rates: ratesQuery.data,
      billingSettings: settingsQuery.data,
      isLoading:
        records.isLoading ||
        overviewQuery.isLoading ||
        ratesQuery.isLoading ||
        settingsQuery.isLoading,
      error:
        records.error ??
        overviewQuery.error ??
        ratesQuery.error ??
        settingsQuery.error,
      onRetry,
      onCreate,
      onSend,
      onPay,
      onVoid,
      onPreview,
      onSaveSettings,
      isSaving: isChanging,
      isPreviewing,
    }),
    [
      records,
      members,
      overviewQuery.data,
      overviewQuery.isLoading,
      overviewQuery.error,
      ratesQuery.data,
      ratesQuery.isLoading,
      ratesQuery.error,
      settingsQuery.data,
      settingsQuery.isLoading,
      settingsQuery.error,
      onRetry,
      onCreate,
      onSend,
      onPay,
      onVoid,
      onPreview,
      onSaveSettings,
      isChanging,
      isPreviewing,
    ],
  );
}

export type BillingData = ReturnType<typeof useBillingData>;
