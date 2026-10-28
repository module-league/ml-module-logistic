declare global {
  /** overdue isn't stored: a sent invoice past its due date. */
  type IInvoiceStatus = "draft" | "sent" | "overdue" | "paid" | "void";

  /** One quoted or invoiced charge, with how it was worked out. Matches BillingLineResponse. */
  type IBillingLine = {
    /** Unique within a quote: the charge key, plus the exception id for a suggested line. */
    key: string;
    /** freight or a charge type's key. */
    chargeKey: string;
    description: string;
    /** e.g. "98 kg × RM 6.80 (min RM 150.00)". */
    basis: string;
    qty: number;
    unitPrice: number;
    amount: number;
    /** In percent. */
    taxRate: number;
    /** Freight: always on the invoice. */
    required: boolean;
    sourceExceptionId?: string;
    sourceExceptionNo?: string;
  };

  type IBillingRateCard = {
    name: string;
    mode: string;
    fromZone: string;
    toZone: string;
    ratePerKg: number;
    minCharge: number;
    fuelPct: number;
    currency: string;
    validFrom?: string;
    validTo?: string;
  };

  /** A ready shipment priced from the rate card. Matches BillingQuoteResponse; times are UTC. */
  type IBillingQuote = {
    shipmentId: string;
    dispatchId?: string;
    deliveredAt?: string;
    mode?: string;
    incoterm?: string;
    weight?: number;
    fromZone?: string;
    toZone?: string;
    /** The shipment's Bill To party; what decides who's billed. */
    billToId?: string;
    suggestedPayer?: "consignee" | "shipper";
    /** e.g. "Consignee · FCA, buyer pays main carriage". */
    payerHint?: string;
    rateCard?: IBillingRateCard;
    lines: IBillingLine[];
    /** For the lines picked by default. */
    subtotal: number;
    taxAmount: number;
    total: number;
    /** What keeps it from being priced; empty when it can be invoiced. */
    problems: string[];
  };

  /** Delivered and not invoiced, but held back. */
  type IBillingWaiting = {
    shipmentId: string;
    deliveredAt?: string;
    reasons: string[];
  };

  /** Matches InvoiceResponse; lines and party are copied when it's created. */
  type IInvoice = {
    objId: string;
    /** INV-000001, never reused. */
    invoiceNo: string;
    shipmentId: string;
    dispatchId?: string;
    partyId: string;
    partyName: string;
    partyAddress?: string;
    partyEmail?: string;
    partyTaxId?: string;
    partyRegistrationNo?: string;
    creditTermsDays: number;
    status: IInvoiceStatus;
    /** yyyy-MM-dd, set when sent. */
    issueDate?: string;
    dueDate?: string;
    currency: string;
    subtotal: number;
    taxAmount: number;
    total: number;
    createdAt: string;
    sentAt?: string;
    paidAt?: string;
    voidedAt?: string;
    voidReason?: string;
    eInvoiceRef?: string;
    /** What freight was priced from. */
    pricing: {
      rateCard?: IBillingRateCard;
      weight?: number;
      fromZone?: string;
      toZone?: string;
      mode?: string;
      incoterm?: string;
      deliveredAt?: string;
    };
    lines: IBillingLine[];
    versionNo: number;
  };

  type IBillingTotals = {
    readyAmount: number;
    readyCount: number;
    draftAmount: number;
    draftCount: number;
    overdueAmount: number;
    overdueCount: number;
    paidThisMonthAmount: number;
    paidThisMonthCount: number;
  };

  /** Everything the Billing page shows. Matches BillingOverviewResponse. */
  type IBillingOverview = {
    ready: IBillingQuote[];
    waiting: IBillingWaiting[];
    /** Newest first, void ones included. */
    invoices: IInvoice[];
    parties: { id: string; name: string }[];
    totals: IBillingTotals;
    /** e.g. RM. */
    currencySymbol: string;
    taxPercent: number;
  };

  /** Invoices a ready shipment: freight always, plus the picked lines; partyId left out bills the shipment's Bill To. */
  type IInvoiceCreate = {
    shipmentId: string;
    partyId?: string;
    lineKeys: string[];
  };

  /** Which fields billing reads; weight and mode come from the exception rules, the Incoterm from documents. versionNo 0 until first saved. */
  type IBillingSettings = {
    billToFieldId?: string;
    zoneFieldId?: string;
    partyNameFieldId?: string;
    partyAddressFieldId?: string;
    partyEmailFieldId?: string;
    partyTaxIdFieldId?: string;
    partyRegistrationFieldId?: string;
    partyCreditTermsFieldId?: string;
    chargeableWeightFieldId?: string;
    modeFieldId?: string;
    incotermFieldId?: string;
    partySidebarId: string;
    versionNo: number;
  };

  type IBillingSettingsInput = Omit<
    IBillingSettings,
    | "chargeableWeightFieldId"
    | "modeFieldId"
    | "incotermFieldId"
    | "partySidebarId"
  >;

  /** The rate cards, charge types and tax from the API's workflow config ("Billing" in appsettings). */
  type IBillingRates = {
    rateCards: IBillingRateCard[];
    chargeTypes: {
      key: string;
      title: string;
      basis: "flat" | "per_kg" | "percent_of_freight" | "per_hour";
      basisText?: string;
      defaultAmount: number;
      taxable: boolean;
      automatic: boolean;
      fromRule?: string;
      fromReasons: string[];
    }[];
    taxPercent: number;
    freightTaxable: boolean;
    currencySymbol: string;
    defaultCreditTermsDays: number;
    payerByIncoterm: Record<string, string>;
  };
}
