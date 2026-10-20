import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogTitle,
  Skeleton,
  Switch,
  Textarea,
  toast,
} from "@moduleleague/ui";
import QueryWrapper from "@/components/custom/QueryWrapper";
import { errorParser } from "@/hooks/useErrorParser";
import { findMember } from "@/lib/memberHelper";
import { parseAttachments, toAttachmentValue } from "@/lib/attachmentHelper";
import { RecordAttachmentInput } from "@/components/custom/RecordAttachmentInput";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import {
  DISPATCH_STAGES,
  DISPATCH_STEPS,
  jobNumber,
  lateText,
  shortTime,
  stepsDone,
  type DispatchPlace,
  type DispatchShipment,
  type DispatchStage,
} from "./dispatchBoard.utils";
import type { DispatchDetailData } from "./useDispatchDetail";

type DispatchDetailDialogProps = {
  /** The shipment of the open dispatch. */
  shipment?: DispatchShipment;
  detail: DispatchDetailData;
  members: IUserInfo[];
  now: Date;
};

const STAGE_CLASS: Record<DispatchStage, string> = {
  unassigned: TONE_CLASS.amber,
  assigned:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  en_route:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300",
  completed: TONE_CLASS.green,
};

/** One dispatch opened from its card: where it stands, its checkpoint log and its details. */
export function DispatchDetailDialog({
  shipment,
  detail,
  members,
  now,
}: DispatchDetailDialogProps) {
  const onClose = detail?.onClose;
  return (
    <Dialog
      open={!!detail?.dispatchId}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent
        aria-describedby={undefined}
        className="flex h-[min(900px,94dvh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
        showCloseButton={false}
      >
        {shipment?.dispatch ? (
          <DispatchDetail
            shipment={shipment}
            dispatch={shipment.dispatch}
            detail={detail}
            members={members}
            now={now}
          />
        ) : (
          <DialogTitle className="p-6">Dispatch not found</DialogTitle>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DispatchDetail({
  shipment,
  dispatch,
  detail,
  members,
  now,
}: Omit<DispatchDetailDialogProps, "shipment"> & {
  shipment: DispatchShipment;
  dispatch: IDispatch;
}) {
  const stage = useMemo(
    () => DISPATCH_STAGES.find((entry) => entry.value === shipment?.stage),
    [shipment?.stage],
  );
  const late = lateText(dispatch, now);
  const labelSuggestions = useMemo(
    () =>
      [
        ...new Set(
          detail?.checkpoints?.flatMap(
            (log) =>
              log?.attachments?.flatMap((file) => file?.label ?? []) ?? [],
          ),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [detail?.checkpoints],
  );

  return (
    <>
      <header className="grid shrink-0 gap-3 border-b p-4 pr-10 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <DialogTitle className="truncate text-lg">
              {shipment?.title}
            </DialogTitle>
            <span
              className={cn(
                "shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium",
                STAGE_CLASS[shipment?.stage],
              )}
            >
              {stage?.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-md border px-2 py-0.5 font-medium">
              {jobNumber(dispatch)}
            </span>
            {shipment?.badge && (
              <span className="rounded-md bg-primary px-2 py-0.5 font-medium text-primary-foreground">
                {shipment.badge}
              </span>
            )}
            {shipment?.details?.map((text) => (
              <span key={text} className="rounded-md bg-muted px-2 py-0.5">
                {text}
              </span>
            ))}
          </div>
        </div>
        <dl className="flex flex-wrap items-start gap-x-6 gap-y-2 text-xs">
          <HeaderFact label="From" value={shipment?.origin?.title} />
          <HeaderFact label="To" value={shipment?.destination?.title} />
          <HeaderFact
            label="ETA"
            value={shortTime(dispatch?.plannedDeliveryAt, now) || "—"}
            note={late}
          />
        </dl>
      </header>

      <DispatchStepper shipment={shipment} dispatch={dispatch} now={now} />

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
        <section className="flex min-h-0 flex-col gap-3 rounded-xl border p-3">
          <h3 className="shrink-0 text-sm font-semibold">Checkpoint log</h3>
          <CheckpointComposer
            detail={detail}
            labelSuggestions={labelSuggestions}
          />
          <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
            <QueryWrapper
              isLoading={detail?.isLoading}
              error={detail?.error}
              onRetry={detail?.onRetry}
              renderLoader={<CheckpointSkeleton />}
            >
              <ol className="flex flex-col">
                {detail?.checkpoints?.map((log) => (
                  <CheckpointEntry
                    key={log.objId}
                    dotClassName="bg-primary"
                    title={`Note from ${findMember(members, log.createdBy)?.displayName ?? "Team member"}`}
                    when={whenText(log.createTime, now)}
                    meta={[log.internalOnly && "Internal, team only"]}
                    note={log.note}
                  >
                    {!!log.attachments?.length && (
                      <CheckpointFiles
                        log={log}
                        labelSuggestions={labelSuggestions}
                        onLabel={detail?.onLabel}
                      />
                    )}
                  </CheckpointEntry>
                ))}
                <CheckpointEntry
                  dotClassName="bg-emerald-600"
                  title={`Assigned to ${shipment?.driver?.title ?? "a driver"}`}
                  when={whenText(dispatch?.createTime, now)}
                  meta={[
                    shipment?.vehicle && `Vehicle ${shipment.vehicle.title}`,
                    `Pickup planned ${shortTime(dispatch?.plannedPickupAt, now)}`,
                  ]}
                  note={dispatch?.notes}
                />
              </ol>
            </QueryWrapper>
          </div>
        </section>
        <div className="flex min-h-0 flex-col gap-4 lg:overflow-y-auto">
          <div
            aria-label="Route map"
            className="h-64 shrink-0 rounded-xl border bg-muted/50"
          />
          <section className="flex shrink-0 flex-col gap-3 rounded-xl border p-3">
            <h3 className="text-sm font-semibold">Stops</h3>
            <DispatchStop
              kind="Pickup"
              dotClassName="bg-blue-600"
              place={shipment?.origin}
              lines={[
                `Planned ${shortTime(dispatch?.plannedPickupAt, now)}`,
                dispatch?.actualPickupAt
                  ? `Picked up ${shortTime(dispatch.actualPickupAt, now)}`
                  : "Not picked up yet",
              ]}
            />
            <DispatchStop
              kind="Drop-off"
              dotClassName="bg-orange-600"
              place={shipment?.destination}
              lines={[
                dispatch?.plannedDeliveryAt
                  ? `Planned ${shortTime(dispatch.plannedDeliveryAt, now)}`
                  : "No delivery time planned",
                dispatch?.actualDeliveryAt
                  ? `Delivered ${shortTime(dispatch.actualDeliveryAt, now)}`
                  : "Not delivered yet",
              ]}
            />
          </section>
        </div>
      </div>
    </>
  );
}

/** "Just now" within a minute, else a short time. */
function whenText(value: string | undefined, now: Date) {
  if (!value) return "";
  return Math.abs(Date.now() - new Date(value).getTime()) < 60_000
    ? "Just now"
    : shortTime(value, now);
}

function HeaderFact({
  label,
  value,
  note,
}: {
  label: string;
  value?: string;
  note?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-52 truncate text-sm font-semibold">
        {value ?? "Not set"}
      </dd>
      {note && <dd className="text-amber-700 dark:text-amber-400">{note}</dd>}
    </div>
  );
}

/** Booked, then each dispatch step, ticked once done, with when it happened where that's known. */
function DispatchStepper({
  shipment,
  dispatch,
  now,
}: {
  shipment: DispatchShipment;
  dispatch: IDispatch;
  now: Date;
}) {
  const done = 1 + stepsDone(dispatch);
  const times = [
    shipment?.bookedAt,
    dispatch?.createTime,
    dispatch?.actualPickupAt,
    undefined,
    dispatch?.actualDeliveryAt,
    undefined,
  ];
  return (
    <ol className="flex shrink-0 overflow-x-auto border-b px-4 py-3">
      {["Booked", ...DISPATCH_STEPS].map((step, index) => (
        <li key={step} className="flex min-w-28 flex-1 flex-col gap-1.5">
          <span className="flex items-center">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                index < done
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "bg-background text-muted-foreground",
              )}
            >
              {index < done ? <Check className="size-4" /> : index + 1}
            </span>
            {index < DISPATCH_STEPS.length && (
              <span
                aria-hidden
                className={cn(
                  "h-0.5 flex-1",
                  index + 1 < done ? "bg-emerald-600" : "bg-border",
                )}
              />
            )}
          </span>
          <span className="text-xs font-medium">{step}</span>
          <span className="text-[11px] text-muted-foreground">
            {shortTime(times[index], now) || (index < done ? "" : "—")}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The files of a posted entry; each one's label can be added or changed, which saves straight away. */
function CheckpointFiles({
  log,
  labelSuggestions,
  onLabel,
}: {
  log: ICheckpointLog;
  labelSuggestions: string[];
  onLabel: DispatchDetailData["onLabel"];
}) {
  const value = useMemo(
    () => toAttachmentValue(log?.attachments),
    [log?.attachments],
  );
  const change = useCallback(
    (next: string) => {
      const changed = parseAttachments(next).find(
        (file) =>
          file?.label !==
          log?.attachments?.find((saved) => saved?.id === file?.id)?.label,
      );
      if (!changed) return;
      onLabel(log.objId, changed.id, changed.label).catch((error) =>
        toast.error("Couldn't change the label", {
          description: errorParser(error)?.message,
        }),
      );
    },
    [log, onLabel],
  );
  return (
    <RecordAttachmentInput
      value={value}
      onChange={change}
      cardSize="compact"
      labelMode="text"
      labelSuggestions={labelSuggestions}
      removable={false}
    />
  );
}

/** Writes a note and attaches files, each with a typed label, then posts them to the log, for the team only unless switched off. */
function CheckpointComposer({
  detail,
  labelSuggestions,
}: {
  detail: DispatchDetailData;
  labelSuggestions: string[];
}) {
  const { onUpload, onAddCheckpoint, isPosting } = detail;
  const [note, setNote] = useState("");
  const [internalOnly, setInternalOnly] = useState(true);
  const [filesValue, setFilesValue] = useState("");
  const files = useMemo(() => parseAttachments(filesValue), [filesValue]);

  const canPost = (!!note.trim() || !!files.length) && !isPosting;
  const post = useCallback(async () => {
    if (!canPost) return;
    try {
      await onAddCheckpoint({
        note: note.trim() || undefined,
        internalOnly,
        attachments: files.map(({ id, label }) => ({ id, label })),
      });
      setNote("");
      setFilesValue("");
    } catch (error) {
      toast.error("Couldn't post to the log", {
        description: errorParser(error)?.message,
      });
    }
  }, [canPost, onAddCheckpoint, note, internalOnly, files]);

  return (
    <div className="flex max-h-[50%] shrink-0 flex-col gap-2 overflow-y-auto rounded-lg border bg-muted/30 p-2.5">
      <Textarea
        aria-label="Add a note"
        placeholder="Add a note or file"
        rows={2}
        maxLength={2000}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        className="bg-background"
      />
      <div className="flex items-center gap-3">
        <RecordAttachmentInput
          value={filesValue}
          onChange={setFilesValue}
          onUpload={onUpload}
          labelMode="text"
          labelSuggestions={labelSuggestions}
          trigger="button"
          cardSize="compact"
          className="flex-1"
        />
        <label className="flex shrink-0 cursor-pointer items-center gap-2 pt-0.5 text-xs">
          Internal only
          <Switch
            checked={internalOnly}
            onCheckedChange={setInternalOnly}
            size="sm"
          />
        </label>
        <Button
          size="xs"
          className="shrink-0"
          disabled={!canPost}
          onClick={post}
        >
          {isPosting ? "Posting…" : "Post"}
        </Button>
      </div>
    </div>
  );
}

function CheckpointEntry({
  dotClassName,
  title,
  when,
  meta,
  note,
  children,
}: {
  dotClassName: string;
  title: string;
  when: string;
  meta: (string | false | undefined)[];
  note?: string;
  children?: ReactNode;
}) {
  const metaText = meta.filter(Boolean).join(" · ");
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:top-4 [&:not(:last-child)]:before:bottom-0 [&:not(:last-child)]:before:left-[4.5px] [&:not(:last-child)]:before:w-px [&:not(:last-child)]:before:bg-border">
      <span
        aria-hidden
        className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", dotClassName)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-medium">{title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{when}</span>
        </div>
        {metaText && (
          <span className="text-xs text-muted-foreground">{metaText}</span>
        )}
        {note && (
          <p className="rounded-md bg-muted/60 px-2.5 py-1.5 text-sm break-words whitespace-pre-wrap">
            {note}
          </p>
        )}
        {children}
      </div>
    </li>
  );
}

function DispatchStop({
  kind,
  dotClassName,
  place,
  lines,
}: {
  kind: string;
  dotClassName: string;
  place?: DispatchPlace;
  lines: string[];
}) {
  return (
    <div className="flex gap-3">
      <span
        aria-hidden
        className={cn("mt-1 size-2.5 shrink-0 rounded-full", dotClassName)}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {kind}
        </span>
        <span className="text-sm font-semibold">
          {place?.title ?? "Not set"}
        </span>
        {lines.map((line) => (
          <span key={line} className="text-xs text-muted-foreground">
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}

function CheckpointSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Loading log">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex gap-3">
          <Skeleton className="mt-1 size-2.5 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
