import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlarmClock,
  ArrowUp,
  Check,
  ChevronDown,
  CircleCheck,
  MessageSquare,
  TriangleAlert,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
} from "@moduleleague/ui";
import { QueryWrapper } from "@/components/custom/QueryWrapper";
import { errorParser } from "@/hooks/useErrorParser";
import { DashboardSegmented } from "@/module/dashboard/settings/DashboardControls";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import { actorName } from "@/services/user/current.user";
import { CHIP_CLASS } from "./ExceptionList";
import { ExceptionCopilot } from "./ExceptionCopilot";
import { ExceptionCustomerUpdate } from "./ExceptionCustomerUpdate";
import { ExceptionFixActions } from "./ExceptionFixActions";
import { ExceptionStep } from "./ExceptionStep";
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
import { nonEmpty } from "@/lib/stringHelper";

const OTHER = "__other";

const STATUS_CLASS: Record<IExceptionStatus, string> = {
  open: TONE_CLASS.red,
  snoozed: "border-border bg-muted text-muted-foreground",
  resolved: TONE_CLASS.green,
};

const DONE_TONE =
  "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300";

/** Each kind of timeline entry as its icon and tint, so the timeline reads at a glance. */
const ACTIVITY_KIND: Record<
  IExceptionActivityKind,
  { icon: LucideIcon; className: string }
> = {
  opened: {
    icon: TriangleAlert,
    className: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300",
  },
  assigned: {
    icon: UserRound,
    className:
      "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300",
  },
  note: { icon: MessageSquare, className: "bg-muted text-muted-foreground" },
  action: {
    icon: Wrench,
    className:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
  },
  resolved: { icon: CircleCheck, className: DONE_TONE },
  auto_closed: { icon: CircleCheck, className: DONE_TONE },
};

type ExceptionDetailProps = {
  row: ExceptionRow;
  data: ExceptionData;
  activity: ExceptionActivityData;
  now: Date;
  me: IUserInfo;
  onOpenRules: () => void;
  /** Sizes the panel in its column, e.g. to scroll on its own. */
  className?: string;
};

/** One exception: what went wrong and why, who owns it, how to fix it, resolving or snoozing it, and its timeline. */
export function ExceptionDetail({
  row,
  data,
  activity,
  now,
  me,
  onOpenRules,
  className,
}: ExceptionDetailProps) {
  const { exception, rule, shipment } = row;
  const open = exception.status !== "resolved";
  const cards = useMemo(() => factCards(exception), [exception]);
  const deadline = deadlineText(exception, now);
  const ruleTitle = nonEmpty(rule?.title) ?? exception.ruleKey;

  return (
    <article className={cn("flex min-w-0 flex-col gap-6 px-6 py-5", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {openedLine(row)}
          </span>
          <h2 className="text-xl font-semibold text-balance">
            {exception.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {shipment?.title ?? "Unknown shipment"}
            </span>{" "}
            · {routeText(shipment)} ·{" "}
            <Link
              to="/shipment"
              className="text-primary underline-offset-2 hover:underline"
            >
              Open shipment
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              CHIP_CLASS,
              "py-0.5",
              SEVERITY_CLASS[exception.severity],
            )}
          >
            {labelOf(SEVERITIES, exception.severity)} severity
          </span>
          {/* Open is the usual case, so only snoozed and resolved get a chip */}
          {exception.status !== "open" && (
            <span
              className={cn(
                CHIP_CLASS,
                "py-0.5",
                STATUS_CLASS[exception.status],
              )}
            >
              {labelOf(EXCEPTION_TABS, exception.status)}
            </span>
          )}
        </div>
      </header>

      {/* The answers a dispatcher looks for first, as label and value, top to bottom */}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
        <DetailRow label="What happened">
          <span className="font-medium text-pretty">{whyText(exception)}</span>
        </DetailRow>
        {deadline !== "" && (
          <DetailRow label="Respond">
            <span
              className={cn(
                "tabular-nums",
                isOverdue(exception, now)
                  ? "font-medium text-red-600 dark:text-red-400"
                  : "text-foreground",
              )}
            >
              {deadline}
            </span>
          </DetailRow>
        )}
        <DetailRow label="Owner">
          <OwnerPicker row={row} data={data} me={me} disabled={!open} />
        </DetailRow>
        {cards.map(([label, value]) => (
          <DetailRow key={label} label={label}>
            <span className="tabular-nums">{value}</span>
          </DetailRow>
        ))}
        <DetailRow label="Rule">
          <span title={nonEmpty(rule?.when)}>{ruleTitle}</span>
          {" · "}
          <button
            type="button"
            onClick={onOpenRules}
            className="cursor-pointer text-primary underline-offset-2 hover:underline"
          >
            Edit rule
          </button>
        </DetailRow>
      </dl>

      {/* Everything that acts on it in one panel, in the order it's done */}
      {open ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">What to do</h3>
          <div className="flex flex-col divide-y overflow-hidden rounded-lg border bg-background">
            <ExceptionStep
              title="Fix the problem"
              hint="Each fix is logged in the activity; one that clears the problem can close it for you."
              actions={<ExceptionFixActions row={row} data={data} />}
            />
            <ExceptionCustomerUpdate
              key={`update-${exception.objId}`}
              exception={exception}
              onDraft={data.onDraftCustomerUpdate}
              onLog={data.onLog}
            />
            <ResolveBar row={row} data={data} now={now} />
            {/* Help comes after the two actions, for when neither is clear */}
            <ExceptionCopilot
              key={exception.objId}
              exception={exception}
              onAsk={data.onAskCopilot}
              onLog={data.onLog}
            />
          </div>
        </section>
      ) : (
        <p className="rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
          Resolved {stamp(exception.resolvedAt)} ·{" "}
          <span className="font-medium">{exception.resolutionReason}</span>
          {(exception.resolvedBy == null || exception.resolvedBy === "") &&
            " · closed itself"}
        </p>
      )}

      <ActivityLog row={row} data={data} activity={activity} />
    </article>
  );
}

/** One line of the summary: the label on the left on a wide panel, above its value on a narrow one. */
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-muted-foreground sm:py-0.5">{label}</dt>
      <dd className="-mt-2 min-w-0 sm:mt-0 sm:py-0.5">{children}</dd>
    </>
  );
}

/** Unassigned, me, then the other members, as chips; picking one saves at once. */
function OwnerPicker({
  row,
  data,
  me,
  disabled,
}: {
  row: ExceptionRow;
  data: ExceptionData;
  me: IUserInfo;
  disabled: boolean;
}) {
  const { exception } = row;
  const { onAssign, members } = data;
  const options = useMemo(() => {
    const others = members.filter((member) => member.id !== me.id);
    const shown = others.slice(0, 4);
    const owner = others.find((member) => member.id === exception.ownerId);
    return [
      { value: "", label: "No one" },
      { value: me.id, label: "Me" },
      ...(owner && !shown.includes(owner) ? [...shown, owner] : shown).map(
        (member) => ({ value: member.id, label: member.displayName }),
      ),
    ];
  }, [members, me, exception.ownerId]);
  const assign = useCallback(
    (ownerId: string) =>
      onAssign(exception, nonEmpty(ownerId)).catch((error: unknown) =>
        toast.error("Couldn't change the owner", {
          description: errorParser(error)?.message,
        }),
      ),
    [onAssign, exception],
  );
  return (
    <DashboardSegmented
      label="Owner"
      value={exception.ownerId ?? ""}
      options={options}
      onChange={(ownerId) => void assign(ownerId)}
      className={cn(disabled && "pointer-events-none opacity-60")}
    />
  );
}

/** The last step: Snooze (or Wake now), the rule's reasons to pick from (or a typed one), then Resolve. */
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
      action.catch((error: unknown) =>
        toast.error(failure, { description: errorParser(error)?.message }),
      ),
    [],
  );

  return (
    <ExceptionStep
      title="Close it"
      hint="Say why it's done, or snooze it to come back to later."
      actions={
        <>
          {exception.status === "snoozed" ? (
            <Button
              variant="outline"
              size="xs"
              startIcon={<AlarmClock size={13} />}
              disabled={isSaving}
              onClick={() => void run(onWake(exception), "Couldn't wake it")}
            >
              Wake now
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="xs"
                  startIcon={<AlarmClock size={13} />}
                  disabled={isSaving}
                >
                  Snooze
                  <ChevronDown size={13} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {snoozes.map((snooze) => (
                  <DropdownMenuItem
                    key={snooze.label}
                    onSelect={() =>
                      void run(
                        onSnooze(exception, snooze.until),
                        "Couldn't snooze it",
                      )
                    }
                  >
                    {snooze.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Select value={picked} onValueChange={setPicked}>
            <SelectTrigger aria-label="Reason" className="h-6 w-44 text-xs">
              <SelectValue placeholder="Why it's done" />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="xs"
            startIcon={<Check size={13} />}
            disabled={reason === "" || isSaving}
            onClick={() =>
              void run(onResolve(exception, reason), "Couldn't resolve it")
            }
          >
            Resolve
          </Button>
        </>
      }
    >
      {picked === OTHER && (
        <Input
          autoFocus
          aria-label="Other reason"
          maxLength={200}
          placeholder="Why it can be closed"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          className="h-8 max-w-md"
        />
      )}
    </ExceptionStep>
  );
}

/** The timeline, newest first, with a box to add a note; a run of the same kind by the same person folds into one entry. */
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
  const [isPosting, setIsPosting] = useState(false);
  const [unfolded, setUnfolded] = useState<string[]>([]);
  const groups = useMemo(() => {
    const result: IExceptionActivity[][] = [];
    for (const entry of [...activity.entries].reverse()) {
      const last = result.at(-1);
      const head = last?.[0];
      if (last && head?.kind === entry.kind && head.actorId === entry.actorId)
        last.push(entry);
      else result.push([entry]);
    }
    return result;
  }, [activity.entries]);
  const post = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (note.trim() === "" || isPosting) return;
      setIsPosting(true);
      try {
        await onLog(exception, "note", note.trim());
        setNote("");
      } catch (error: unknown) {
        toast.error("Couldn't add the note", {
          description: errorParser(error)?.message,
        });
      } finally {
        setIsPosting(false);
      }
    },
    [note, isPosting, onLog, exception],
  );

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Activity</h3>
      <div className="flex flex-col divide-y overflow-hidden rounded-lg border bg-background">
        <form onSubmit={(event) => void post(event)} className="p-3">
          <InputGroup>
            <InputGroupInput
              aria-label="Add a note"
              placeholder="Add a note"
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="submit"
                variant="default"
                size="icon-xs"
                aria-label="Add note"
                className="rounded-full"
                disabled={note.trim() === ""}
                isLoading={isPosting}
                startIcon={<ArrowUp className="size-3.5" />}
              />
            </InputGroupAddon>
          </InputGroup>
        </form>
        <QueryWrapper
          isLoading={activity.isLoading}
          error={activity.error}
          onRetry={activity.onRetry}
          renderLoader={
            <div
              className="flex flex-col gap-3 p-4"
              aria-busy
              aria-label="Loading activity"
            >
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          }
        >
          {groups.length > 0 ? (
            <ol className="flex flex-col p-4">
              {groups.flatMap((group) => {
                const [head, ...similar] = group;
                if (!head) return [];
                const isOpen = unfolded.includes(head.objId);
                const entries = (isOpen ? group : [head]).map((entry) => (
                  <ActivityEntry
                    key={entry.objId}
                    entry={entry}
                    actor={actorName(members, entry.actorId)}
                  />
                ));
                if (similar.length === 0 || isOpen) return entries;
                return [
                  ...entries,
                  <li
                    key={`${head.objId}-more`}
                    className="group relative pb-5 pl-10 last:pb-0"
                  >
                    <span
                      aria-hidden
                      className="absolute top-0 bottom-0 left-3.5 w-px bg-border group-last:hidden"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setUnfolded((current) => [...current, head.objId])
                      }
                      className="cursor-pointer text-xs font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Show {similar.length} similar{" "}
                      {similar.length === 1 ? "entry" : "entries"}
                    </button>
                  </li>,
                ];
              })}
            </ol>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              Nothing logged yet.
            </p>
          )}
        </QueryWrapper>
      </div>
    </section>
  );
}

/** One timeline entry: when, what happened, and who did it, beside its kind's icon on the line. */
function ActivityEntry({
  entry,
  actor,
}: {
  entry: IExceptionActivity;
  actor: string;
}) {
  const kind = ACTIVITY_KIND[entry.kind];
  const Icon = kind.icon;
  return (
    <li className="group relative flex gap-3 pb-5 last:pb-0">
      <span
        aria-hidden
        className="absolute top-8 bottom-0 left-3.5 w-px bg-border group-last:hidden"
      />
      <span
        aria-hidden
        className={cn(
          "relative flex size-7 shrink-0 items-center justify-center rounded-full",
          kind.className,
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground tabular-nums">
          {stamp(entry.createdAt)}
        </span>
        {/* A long note, like an AI summary, stops at three lines; the full text is in its tooltip */}
        <span
          title={entry.body}
          className="line-clamp-3 text-sm break-words whitespace-pre-wrap"
        >
          {entry.body}
        </span>
        <span className="text-xs text-muted-foreground">{actor}</span>
      </div>
    </li>
  );
}
