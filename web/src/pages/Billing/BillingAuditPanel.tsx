import { Link } from "react-router-dom";
import { Check, CircleAlert, Minus, Plus, Scale } from "lucide-react";
import { Button, cn } from "@moduleleague/ui";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import { CHIP_CLASS } from "../Exception/ExceptionList";
import { money } from "./billing.utils";

/** Colour only where it asks for something: green to go ahead, amber to go through the findings. */
const VERDICT_CLASS: Record<IBillingAuditVerdict, string> = {
  looks_right: TONE_CLASS.green,
  review: TONE_CLASS.amber,
};

const VERDICT_LABEL: Record<IBillingAuditVerdict, string> = {
  looks_right: "Charges look right",
  review: "Review before invoicing",
};

const KIND_LABEL: Record<IBillingAuditKind, string> = {
  add_charge: "Missing charge",
  weight: "Weight differs",
  remove_charge: "Doubtful charge",
  check: "Needs a look",
  ok: "Checked",
};

const KIND_ICON: Record<IBillingAuditKind, typeof Plus> = {
  add_charge: Plus,
  weight: Scale,
  remove_charge: Minus,
  check: CircleAlert,
  ok: Check,
};

const KIND_CLASS: Record<IBillingAuditKind, string> = {
  add_charge: "text-primary",
  weight: "text-amber-600 dark:text-amber-400",
  remove_charge: "text-amber-600 dark:text-amber-400",
  check: "text-amber-600 dark:text-amber-400",
  ok: "text-emerald-600 dark:text-emerald-400",
};

interface BillingAuditPanelProps {
  audit: IBillingAudit;
  symbol?: string;
  /** The keys of the findings' lines already added to the draft. */
  added: Set<string>;
  onAdd: (finding: IBillingAuditFinding) => void;
  /** Unticks the quoted line a remove_charge finding means. */
  onDrop: (lineKey: string) => void;
}

/** What the AI read on the POD and what it found against the draft; each finding that changes the invoice has its action. */
export function BillingAuditPanel({
  audit,
  symbol,
  added,
  onAdd,
  onDrop,
}: BillingAuditPanelProps) {
  const pod = [
    { label: "Delivered", value: audit.pod?.deliveredAt },
    { label: "Received by", value: audit.pod?.receivedBy },
    {
      label: "Signature",
      value:
        audit.pod?.signed === undefined
          ? "Couldn't tell"
          : audit.pod.signed
            ? "Found"
            : "Not found",
    },
    { label: "Weight on POD", value: audit.pod?.weight },
    { label: "Pieces", value: audit.pod?.pieces },
    { label: "Remarks", value: audit.pod?.remarks },
  ].filter((fact) => fact.value != null && fact.value !== "");

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div
        className={cn(
          "flex flex-col gap-0.5 rounded-md border px-3 py-2",
          VERDICT_CLASS[audit.verdict],
        )}
      >
        <span className="text-sm font-semibold">
          {VERDICT_LABEL[audit.verdict]}
        </span>
        <span className="text-sm">{audit.verdictText}</span>
      </div>

      <p className="text-sm">{audit.summary}</p>

      {pod.length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Read on the POD · {audit.fileName}
          </h4>
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
            {pod.map((fact) => (
              <div key={fact.label} className="flex gap-1">
                <dt className="text-muted-foreground">{fact.label}:</dt>
                <dd className="font-medium">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {audit.findings?.length > 0 && (
        <ul className="flex flex-col gap-2">
          {audit.findings.map((finding, index) => {
            const Icon = KIND_ICON[finding.kind];
            const lineKey = finding.line?.key ?? "";
            const isAdded = lineKey !== "" && added.has(lineKey);
            return (
              <li
                key={`${finding.kind}-${index}`}
                className="flex flex-wrap items-start justify-between gap-2 rounded-md border bg-background px-3 py-2"
              >
                <div className="flex min-w-0 flex-1 gap-2">
                  <Icon
                    size={16}
                    className={cn("mt-0.5 shrink-0", KIND_CLASS[finding.kind])}
                  />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {finding.title}
                      <span
                        className={cn(
                          CHIP_CLASS,
                          "ml-2 border-border bg-muted font-normal text-muted-foreground",
                        )}
                      >
                        {KIND_LABEL[finding.kind]}
                      </span>
                    </span>
                    {finding.detail !== "" && (
                      <span className="text-sm text-muted-foreground">
                        {finding.detail}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      From {finding.source}
                      {finding.line &&
                        ` · ${money(finding.line.amount, symbol)}`}
                    </span>
                  </div>
                </div>
                {finding.kind === "add_charge" && finding.line && (
                  <Button
                    size="xs"
                    variant={isAdded ? "outline" : "default"}
                    disabled={isAdded}
                    onClick={() => onAdd(finding)}
                  >
                    {isAdded ? "Added" : "Add to invoice"}
                  </Button>
                )}
                {finding.kind === "remove_charge" &&
                  finding.lineKey != null &&
                  finding.lineKey !== "" && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => onDrop(finding.lineKey ?? "")}
                    >
                      Leave it off
                    </Button>
                  )}
                {finding.kind === "weight" && (
                  <Button size="xs" variant="outline" asChild>
                    <Link to="/shipment">Open shipment</Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <span className="text-[11px] text-muted-foreground">
        A suggestion from {audit.usage?.model} · check before invoicing ·{" "}
        {(
          (audit.usage?.inputTokens ?? 0) + (audit.usage?.outputTokens ?? 0)
        ).toLocaleString()}{" "}
        tokens
      </span>
    </section>
  );
}
