import { useEffect, useState } from "react";
import { Circle, CircleCheck, Play, RotateCcw } from "lucide-react";
import { Button, cn } from "@moduleleague/ui";
import { Spinner } from "@/components/ui/spinner";
import { AgentOutputView } from "./AgentOutputView";
import type { AgentScenario } from "./agents.types";

/** How long each step "works" in the demo, so the run can be followed. */
const STEP_MS = 900;

type RunState =
  | { status: "idle" }
  | { status: "running"; step: number }
  | { status: "done" }
  | { status: "decided"; approved: boolean };

interface AgentRunDemoProps {
  scenario: AgentScenario;
}

/** Plays an agent's dummy run step by step, then shows its result and asks a person to decide. Nothing is saved. */
export function AgentRunDemo({ scenario }: AgentRunDemoProps) {
  const [run, setRun] = useState<RunState>({ status: "idle" });
  const { steps } = scenario;
  const isFinished = run.status === "done" || run.status === "decided";

  useEffect(() => {
    if (run.status !== "running") return;
    const timer = setTimeout(() => {
      setRun(
        run.step + 1 < steps.length
          ? { status: "running", step: run.step + 1 }
          : { status: "done" },
      );
    }, STEP_MS);
    return () => clearTimeout(timer);
  }, [run, steps.length]);

  const stepState = (index: number) => {
    if (isFinished) return "done";
    if (run.status !== "running" || index > run.step) return "pending";
    return index === run.step ? "working" : "done";
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border p-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h3 className="text-sm font-semibold">Demo run</h3>
          <p className="text-xs text-muted-foreground">
            Triggered by: {scenario.trigger}
          </p>
        </div>
        <Button
          size="sm"
          variant={run.status === "idle" ? "default" : "outline"}
          startIcon={
            run.status === "idle" ? <Play size={14} /> : <RotateCcw size={14} />
          }
          disabled={run.status === "running"}
          onClick={() => setRun({ status: "running", step: 0 })}
        >
          {run.status === "idle" ? "Run demo" : "Run again"}
        </Button>
      </header>

      <ol className="flex flex-col gap-2">
        {steps.map((step, index) => {
          const state = stepState(index);
          return (
            <li key={step.title} className="flex gap-2.5">
              <span aria-hidden className="mt-0.5 shrink-0">
                {state === "done" && (
                  <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                )}
                {state === "working" && <Spinner className="size-4" />}
                {state === "pending" && (
                  <Circle className="size-4 text-muted-foreground/40" />
                )}
              </span>
              <div
                className={cn(
                  "flex min-w-0 flex-col gap-0.5",
                  state === "pending" && "text-muted-foreground",
                )}
              >
                <span className="text-sm font-medium">
                  {step.title}{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-normal">
                    {step.tool}
                  </code>
                </span>
                {state === "done" && (
                  <span className="text-xs text-muted-foreground">
                    {step.result}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {isFinished && (
        <div className="flex flex-col gap-3 border-t pt-3">
          <AgentOutputView output={scenario.output} />
          {run.status === "decided" ? (
            <p className="text-sm text-muted-foreground">
              {run.approved
                ? `Approved: “${scenario.approveLabel}” would run now and be logged on the timeline.`
                : `Rejected: “${scenario.rejectLabel}” is logged on the timeline; nothing changes.`}{" "}
              This is a prototype, so nothing was saved.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => setRun({ status: "decided", approved: true })}
              >
                {scenario.approveLabel}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRun({ status: "decided", approved: false })}
              >
                {scenario.rejectLabel}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
