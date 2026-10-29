import { cn } from "@moduleleague/ui";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import { CHIP_CLASS } from "../Exception/ExceptionList";
import type {
  AgentCheckStatus,
  AgentFieldCheck,
  AgentOutput,
} from "./agents.types";

const CHECK_LABEL: Record<AgentCheckStatus, string> = {
  match: "Matches",
  mismatch: "Differs",
  missing: "Not on record",
};

const CHECK_CLASS: Record<AgentCheckStatus, string> = {
  match: TONE_CLASS.green,
  mismatch: TONE_CLASS.red,
  missing: TONE_CLASS.amber,
};

const SECTION_TITLE_CLASS =
  "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

interface AgentOutputViewProps {
  output: AgentOutput;
}

/** What an agent hands a person at the end of its run: a document check, or findings with a draft. */
export function AgentOutputView({ output }: AgentOutputViewProps) {
  if (output.kind === "document_review") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          Looks like a{" "}
          <span className="font-semibold">{output.documentType}</span>{" "}
          <span className="text-muted-foreground">
            ({output.confidence}% sure)
          </span>
        </p>
        <FieldCheckTable checks={output.checks} />
        <p className="rounded-lg border bg-muted/40 p-3 text-sm">
          {output.verdict}
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
        {output.findings.map((finding) => (
          <li key={finding}>{finding}</li>
        ))}
      </ul>
      <section className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-3">
        <h4 className={SECTION_TITLE_CLASS}>{output.draftTitle}</h4>
        <p className="text-sm whitespace-pre-line">{output.draft}</p>
      </section>
    </div>
  );
}

function FieldCheckTable({ checks }: { checks: readonly AgentFieldCheck[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Field</th>
            <th className="px-3 py-2 font-medium">On the document</th>
            <th className="px-3 py-2 font-medium">On the record</th>
            <th className="px-3 py-2 font-medium">Check</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check) => (
            <tr key={check.field} className="border-t align-top">
              <td className="px-3 py-2 font-medium">{check.field}</td>
              <td className="px-3 py-2">
                {check.documentValue}
                <span className="block text-[11px] text-muted-foreground">
                  {check.source}
                </span>
              </td>
              <td className="px-3 py-2">{check.recordValue}</td>
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
  );
}
