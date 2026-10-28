import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "@moduleleague/ui";
import { errorParser } from "@/hooks/useErrorParser";
import { fieldKeys } from "@/services/fields/field.utils";
import { SettingsField } from "@/module/dashboard/settings/DashboardControls";
import { tableFields } from "@/module/dashboard/moduleDashboard.utils";
import { RoleSelect } from "../Exception/ExceptionRulesDialog";
import { money } from "./billing.utils";
import type { BillingApi, BillingData } from "./useBillingData";

type Role = keyof Omit<IBillingSettingsInput, "versionNo">;

const BASIS_LABEL: Record<
  IBillingRates["chargeTypes"][number]["basis"],
  string
> = {
  flat: "Flat",
  per_kg: "Per kg",
  percent_of_freight: "% of freight",
  per_hour: "Per hour",
};

/** The fields billing reads, and the rate cards, charge types and tax from the API's workflow config. */
export function BillingSettingsDialog({
  open,
  onOpenChange,
  data,
  getFields,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: BillingData;
  getFields: BillingApi["getFields"];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-10 pb-3">
          <DialogTitle>Rates & settings</DialogTitle>
          <DialogDescription>
            Rate cards, charges and tax live in the API&apos;s workflow config
            (Billing in appsettings); the fields billing reads are set here.
            Confirm the tax rate with an accountant before going live.
          </DialogDescription>
        </DialogHeader>
        <SettingsForm
          data={data}
          getFields={getFields}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function SettingsForm({
  data,
  getFields,
  onOpenChange,
}: {
  data: BillingData;
  getFields: BillingApi["getFields"];
  onOpenChange: (open: boolean) => void;
}) {
  const { lookups, sources, rates, billingSettings, onSaveSettings } = data;
  const partySidebarId = billingSettings?.partySidebarId ?? "";
  const partyQuery = useQuery({
    queryKey: fieldKeys.list(partySidebarId),
    queryFn: () => getFields(partySidebarId),
    enabled: partySidebarId !== "",
  });
  const [draft, setDraft] = useState<Partial<IBillingSettingsInput>>(() => ({
    billToFieldId: billingSettings?.billToFieldId,
    zoneFieldId: billingSettings?.zoneFieldId,
    partyNameFieldId: billingSettings?.partyNameFieldId,
    partyAddressFieldId: billingSettings?.partyAddressFieldId,
    partyEmailFieldId: billingSettings?.partyEmailFieldId,
    partyTaxIdFieldId: billingSettings?.partyTaxIdFieldId,
    partyRegistrationFieldId: billingSettings?.partyRegistrationFieldId,
    partyCreditTermsFieldId: billingSettings?.partyCreditTermsFieldId,
  }));
  const [saving, setSaving] = useState(false);
  const fields = useMemo(() => {
    const own = (sidebarId?: string) =>
      tableFields(lookups[sidebarId ?? ""]).filter(
        (field) => !field.isSystemField,
      );
    return {
      shipment: own(sources?.shipmentSidebarId),
      location: own(sources?.locationSidebarId),
      party: (partyQuery.data ?? []).filter((field) => !field.isSystemField),
    };
  }, [lookups, sources, partyQuery.data]);
  const nameOf = useCallback(
    (id?: string) => fields.shipment.find((field) => field.objId === id)?.name,
    [fields.shipment],
  );

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await onSaveSettings({
        ...draft,
        versionNo: billingSettings?.versionNo ?? 0,
      });
      toast.success("Billing fields saved");
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error("Couldn't save the billing fields", {
        description: errorParser(error)?.message,
      });
    } finally {
      setSaving(false);
    }
  }, [draft, billingSettings, onSaveSettings, onOpenChange]);

  const text = (field: ISidebarField) => field.type === "text";
  const roles: {
    role: Role;
    label: string;
    hint: string;
    fields: ISidebarField[];
    accepts: (field: ISidebarField) => boolean;
  }[] = [
    {
      role: "billToFieldId",
      label: "Bill To",
      hint: "Shipment link to a party; decides who's billed",
      fields: fields.shipment,
      accepts: (field) =>
        field.type === "link_table" &&
        field.lookupSettings?.categoryId === partySidebarId,
    },
    {
      role: "zoneFieldId",
      label: "Zone ID",
      hint: "Location, picks the rate card",
      fields: fields.location,
      accepts: text,
    },
    {
      role: "partyNameFieldId",
      label: "Party name",
      hint: "Its title when not set",
      fields: fields.party,
      accepts: text,
    },
    {
      role: "partyAddressFieldId",
      label: "Billing address",
      hint: "Party",
      fields: fields.party,
      accepts: text,
    },
    {
      role: "partyEmailFieldId",
      label: "Email",
      hint: "Party",
      fields: fields.party,
      accepts: text,
    },
    {
      role: "partyTaxIdFieldId",
      label: "Tax ID",
      hint: "Party",
      fields: fields.party,
      accepts: text,
    },
    {
      role: "partyRegistrationFieldId",
      label: "Registration no.",
      hint: "Party",
      fields: fields.party,
      accepts: text,
    },
    {
      role: "partyCreditTermsFieldId",
      label: "Credit terms (days)",
      hint: `Party; ${rates?.defaultCreditTermsDays ?? 30} days when empty`,
      fields: fields.party,
      accepts: (field) => field.type === "number",
    },
  ];
  const borrowed = [
    {
      label: "Chargeable weight",
      from: "Exceptions › Rules",
      id: billingSettings?.chargeableWeightFieldId,
    },
    {
      label: "Mode",
      from: "Exceptions › Rules",
      id: billingSettings?.modeFieldId,
    },
    {
      label: "Incoterm",
      from: "Documents › Rules",
      id: billingSettings?.incotermFieldId,
    },
  ];
  const symbol = rates?.currencySymbol;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Fields billing reads</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((entry) => (
              <RoleSelect
                key={entry.role}
                label={entry.label}
                hint={entry.hint}
                fields={entry.fields}
                accepts={entry.accepts}
                value={draft[entry.role]}
                onChange={(fieldId) =>
                  setDraft((current) => ({ ...current, [entry.role]: fieldId }))
                }
              />
            ))}
            {borrowed.map((entry) => (
              <SettingsField
                key={entry.label}
                label={entry.label}
                hint="Shipment"
              >
                <span className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                  {nameOf(entry.id) ?? `Pick it in ${entry.from}`}
                </span>
              </SettingsField>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Rate cards</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[44rem] text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {[
                    "Name",
                    "Mode",
                    "Zones",
                    "Rate per kg",
                    "Minimum",
                    "Fuel",
                    "Valid",
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-2 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rates?.rateCards.map((card) => (
                  <tr key={card.name} className="border-t">
                    <td className="px-3 py-2 font-medium">{card.name}</td>
                    <td className="px-3 py-2">{card.mode}</td>
                    <td className="px-3 py-2">
                      {card.fromZone === "*" ? "Any" : card.fromZone} →{" "}
                      {card.toZone === "*" ? "Any" : card.toZone}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {money(card.ratePerKg, symbol)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {money(card.minCharge, symbol)}
                    </td>
                    <td className="px-3 py-2">{card.fuelPct}%</td>
                    <td className="px-3 py-2">
                      {card.validFrom ?? "Always"} – {card.validTo ?? "open"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            An exact zone pair wins over &quot;Any&quot;. Freight is the
            chargeable weight × rate, never below the minimum.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Charges</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[44rem] text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {["Charge", "Basis", "Amount", "Taxable", "Added"].map(
                    (heading) => (
                      <th key={heading} className="px-3 py-2 font-medium">
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2 font-medium">Freight</td>
                  <td className="px-3 py-2">Per kg</td>
                  <td className="px-3 py-2">From the rate card</td>
                  <td className="px-3 py-2">
                    {rates?.freightTaxable === true ? "Yes" : "No"}
                  </td>
                  <td className="px-3 py-2">Always</td>
                </tr>
                {rates?.chargeTypes.map((charge) => (
                  <tr key={charge.key} className="border-t">
                    <td className="px-3 py-2 font-medium">{charge.title}</td>
                    <td className="px-3 py-2">{BASIS_LABEL[charge.basis]}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {charge.basis === "percent_of_freight"
                        ? "Rate card's fuel %"
                        : money(charge.defaultAmount, symbol)}
                    </td>
                    <td className="px-3 py-2">
                      {charge.taxable ? "Yes" : "No"}
                    </td>
                    <td className="px-3 py-2">
                      {charge.automatic
                        ? "Every invoice"
                        : charge.fromRule != null && charge.fromRule !== ""
                          ? `Suggested by a resolved ${charge.fromRule.replaceAll("_", " ")}${
                              charge.fromReasons.length > 0
                                ? ` (${charge.fromReasons.join(", ")})`
                                : ""
                            }`
                          : "By hand"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Tax: {rates?.taxPercent ?? 0}% on taxable lines. Invoices copy every
            rate and amount when they&apos;re created, so changing these never
            changes an old invoice.
          </p>
        </section>
      </div>
      <DialogFooter className="m-0 shrink-0 border-t p-4">
        <Button
          variant="outline"
          size="sm"
          disabled={saving}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button size="sm" isLoading={saving} onClick={() => void save()}>
          Save fields
        </Button>
      </DialogFooter>
    </>
  );
}
