import { useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button, cn } from "@moduleleague/ui";
import { Spinner } from "@/components/ui/spinner";
import { attempt } from "@/lib/toastHelper";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import { CHIP_CLASS } from "./ExceptionList";
import { ExceptionStep } from "./ExceptionStep";
import type { ExceptionData } from "./useExceptionData";

const CERTAINTY_CLASS: Record<IExceptionCopilot["certainty"], string> = {
  low: TONE_CLASS.amber,
  medium: "border-border bg-muted text-muted-foreground",
  high: TONE_CLASS.green,
};

interface ExceptionCopilotProps {
  exception: IException;
  onAsk: ExceptionData["onAskCopilot"];
  onLog: ExceptionData["onLog"];
}

/**
 * Has the AI sum up the exception from its timeline, shipment and dispatch, and suggest what to do next. Each ask is a paid
 * call, so the answer stays until "Ask again"; "Add to timeline" posts it as a note. Key it by the exception so a new one starts empty.
 */
export function ExceptionCopilot({
  exception,
  onAsk,
  onLog,
}: ExceptionCopilotProps) {
  const [isPosted, setIsPosted] = useState(false);
  const {
    mutateAsync,
    data: answer,
    isPending,
  } = useMutation({ mutationFn: () => onAsk(exception.objId) });
  const ask = () =>
    attempt("Couldn't ask the AI", async () => {
      await mutateAsync();
      setIsPosted(false);
    });
  const { mutateAsync: post, isPending: isPosting } = useMutation({
    mutationFn: (note: string) => onLog(exception, "note", note),
  });
  const addToTimeline = (note: string) =>
    attempt("Couldn't add it to the timeline", async () => {
      await post(note);
      setIsPosted(true);
    });
  const busyIcon = isPending ? (
    <Spinner className="size-3.5" />
  ) : (
    <Sparkles size={13} />
  );

  return (
    // Tinted so it reads as optional help under the two actions
    <ExceptionStep
      className="bg-muted/40"
      title="Not sure what to do?"
      hint={
        answer
          ? undefined
          : "The AI reads the timeline, shipment and dispatch, then explains what happened and what to try next."
      }
      actions={
        <Button
          size="xs"
          variant="outline"
          startIcon={busyIcon}
          disabled={isPending}
          onClick={() => void ask()}
        >
          {isPending ? "Thinking…" : answer ? "Ask again" : "Ask AI"}
        </Button>
      }
    >
      {answer && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">{answer.summary}</p>

          {answer.cause != null && (
            <CopilotPart title="Likely cause">
              <span className="text-sm">
                {answer.cause}{" "}
                <span
                  className={cn(
                    CHIP_CLASS,
                    "whitespace-nowrap",
                    CERTAINTY_CLASS[answer.certainty],
                  )}
                >
                  {answer.certainty} certainty
                </span>
              </span>
            </CopilotPart>
          )}

          {answer.eta != null && (
            <CopilotPart title="Estimated arrival">
              <span className="text-sm font-medium">{answer.eta}</span>
              {answer.etaBasis != null && (
                <span className="text-xs text-muted-foreground">
                  {answer.etaBasis}
                </span>
              )}
            </CopilotPart>
          )}

          {answer.actions.length > 0 && (
            <CopilotPart title="Suggested next steps">
              <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
                {answer.actions.map((action) => (
                  <li key={action.title}>
                    <span className="font-medium">{action.title}</span>
                    {action.detail !== "" && (
                      <span className="text-muted-foreground">
                        {" "}
                        — {action.detail}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </CopilotPart>
          )}

          {answer.resolveWith != null && (
            <p
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-sm",
                TONE_CLASS.green,
              )}
            >
              Looks ready to resolve as{" "}
              <span className="font-medium">“{answer.resolveWith}”</span>. Pick
              it under Close it.
            </p>
          )}

          {answer.unknowns.length > 0 && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none">
                What the AI didn't have ({answer.unknowns.length})
              </summary>
              <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5">
                {answer.unknowns.map((unknown) => (
                  <li key={unknown}>{unknown}</li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
            <span className="text-[11px] text-muted-foreground">
              A suggestion from {answer.usage.model} · check before acting ·{" "}
              {(
                answer.usage.inputTokens + answer.usage.outputTokens
              ).toLocaleString()}{" "}
              tokens
            </span>
            <Button
              size="xs"
              variant="outline"
              disabled={isPosted || isPosting}
              onClick={() => void addToTimeline(answer.note)}
            >
              {isPosted
                ? "Added to timeline"
                : isPosting
                  ? "Adding…"
                  : "Add to timeline"}
            </Button>
          </div>
        </div>
      )}
    </ExceptionStep>
  );
}

function CopilotPart({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <h4 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h4>
      {children}
    </div>
  );
}
