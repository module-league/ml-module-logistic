import { cn } from "@moduleleague/ui";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import { CHIP_CLASS } from "../Exception/ExceptionList";

const VERDICT_CLASS: Record<IDocumentReviewVerdict, string> = {
  looks_right: TONE_CLASS.green,
  check: TONE_CLASS.amber,
  needs_person: TONE_CLASS.red,
};

const VERDICT_LABEL: Record<IDocumentReviewVerdict, string> = {
  looks_right: "Looks right",
  check: "Check before verifying",
  needs_person: "Needs a person",
};

const CHECK_CLASS: Record<IDocumentReviewStatus, string> = {
  match: TONE_CLASS.green,
  mismatch: TONE_CLASS.red,
  not_on_record: "bg-muted text-muted-foreground",
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
  return (
    <div className="flex flex-col gap-4">
      <section
        className={cn(
          "flex flex-col gap-1 rounded-lg border p-3",
          VERDICT_CLASS[review.verdict],
        )}
      >
        <span className="text-sm font-semibold">
          {VERDICT_LABEL[review.verdict]}
        </span>
        <span className="text-sm">{review.verdictText}</span>
      </section>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className={cn(CHIP_CLASS, "bg-muted py-0.5")}>
          {review.docTypeTitle} · {review.confidence}% sure
        </span>
        {review.signed !== undefined && (
          <span
            className={cn(
              CHIP_CLASS,
              "py-0.5",
              review.signed ? TONE_CLASS.green : TONE_CLASS.amber,
            )}
          >
            {review.signed ? "Signed or stamped" : "Not signed"}
          </span>
        )}
        {review.expiresOn != null && review.expiresOn !== "" && (
          <span className={cn(CHIP_CLASS, "bg-muted py-0.5")}>
            Expires {review.expiresOn}
          </span>
        )}
      </div>
      {review.summary !== "" && (
        <p className="text-sm text-muted-foreground">{review.summary}</p>
      )}

      {review.checks.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">On the file</th>
                <th className="px-3 py-2 font-medium">On the shipment</th>
                <th className="px-3 py-2 font-medium">Check</th>
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
                    <span className="block text-[11px] text-muted-foreground">
                      {check.source}
                    </span>
                  </td>
                  <td className="px-3 py-2">{check.recordValue ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={cn(CHIP_CLASS, CHECK_CLASS[check.status])}>
                      {CHECK_LABEL[check.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          The AI found none of the shipment&apos;s details on this file.
        </p>
      )}

      <p className="text-[11px] text-muted-foreground">
        {review.usage.model} · {review.usage.inputTokens.toLocaleString()}{" "}
        tokens in · {review.usage.outputTokens.toLocaleString()} out. A
        suggestion only: nothing is saved or verified.
      </p>
    </div>
  );
}
