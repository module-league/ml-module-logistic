import { cn } from "@moduleleague/ui";
import { CHIP_CLASS } from "../Exception/ExceptionList";
import { AgentRobot } from "./AgentRobot";
import { AUTONOMY, PHASES } from "./agents.data";
import type { AgentDefinition } from "./agents.types";
import {
  STATUS_CLASS,
  STATUS_LABEL,
  type RobotActivity,
} from "./agentCanvas.utils";

interface AgentStationProps {
  agent: AgentDefinition;
  activity: RobotActivity;
  isSelected: boolean;
  isDimmed: boolean;
  onSelect: () => void;
}

/** One agent on the canvas: its robot at work, what it's doing right now, and everything it's responsible for. */
export function AgentStation({
  agent,
  activity,
  isSelected,
  isDimmed,
  onSelect,
}: AgentStationProps) {
  const Icon = agent.icon;
  return (
    <article
      onClick={onSelect}
      className={cn(
        "flex h-full cursor-pointer flex-col gap-3 rounded-2xl border bg-background p-4 shadow-sm transition",
        isSelected
          ? "border-primary ring-4 ring-primary-20"
          : "hover:border-primary-40",
        isDimmed && "opacity-60",
      )}
    >
      <header className="flex items-center gap-3">
        <div className="relative size-16 shrink-0">
          <AgentRobot status={activity.status} className="size-16" />
          <span
            aria-hidden
            className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border bg-background text-primary shadow-sm"
          >
            <Icon className="size-3.5" />
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <button
            type="button"
            aria-pressed={isSelected}
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
            className="w-fit cursor-pointer truncate text-left text-sm font-semibold hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {agent.name}
          </button>
          <span className="flex flex-wrap gap-1">
            <span className={cn(CHIP_CLASS, STATUS_CLASS[activity.status])}>
              {STATUS_LABEL[activity.status]}
            </span>
            <span className={cn(CHIP_CLASS, "bg-muted")}>
              {PHASES[agent.phase].label}
            </span>
          </span>
        </div>
      </header>

      <SpeechBubble agent={agent} activity={activity} />

      <section className="flex flex-col gap-1.5">
        <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Responsible for
        </h3>
        <ol className="flex list-decimal flex-col gap-1 pl-4 text-xs">
          {agent.responsibilities.map((responsibility) => (
            <li key={responsibility}>{responsibility}</li>
          ))}
        </ol>
      </section>

      <p className="mt-auto border-t pt-2 text-[11px] text-muted-foreground">
        {AUTONOMY[agent.autonomy].label}
      </p>
    </article>
  );
}

function SpeechBubble({
  agent,
  activity,
}: {
  agent: AgentDefinition;
  activity: RobotActivity;
}) {
  const { steps } = agent.scenario;
  return (
    <div
      aria-live="polite"
      className="relative flex min-h-16 flex-col gap-1.5 rounded-xl border bg-muted/40 px-3 py-2 text-xs"
    >
      <span
        aria-hidden
        className="absolute -top-1.5 left-6 size-3 rotate-45 border-t border-l bg-background"
      />
      {activity.status === "working" && (
        <>
          <span className="font-medium">{activity.step.title}…</span>
          <code className="w-fit truncate rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">
            {activity.step.tool}
          </code>
          <span
            className="flex gap-1"
            aria-label={`Step ${activity.stepIndex + 1} of ${steps.length}`}
          >
            {steps.map((step, index) => (
              <span
                key={step.title}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  index <= activity.stepIndex ? "bg-primary" : "bg-primary-20",
                )}
              />
            ))}
          </span>
        </>
      )}
      {activity.status === "waiting" && (
        <span>
          <span className="font-medium">Done. Waiting for you:</span>{" "}
          {agent.scenario.approveLabel}
        </span>
      )}
      {activity.status === "watching" && (
        <span>
          <span className="font-medium">Watching for:</span> {agent.trigger}
        </span>
      )}
    </div>
  );
}
