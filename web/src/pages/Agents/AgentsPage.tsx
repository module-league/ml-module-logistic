import { useState } from "react";
import { cn } from "@moduleleague/ui";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import { CHIP_CLASS } from "../Exception/ExceptionList";
import { AgentCanvas } from "./AgentCanvas";
import { AgentDetail } from "./AgentDetail";
import { AGENT_LOOP, AGENTS } from "./agents.data";
import type { AgentId } from "./agents.types";

/** The module's AI agents: what each does, where it runs in the app, and an example run of each with dummy data. */
export function AgentsPage() {
  const [selectedId, setSelectedId] = useState<AgentId>("document_review");
  const selected = AGENTS.find((agent) => agent.id === selectedId) ?? AGENTS[0];
  const liveCount = AGENTS.filter((agent) => !!agent.live).length;
  const isAllLive = liveCount === AGENTS.length;

  return (
    <div className="flex flex-col gap-4 px-4 pt-1 pb-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold">AI agents</h1>
          <p className="text-sm text-muted-foreground">
            {liveCount} of {AGENTS.length} agents are live. Each starts from a
            button on the page it helps with, and nothing is saved until a
            person approves it.
          </p>
        </div>
        <span
          className={cn(
            CHIP_CLASS,
            "py-0.5",
            isAllLive ? TONE_CLASS.green : TONE_CLASS.amber,
          )}
        >
          {isAllLive
            ? "All live"
            : `${AGENTS.length - liveCount} still planned`}
        </span>
      </header>

      <section aria-labelledby="agent-loop">
        <h2
          id="agent-loop"
          className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
        >
          How every agent works
        </h2>
        <ol className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {AGENT_LOOP.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col gap-0.5 rounded-lg border bg-background p-3"
            >
              <span className="text-xs font-semibold">
                {index + 1}. {step.title}
              </span>
              <span className="text-xs text-muted-foreground">{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      {selected && (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
          <AgentCanvas
            agents={AGENTS}
            selectedId={selected.id}
            onSelect={setSelectedId}
          />
          <AgentDetail agent={selected} />
        </div>
      )}
    </div>
  );
}
