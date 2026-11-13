import { useState, type ReactNode } from "react";
import { format } from "date-fns";
import { ArrowRight, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  toast,
} from "@moduleleague/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { errorParser } from "@/hooks/useErrorParser";
import { attempt } from "@/lib/toastHelper";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import type { DispatchData } from "./useDispatchData";

/** Keep in step with DispatchCreateRequest.notes' MaxLength. */
const MAX_NOTES = 1000;

interface DispatchPlannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DispatchData;
}

/**
 * "Plan with AI": the AI proposes a driver, vehicle and times for every shipment not yet dispatched, and the API checks each
 * line. The person ticks the lines to keep and each becomes a dispatch; a line with a problem can't be ticked. Each plan is a
 * paid call, so it stays until "Plan again".
 */
export function DispatchPlannerDialog({
  open,
  onOpenChange,
  data,
}: DispatchPlannerDialogProps) {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [created, setCreated] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const {
    mutateAsync,
    data: plan,
    isPending,
  } = useMutation({ mutationFn: () => data.onPlanWithAi({ date }) });

  const run = () =>
    attempt("Couldn't plan the dispatches", async () => {
      const result = await mutateAsync();
      setCreated(new Set());
      setPicked(
        new Set(
          result.lines
            ?.filter((line) => line.problems?.length === 0)
            .map((line) => line.shipmentId),
        ),
      );
    });
  const toggle = (shipmentId: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (!next.delete(shipmentId)) next.add(shipmentId);
      return next;
    });

  // One at a time, so a refused line (e.g. dispatched meanwhile) doesn't stop the rest
  const createPicked = async () => {
    const lines = (plan?.lines ?? []).filter(
      (line) => picked.has(line.shipmentId) && !created.has(line.shipmentId),
    );
    setIsCreating(true);
    const failures: string[] = [];
    for (const line of lines) {
      try {
        await data.onCreateDispatch({
          shipmentId: line.shipmentId,
          driverId: line.driverId,
          vehicleId: line.vehicleId,
          originId: line.originId,
          destinationId: line.destinationId,
          plannedPickupAt: line.plannedPickupAt,
          plannedDeliveryAt: line.plannedDeliveryAt,
          notes: `Planned with AI: ${line.why}`.slice(0, MAX_NOTES),
        });
        setCreated((current) => new Set(current).add(line.shipmentId));
      } catch (error: unknown) {
        failures.push(
          `${line.shipment}: ${errorParser(error)?.message ?? "refused"}`,
        );
      }
    }
    setIsCreating(false);
    const done = lines.length - failures.length;
    if (done > 0)
      toast.success(`${done} dispatch${done === 1 ? "" : "es"} created`);
    if (failures.length > 0)
      toast.error("Some dispatches weren't created", {
        description: failures.join(" · "),
      });
  };

  const toCreate = [...picked].filter((id) => !created.has(id)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Plan the day with AI</DialogTitle>
          <DialogDescription>
            The AI proposes a driver, vehicle and times for every shipment not
            yet dispatched. Each line is checked for busy drivers, overloaded
            vehicles and the receiver's hours. Nothing is created until you
            approve it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            aria-label="Day to plan"
            value={date}
            min={format(new Date(), "yyyy-MM-dd")}
            onChange={(event) => setDate(event.target.value)}
            className="h-8 w-44 text-sm"
          />
          <Button
            size="sm"
            variant={plan ? "outline" : "default"}
            startIcon={
              isPending ? (
                <Spinner className="size-3.5" />
              ) : (
                <Sparkles size={14} />
              )
            }
            disabled={isPending || isCreating || date === ""}
            onClick={() => void run()}
          >
            {isPending ? "Planning…" : plan ? "Plan again" : "Plan"}
          </Button>
        </div>

        <div className="-mx-6 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6">
          {plan && (
            <PlanResult
              plan={plan}
              picked={picked}
              created={created}
              onToggle={toggle}
            />
          )}
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-[11px] text-muted-foreground">
            {plan?.usage &&
              `Planned by ${plan.usage.model} · ${(
                (plan.usage.inputTokens ?? 0) + (plan.usage.outputTokens ?? 0)
              ).toLocaleString()} tokens`}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              disabled={toCreate === 0 || isCreating || isPending}
              onClick={() => void createPicked()}
            >
              {isCreating
                ? "Creating…"
                : `Create ${toCreate} dispatch${toCreate === 1 ? "" : "es"}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PlanResultProps {
  plan: IDispatchAiPlan;
  picked: Set<string>;
  created: Set<string>;
  onToggle: (shipmentId: string) => void;
}

function PlanResult({ plan, picked, created, onToggle }: PlanResultProps) {
  return (
    <>
      {plan.summary !== "" && <p className="text-sm">{plan.summary}</p>}

      {plan.risks?.length > 0 && (
        <div
          className={cn(
            "flex flex-col gap-1 rounded-md border px-3 py-2 text-sm",
            TONE_CLASS.amber,
          )}
        >
          <span className="font-medium">Watch out for</span>
          <ul className="list-disc pl-5">
            {plan.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.lines?.length > 0 && (
        <Part title={`Proposed (${plan.lines.length})`}>
          <ul className="flex flex-col divide-y rounded-md border">
            {plan.lines.map((line) => (
              <PlanLine
                key={line.shipmentId}
                line={line}
                isPicked={picked.has(line.shipmentId)}
                isCreated={created.has(line.shipmentId)}
                onToggle={() => onToggle(line.shipmentId)}
              />
            ))}
          </ul>
        </Part>
      )}

      {plan.unplanned?.length > 0 && (
        <Part title={`Not planned (${plan.unplanned.length})`}>
          <ul className="flex flex-col gap-1 text-sm">
            {plan.unplanned.map((item) => (
              <li key={item.shipmentId}>
                <span className="font-medium">{item.shipment}</span>{" "}
                <span className="text-muted-foreground">— {item.why}</span>
              </li>
            ))}
          </ul>
        </Part>
      )}

      {plan.leftOut?.length > 0 && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Not offered:</span>{" "}
          {plan.leftOut
            .map((item) => `${item.name} (${item.kind}): ${item.why}`)
            .join(" · ")}
        </p>
      )}
    </>
  );
}

interface PlanLineProps {
  line: IDispatchPlanLine;
  isPicked: boolean;
  isCreated: boolean;
  onToggle: () => void;
}

function PlanLine({ line, isPicked, isCreated, onToggle }: PlanLineProps) {
  const isBlocked = line.problems?.length > 0;
  const id = `plan-${line.shipmentId}`;
  const load =
    line.weight != null
      ? `${line.weight.toLocaleString()} kg${line.capacity != null ? ` of ${line.capacity.toLocaleString()}` : ""}`
      : undefined;

  return (
    <li className={cn("flex gap-3 px-3 py-2.5", isBlocked && "bg-muted/40")}>
      <Checkbox
        id={id}
        className="mt-0.5"
        checked={isPicked || isCreated}
        disabled={isBlocked || isCreated}
        onCheckedChange={onToggle}
        aria-label={`Approve ${line.shipment}`}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        <label
          htmlFor={id}
          className="flex flex-wrap items-center gap-x-2 gap-y-0.5"
        >
          <span className="font-medium">{line.shipment}</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            {line.origin} <ArrowRight size={12} /> {line.destination}
          </span>
          {isCreated && (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Created
            </span>
          )}
        </label>
        <span>
          {format(new Date(line.plannedPickupAt), "dd MMM HH:mm")} –{" "}
          {format(new Date(line.plannedDeliveryAt), "HH:mm")} · {line.driver} ·{" "}
          {line.vehicle}
          {load !== undefined && ` · ${load}`}
          <span className="text-muted-foreground"> · {line.trip}</span>
        </span>
        {line.why !== "" && (
          <span className="text-xs text-muted-foreground">{line.why}</span>
        )}
        <Notes items={line.problems} className="text-destructive" />
        <Notes
          items={line.warnings}
          className="text-amber-700 dark:text-amber-400"
        />
      </div>
    </li>
  );
}

function Notes({ items, className }: { items?: string[]; className: string }) {
  if (items == null || items.length === 0) return null;
  return (
    <ul className={cn("flex flex-col text-xs", className)}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h4>
      {children}
    </div>
  );
}
