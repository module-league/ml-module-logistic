import type { ReactNode } from "react";
import { cn } from "@moduleleague/ui";
import { CHIP_CLASS } from "../Exception/ExceptionList";
import { AgentRunDemo } from "./AgentRunDemo";
import { AUTONOMY, PHASES } from "./agents.data";
import type { AgentDefinition } from "./agents.types";

interface AgentDetailProps {
  agent: AgentDefinition;
}

/** The inspector beside the canvas for the selected agent: its responsibilities, trigger, calls, limits and a demo run. */
export function AgentDetail({ agent }: AgentDetailProps) {
  const Icon = agent.icon;
  const autonomy = AUTONOMY[agent.autonomy];
  return (
    <article className="@container flex min-w-0 flex-col gap-4 rounded-xl border bg-background p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-10 text-primary"
          >
            <Icon className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="truncate text-lg font-semibold">{agent.name}</h2>
            <p className="text-sm text-muted-foreground">{agent.summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className={cn("bg-muted", CHIP_CLASS)}>
            {PHASES[agent.phase].label}
          </span>
          <span className={cn("bg-primary-10 text-primary", CHIP_CLASS)}>
            {autonomy.label}
          </span>
        </div>
      </header>

      <DetailSection title="Responsible for">
        <ol className="flex list-decimal flex-col gap-1 pl-4">
          {agent.responsibilities.map((responsibility) => (
            <li key={responsibility}>{responsibility}</li>
          ))}
        </ol>
      </DetailSection>

      <div className="grid gap-3 @lg:grid-cols-2">
        <DetailSection title="Takes over">{agent.replaces}</DetailSection>
        <DetailSection title="Runs when">{agent.trigger}</DetailSection>
        <DetailSection title="Calls">
          <ul className="flex flex-wrap gap-1.5">
            {agent.tools.map((tool) => (
              <li key={tool}>
                <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">
                  {tool}
                </code>
              </li>
            ))}
          </ul>
        </DetailSection>
        <DetailSection title={autonomy.label}>
          <p>{autonomy.description}</p>
          <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-muted-foreground">
            {agent.guardrails.map((guardrail) => (
              <li key={guardrail}>{guardrail}</li>
            ))}
          </ul>
        </DetailSection>
      </div>

      <AgentRunDemo key={agent.id} scenario={agent.scenario} />
    </article>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-3 text-sm">
      <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}
