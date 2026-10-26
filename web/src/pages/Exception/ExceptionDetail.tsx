import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, cn, Input, Skeleton, toast } from "@moduleleague/ui";
import QueryWrapper from "@/components/custom/QueryWrapper";
import { errorParser } from "@/hooks/useErrorParser";
import { DashboardSegmented } from "@/module/dashboard/settings/DashboardControls";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import { actorName } from "@/services/user/current.user";
import { CHIP_CLASS } from "./ExceptionList";
import { ExceptionFixActions } from "./ExceptionFixActions";
import {
  deadlineText,
  EXCEPTION_TABS,
  factCards,
  isOverdue,
  labelOf,
  openedLine,
  routeText,
  SEVERITIES,
  SEVERITY_CLASS,
  snoozeTimes,
  stamp,
  whyText,
  type ExceptionRow,
} from "./exception.utils";
import type { ExceptionActivityData, ExceptionData } from "./useExceptionData";

const OTHER = "__other";

const STATUS_CLASS: Record<IExceptionStatus, string> = {
  open: TONE_CLASS.red,
  snoozed: "border-border bg-muted text-muted-foreground",
  resolved: TONE_CLASS.green,
};

const DOT_CLASS: Record<IExceptionActivityKind, string> = {
  opened: "bg-red-500",
  assigned: "bg-blue-500",
  note: "bg-primary",
  action: "bg-amber-500",
  resolved: "bg-emerald-600",
  auto_closed: "bg-emerald-600",
};

type ExceptionDetailProps = {
  row: ExceptionRow;
  data: ExceptionData;
  activity: ExceptionActivityData;
  now: Date;
  me: IUserInfo;
  onOpenRules: () => void;
};

/** One exception: who owns it, why it opened, the facts then, how to fix it, resolving or snoozing it, and its timeline. */
export function ExceptionDetail({
  row,
  data,
  activity,
  now,
  me,
  onOpenRules,
}: ExceptionDetailProps) {
  const { exception, rule, shipment } = row;
  const open = exception.status !== "resolved";
  const cards = useMemo(() => factCards(exception), [exception]);

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-xl border bg-background p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">
            {openedLine(row)}
          </span>
          <h2 className="truncate text-lg font-semibold">
            {exception.title} · {shipment?.title ?? "Unknown shipment"}
          </h2>
          <span className="text-xs text-muted-foreground">
            {routeText(shipment)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className={cn(CHIP_CLASS, SEVERITY_CLASS[exception.severity])}>
            {labelOf(SEVERITIES, exception.severity)}
          </span>
          <span className={cn(CHIP_CLASS, STATUS_CLASS[exception.status])}>
            {labelOf(EXCEPTION_TABS, exception.status)}
          </span>
          <Link
            to="/shipment"
            className="ml-1 font-medium text-primary hover:underline"
          >
            Open shipment
          </Link>
        </div>
      </header>

      <OwnerPicker row={row} data={data} now={now} me={me} disabled={!open} />

      <section className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Why this opened
          </h3>
          <button
            type="button"
            onClick={onOpenRules}
            className="cursor-pointer text-xs font-medium text-primary hover:underline"
          >
            Edit rule
          </button>
        </div>
        <p className="text-sm font-medium">{whyText(exception)}</p>
        <p className="text-xs text-muted-foreground">
          Rule{" "}
          <span className="font-medium text-foreground">
            {exception.ruleKey}
          </span>
          {rule?.when && (
            <>
              :{" "}
              <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">
                {rule.when}
              </code>
            </>
          )}
        </p>
      </section>

      {!!cards.length && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Facts when it opened</h3>
          <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {cards.map(([label, value]) => (
              <div
                key={label}
                className="flex flex-col rounded-lg border p-2.5"
              >
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {open && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Fix it</h3>
          <ExceptionFixActions row={row} data={data} />
        </section>
      )}

      {open ? (
        <ResolveBar row={row} data={data} now={now} />
      ) : (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm">
          Resolved {stamp(exception.resolvedAt)} ·{" "}
          <span className="font-medium">{exception.resolutionReason}</span>
          {!exception.resolvedBy && " · closed itself"}
        </p>
      )}

      <ActivityLog row={row} data={data} activity={activity} />
    </article>
  );
}

/** Unassigned, me, then the other members, as chips; picking one saves at once. */
function OwnerPicker({
  row,
  data,
  now,
  me,
  disabled,
}: {
  row: ExceptionRow;
  data: ExceptionData;
  now: Date;
  me: IUserInfo;
  disabled: boolean;
}) {
  const { exception } = row;
  const { onAssign, members } = data;
  const options = useMemo(() => {
    const others = members.filter((member) => member?.id !== me.id);
    const shown = others.slice(0, 4);
    const owner = others.find((member) => member.id === exception.ownerId);
    return [
      { value: "", label: "Unassigned" },
      { value: me.id, label: `Me (${me.displayName})` },
      ...(owner && !shown.includes(owner) ? [...shown, owner] : shown).map(
        (member) => ({ value: member.id, label: member.displayName }),
      ),
    ];
  }, [members, me, exception.ownerId]);
  const assign = useCallback(
    (ownerId: string) =>
      onAssign(exception, ownerId || undefined).catch((error) =>
        toast.error("Couldn't change the owner", {
          description: errorParser(error)?.message,
        }),
      ),
    [onAssign, exception],
  );
  const deadline = deadlineText(exception, now);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <span className="text-sm font-medium">Owner</span>
        <DashboardSegmented
          label="Owner"
          value={exception.ownerId ?? ""}
          options={options}
          onChange={assign}
        />
      </div>
      {deadline && (
        <span
          className={cn(
            "text-xs",
            isOverdue(exception, now)
              ? "font-medium text-red-600 dark:text-red-400"
              : "text-muted-foreground",
          )}
        >
          {deadline}
        </span>
      )}
    </div>
  );
}

/** The rule's reasons as chips (or a typed one), then Resolve, and Snooze or Wake now. */
function ResolveBar({
  row,
  data,
  now,
}: {
  row: ExceptionRow;
  data: ExceptionData;
  now: Date;
}) {
  const { exception, rule } = row;
  const { onResolve, onSnooze, onWake, isSaving } = data;
  const [picked, setPicked] = useState("");
  const [typed, setTyped] = useState("");
  const options = useMemo(
    () => [
      ...(rule?.reasons ?? ["False alarm"]).map((reason) => ({
        value: reason,
        label: reason,
      })),
      { value: OTHER, label: "Other…" },
    ],
    [rule?.reasons],
  );
  const reason = picked === OTHER ? typed.trim() : picked;
  const snoozes = useMemo(() => snoozeTimes(exception, now), [exception, now]);
  const run = useCallback(
    (action: Promise<unknown>, failure: string) =>
      action.catch((error) =>
        toast.error(failure, { description: errorParser(error)?.message }),
      ),
    [],
  );

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Resolve with a reason</h3>
      <DashboardSegmented
        label="Reason"
        value={picked}
        options={options}
        onChange={setPicked}
      />
      {picked === OTHER && (
        <Input
          autoFocus
          aria-label="Reason"
          maxLength={200}
          placeholder="Why it can be closed"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          className="max-w-md"
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={!reason || isSaving}
          onClick={() =>
            run(onResolve(exception, reason), "Couldn't resolve it")
          }
        >
          Resolve exception
        </Button>
        {exception.status === "snoozed" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => run(onWake(exception), "Couldn't wake it")}
          >
            Wake now
          </Button>
        ) : (
          snoozes.map((snooze) => (
            <Button
              key={snooze.label}
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() =>
                run(onSnooze(exception, snooze.until), "Couldn't snooze it")
              }
            >
              {snooze.label}
            </Button>
          ))
        )}
      </div>
    </section>
  );
}

/** The timeline, newest first, with a box to add a note. */
function ActivityLog({
  row,
  data,
  activity,
}: {
  row: ExceptionRow;
  data: ExceptionData;
  activity: ExceptionActivityData;
}) {
  const { exception } = row;
  const { members, onLog } = data;
  const [note, setNote] = useState("");
  const entries = useMemo(
    () => [...activity.entries].reverse(),
    [activity.entries],
  );
  const actorOf = useCallback(
    (entry: IExceptionActivity) => actorName(members, entry.actorId),
    [members],
  );
  const post = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (!note.trim()) return;
      try {
        await onLog(exception, "note", note.trim());
        setNote("");
      } catch (error) {
        toast.error("Couldn't add the note", {
          description: errorParser(error)?.message,
        });
      }
    },
    [note, onLog, exception],
  );

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Activity</h3>
      <form onSubmit={post} className="flex gap-2">
        <Input
          aria-label="Add a note"
          placeholder="Add a note"
          maxLength={2000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={!note.trim()}
        >
          Add note
        </Button>
      </form>
      <QueryWrapper
        isLoading={activity.isLoading}
        error={activity.error}
        onRetry={activity.onRetry}
        renderLoader={
          <div
            className="flex flex-col gap-2"
            aria-busy
            aria-label="Loading activity"
          >
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        }
      >
        <ol className="flex flex-col gap-2.5">
          {entries.map((entry) => (
            <li key={entry.objId} className="flex gap-2.5">
              <span
                aria-hidden
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  DOT_CLASS[entry.kind],
                )}
              />
              <div className="flex min-w-0 flex-col">
                <span className="text-sm break-words whitespace-pre-wrap">
                  {entry.body}
                </span>
                <span className="text-xs text-muted-foreground">
                  {stamp(entry.createdAt)} · {actorOf(entry)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </QueryWrapper>
    </section>
  );
}
