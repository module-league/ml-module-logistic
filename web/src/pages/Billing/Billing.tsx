import { getFields } from "@/services/fields/field.api";
import { getRecords } from "@/services/records/record.api";
import { getMembers } from "@/services/user/user.api";
import {
  getDispatches,
  getDispatchSettings,
  getDispatchSources,
} from "@/services/dispatches/dispatch.api";
import {
  createInvoice,
  getBillingOverview,
  getBillingRates,
  getBillingSettings,
  payInvoice,
  previewInvoice,
  saveBillingSettings,
  sendInvoice,
  voidInvoice,
} from "@/services/billing/billing.api";
import { useBillingData, type BillingApi } from "./useBillingData";
import { BillingPage } from "./BillingPage";

const billingApi: BillingApi = {
  getFields,
  getRecords,
  getMembers,
  getDispatches,
  getDispatchSources,
  getDispatchSettings,
  getBillingOverview,
  getBillingRates,
  getBillingSettings,
  saveBillingSettings,
  previewInvoice,
  createInvoice,
  sendInvoice,
  payInvoice,
  voidInvoice,
};

export default function Billing() {
  const data = useBillingData(billingApi);
  return <BillingPage data={data} getFields={billingApi.getFields} />;
}
