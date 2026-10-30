import { Check, CircleAlert, Minus } from "lucide-react";
import { cn } from "@moduleleague/ui";
import { CHIP_CLASS } from "../Exception/ExceptionList";
import { DOCUMENT_TONE } from "./document.utils";

/** Colour only where it asks for something: green to go ahead, orange to act; "check" is a neutral note. */
const VERDICT_CLASS: Record<IDocumentReviewVerdict, string> = {
  looks_right: DOCUMENT_TONE.green.chip,
  check: "border-border bg-muted/50 text-foreground",
  needs_person: DOCUMENT_TONE.orange.chip,
};

const VERDICT_LABEL: Record<IDocumentReviewVerdict, string> = {
  looks_right: "Looks right",
  check: "Check before verifying",
  needs_person: "Needs a person",
};

/** What each outcome means for the person about to verify the paper. */
const VERDICT_MEANING: Record<IDocumentReviewVerdict, string> = {
  looks_right:
    "The details on the paper agree with the shipment record. You can verify it.",
  check:
    "Some details couldn't be confirmed. Compare them with the shipment before you verify.",
  needs_person:
    "Details conflict with the shipment record, or the paper is hard to read. Have someone review it before it's accepted.",
};

const CHECK_LABEL: Record<IDocumentReviewStatus, string> = {
  match: "Matches",
  mismatch: "Differs",
  not_on_record: "Not on record",
};

interface DocumentReviewResultProps {
  review: IDocumentReview;
}

/** What the AI read on a file and how each value compares with the shipment. */
export function DocumentReviewResult({ review }: DocumentReviewResultProps) {
  const facts = [
    { label: "Document type", value: review.docTypeTitle },
    { label: "AI confidence", value: `${review.confidence}%` },
    {
      label: "Signature or stamp",
      value:
        review.signed === undefined
          ? "Couldn't tell"
          : review.signed
            ? "Found"
            : "Not found",
    },
    {
      label: "Valid until",
      value:
        review.expiresOn != null && review.expiresOn !== ""
          ? review.expiresOn
          : "No expiry shown",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <ReviewSection title="Outcome">
        <div
          className={cn(
            "flex flex-col gap-1 rounded-lg border p-3",
            VERDICT_CLASS[review.verdict],
          )}
        >
          <span className="text-sm font-semibold">
            {VERDICT_LABEL[review.verdict]}
          </span>
          {review.verdictText !== "" && (
            <span className="text-sm">{review.verdictText}</span>
          )}
          {/* What to do next is what the person came for, so it stands out from the AI's own words */}
          <span className="text-xs font-medium text-primary">
            {VERDICT_MEANING[review.verdict]}
          </span>
        </div>
      </ReviewSection>

      <ReviewSection title="Document">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border p-3 text-sm sm:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="flex min-w-0 flex-col">
              <dt className="text-xs text-muted-foreground">{fact.label}</dt>
              <dd className="truncate font-medium">{fact.value}</dd>
            </div>
          ))}
        </dl>
        {review.summary !== "" && (
          <p className="text-sm text-muted-foreground">{review.summary}</p>
        )}
      </ReviewSection>

      <ReviewSection
        title="Cross-check with the shipment record"
        hint="Matches: same as the booking. Differs: correct the paper or the record before verifying. Not on record: the shipment has nothing to compare it with."
      >
        {review.checks.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Detail</th>
                  <th className="px-3 py-2 font-medium">On the document</th>
                  <th className="px-3 py-2 font-medium">
                    On the shipment record
                  </th>
                  <th className="px-3 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {review.checks.map((check) => (
                  <tr
                    key={`${check.status}-${check.field}`}
                    className="border-t align-top"
                  >
                    <td className="px-3 py-2 font-medium">{check.field}</td>
                    <td className="px-3 py-2">
                      {check.documentValue}
                      {check.source !== "" && (
                        <span className="block text-xs text-muted-foreground">
                          {check.source}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {check.recordValue ?? (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <CheckResult status={check.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            The AI found none of the shipment&apos;s details on this paper.
          </p>
        )}
      </ReviewSection>

      <p className="text-xs text-muted-foreground">
        A suggestion only: nothing is saved or verified until you do it.
      </p>
    </div>
  );
}

function ReviewSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint !== undefined && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/** Only a difference is coloured, since it's the one result someone has to act on. */
function CheckResult({ status }: { status: IDocumentReviewStatus }) {
  if (status === "mismatch")
    return (
      <span
        className={cn(
          CHIP_CLASS,
          "inline-flex items-center gap-1 py-0.5",
          DOCUMENT_TONE.orange.chip,
        )}
      >
        <CircleAlert className="size-3" />
        {CHECK_LABEL.mismatch}
      </span>
    );
  const Icon = status === "match" ? Check : Minus;
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Icon className="size-3" />
      {CHECK_LABEL[status]}
    </span>
  );
}
