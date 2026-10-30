import { useCallback, useMemo, useRef, useState } from "react";
import {
  Check,
  CircleAlert,
  History,
  Info,
  MoreHorizontal,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Separator,
  Skeleton,
  toast,
} from "@moduleleague/ui";
import { attempt } from "@/lib/toastHelper";
import { nonEmpty } from "@/lib/stringHelper";
import { QueryWrapper } from "@/components/custom/QueryWrapper";
import { AttachmentChip } from "@/components/custom/AttachmentChip";
import { AttachmentThumbnail } from "@/components/custom/AttachmentThumbnail";
import { ConfirmDeleteDialog } from "@/components/custom/ConfirmDeleteDialog";
import { ConfirmDialog } from "@/components/custom/ConfirmDialog";
import { AttachmentPreviewDialog } from "@/components/custom/AttachmentPreviewDialog";
import { useAttachmentPreview } from "@/hooks/useAttachmentPreview";
import { tableFields } from "@/module/dashboard/moduleDashboard.utils";
import { actorName } from "@/services/user/current.user";
import { CHIP_CLASS } from "../Exception/ExceptionList";
import { labelOf, stamp } from "../Exception/exception.utils";
import { DocumentReviewButton } from "./DocumentReviewButton";
import {
  canReview,
  checkSize,
  conditionText,
  DOCUMENT_STATUSES,
  gateName,
  groupDocuments,
  basisText,
  reasonText,
  SOURCE_LABEL,
  DOCUMENT_TONE,
  STATUS_CLASS,
  stepLabel,
  type DocumentRow,
} from "./document.utils";
import { DocumentProgress } from "./DocumentProgress";
import {
  useDocumentActivity,
  type DocumentApi,
  type DocumentData,
} from "./useDocumentData";

const ACCEPT = "application/pdf,image/png,image/jpeg";

/** "action": someone has to upload or fix the paper (orange); "info": it's filed and waiting on a check (blue). */
type BannerTone = "action" | "info";

const BANNER_TONE: Record<
  BannerTone,
  (typeof DOCUMENT_TONE)["orange" | "blue"]
> = {
  action: DOCUMENT_TONE.orange,
  info: DOCUMENT_TONE.blue,
};

type ItemProps = {
  document: IShipmentDocument;
  shipmentId: string;
  data: DocumentData;
  getActivity: DocumentApi["getDocumentActivity"];
  onPreview: (file: IAttachment) => void;
};

/** The selected shipment's checklist: why each paper is needed, its state, and the way to collect, verify or reject it. */
export function DocumentChecklist({
  row,
  data,
  getActivity,
  onOpenRules,
}: {
  row: DocumentRow;
  data: DocumentData;
  getActivity: DocumentApi["getDocumentActivity"];
  onOpenRules: () => void;
}) {
  const { shipment, checklist } = row;
  const { lookups, sources, documentSettings } = data;
  const { openPreview, dialogProps } = useAttachmentPreview();
  const groups = useMemo(() => groupDocuments(checklist), [checklist]);
  const names = useMemo(() => {
    const fields = tableFields(lookups[sources?.shipmentSidebarId ?? ""]);
    const nameOf = (id?: string) =>
      fields.find((field) => field.objId === id)?.name;
    return {
      mode: nameOf(documentSettings?.modeFieldId),
      incoterm: nameOf(documentSettings?.incotermFieldId),
    };
  }, [lookups, sources?.shipmentSidebarId, documentSettings]);
  const preview = useCallback(
    (file: IAttachment) => openPreview([file], 0),
    [openPreview],
  );
  const item = (document: IShipmentDocument) => (
    <DocumentItem
      key={document.objId ?? document.docType}
      document={document}
      shipmentId={shipment.id}
      data={data}
      getActivity={getActivity}
      onPreview={preview}
    />
  );

  return (
    <section className="flex flex-col gap-5 rounded-xl border bg-background p-4 sm:min-w-lg">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-base font-semibold">
              {shipment.title} checklist
            </h2>
            <p className="text-xs text-muted-foreground">
              <span title={reasonText(checklist, names.mode, names.incoterm)}>
                {basisText(checklist)} · {stepLabel(checklist.stage)}
              </span>
              {" · "}
              <button
                type="button"
                onClick={onOpenRules}
                className="cursor-pointer text-primary underline-offset-2 hover:underline"
              >
                Edit rules
              </button>
            </p>
          </div>
          <span
            className={cn(
              CHIP_CLASS,
              "py-0.5",
              checklist.blocks !== undefined
                ? DOCUMENT_TONE.orange.chip
                : DOCUMENT_TONE.green.chip,
            )}
          >
            {checklist.blocks !== undefined
              ? `Blocks ${gateName(checklist.blocks)}`
              : "Nothing blocked"}
          </span>
        </div>
        <DocumentProgress
          verified={checklist.verified}
          required={checklist.required}
          className="max-w-sm"
        />
      </header>
      <Separator className="h-0.5" />
      <DocumentGroup
        title="Required now"
        hint="Upload each paper, then verify it."
      >
        {groups.required.length > 0 ? (
          <ul className="flex flex-col gap-2">{groups.required.map(item)}</ul>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            No papers are required at this stage.
          </p>
        )}
      </DocumentGroup>
      {groups.upcoming.length > 0 && (
        <DocumentGroup
          title="Needed later"
          hint="Not required yet; they can be filed early."
        >
          <ul className="flex flex-col gap-2">{groups.upcoming.map(item)}</ul>
        </DocumentGroup>
      )}
      {groups.extra.length > 0 && (
        <DocumentGroup
          title="Other filed papers"
          hint="Filed on this shipment, but not on its checklist."
        >
          <ul className="flex flex-col gap-2">{groups.extra.map(item)}</ul>
        </DocumentGroup>
      )}
      <AttachmentPreviewDialog {...dialogProps} />
    </section>
  );
}

function DocumentGroup({
  title,
  hint,
  children,
}: {
  title: string;
  /** What the group is for, beside its title. */
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
        {title}
        <span className="text-xs font-normal text-muted-foreground">
          {hint}
        </span>
      </h3>
      {children}
    </div>
  );
}

/** One paper: its status, its file, why it's needed, its next step, and the rest in a menu. */
function DocumentItem(props: ItemProps) {
  const { document, shipmentId, data, onPreview } = props;
  const { members, isSaving, onUpload, onRemove } = data;
  const inputRef = useRef<HTMLInputElement>(null);
  const [rejecting, setRejecting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [history, setHistory] = useState(false);
  const [dragging, setDragging] = useState(false);
  const isOther = document.docType === "other";
  const hasFile = !!document.file;
  const canVerify = document.status === "uploaded" && !isOther;
  const canReject =
    (document.status === "uploaded" || document.status === "verified") &&
    !isOther;
  const status = document.expired
    ? "Expired"
    : labelOf(DOCUMENT_STATUSES, document.status);

  const upload = useCallback(
    async (file: File) => {
      if (!checkSize(file)) return;
      const done = await attempt("Couldn't upload the file", () =>
        onUpload(shipmentId, document.docType, file),
      );
      if (done)
        toast.success(
          hasFile ? `${document.title} replaced` : `${document.title} uploaded`,
          { description: file.name },
        );
    },
    [onUpload, shipmentId, document.docType, document.title, hasFile],
  );

  // Every part falls back to plain words, so a missing date, reason or step never shows as a blank or "undefined"
  const expiresOn = nonEmpty(stamp(document.expiresAt));
  const requiredFrom = nonEmpty(stepLabel(document.requiredAtStep));
  const rejectReason = nonEmpty(document.rejectReason?.trim());
  const gate =
    document.blocks !== undefined ? gateName(document.blocks) : undefined;
  // The quiet line under the title: who verified it, which file it is, or how to add one
  const subtitle =
    document.status === "verified" && !document.expired
      ? [
          nonEmpty(document.verifiedBy) !== undefined
            ? `Verified by ${actorName(members, document.verifiedBy)}`
            : "Verified",
          expiresOn !== undefined && `valid until ${expiresOn}`,
        ]
          .filter(Boolean)
          .join(" · ")
      : document.status === "rejected"
        ? "Drop a corrected file on the box, or click it"
        : hasFile
          ? (document.file?.name ?? "")
          : document.upcoming
            ? `${requiredFrom !== undefined ? `Needed from ${requiredFrom}` : "Needed at a later stage"} · drop a file to file it early`
            : "Not uploaded yet · drop a file on the box, or click it";
  // The strip along the bottom: only when someone has to act, or the paper is waiting on a check
  const banner: { tone: BannerTone; text: string } | undefined =
    document.expired
      ? {
          tone: "action",
          text: `${expiresOn !== undefined ? `Expired ${expiresOn}` : "Expired"}. Upload a current one.`,
        }
      : document.status === "rejected"
        ? {
            tone: "action",
            text:
              rejectReason !== undefined
                ? `Rejected: ${rejectReason}`
                : "Rejected, no reason given. Upload a corrected file.",
          }
        : canVerify
          ? {
              tone: "info",
              text:
                gate !== undefined
                  ? `Verify this file to unblock ${gate}.`
                  : "Waiting to be verified.",
            }
          : document.status === "missing" &&
              document.required &&
              gate !== undefined
            ? { tone: "action", text: `Missing. It blocks ${gate}.` }
            : undefined;
  const uploadedOn = nonEmpty(stamp(document.updatedAt));
  const verifiedOn = nonEmpty(stamp(document.verifiedAt));
  const condition = nonEmpty(conditionText(document.when));
  const fullDetail = [
    condition !== undefined &&
      (condition === "Always" ? "Always needed" : `Needed when ${condition}`),
    hasFile &&
      [
        SOURCE_LABEL[document.source ?? "upload"],
        uploadedOn,
        document.version > 1 && `file ${document.version}`,
      ]
        .filter(Boolean)
        .join(" · "),
    document.status === "verified" &&
      verifiedOn !== undefined &&
      `Verified ${verifiedOn}`,
  ]
    .filter(Boolean)
    .join("\n");
  const needsFile = !hasFile || document.status === "rejected";
  const canReplace = hasFile && document.status !== "rejected";
  const hasHistory = document.objId != null && document.objId !== "";
  const hasMenu = canReplace || hasFile || canReject || hasHistory;
  const pick = () => inputRef.current?.click();

  return (
    <li
      // A paper that needs a file takes one dropped anywhere on its card
      onDragOver={(event) => {
        if (!needsFile || isSaving) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        if (!needsFile) return;
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) void upload(file);
      }}
      className={cn(
        "rounded-xl border",
        // With a note, the paper sits as a white card inside a tinted frame and the note runs along the frame's bottom
        banner ? cn("p-1", BANNER_TONE[banner.tone].card) : "bg-background",
      )}
    >
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 p-3",
            banner && "rounded-lg bg-background shadow-xs",
          )}
        >
          {/* The paper itself: its file to preview, or the box to drop or pick one */}
          {document.file && !needsFile ? (
            <button
              type="button"
              onClick={() => document.file && onPreview(document.file)}
              aria-label={`Preview ${document.file.name}`}
              title={document.file.name}
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-muted/40 transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <AttachmentThumbnail
                attachment={document.file}
                className="size-full object-cover"
              />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSaving}
              onClick={pick}
              aria-label={`Upload ${document.title}`}
              title="Drop a file here, or click to pick one"
              className={cn(
                "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:bg-primary-10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
                dragging && "border-primary bg-primary-10 text-primary",
              )}
            >
              <Upload className="size-4" />
            </button>
          )}
          <div className="flex min-w-48 flex-1 basis-48 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-2 w-fit">
              <span
                title={nonEmpty(fullDetail)}
                className="truncate text-sm font-semibold"
              >
                {document.title}
              </span>
              {!isOther && (
                <span
                  className={cn(
                    CHIP_CLASS,
                    "shrink-0 py-0.5",
                    document.expired
                      ? DOCUMENT_TONE.orange.chip
                      : STATUS_CLASS[document.status],
                  )}
                >
                  {status}
                </span>
              )}
            </div>
            {subtitle !== "" && (
              <p className="min-w-0 truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          {hasMenu && (
            <div className="ml-auto flex items-center gap-2">
              {canReplace && (
                <Button
                  variant="outline"
                  size="xs"
                  startIcon={<Upload size={13} />}
                  disabled={isSaving}
                  title="Upload a new file in place of this one"
                  onClick={pick}
                >
                  Replace
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    aria-label={`More for ${document.title}`}
                  >
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canReject && (
                    <DropdownMenuItem onSelect={() => setRejecting(true)}>
                      <X />
                      Reject…
                    </DropdownMenuItem>
                  )}
                  {hasHistory && (
                    <DropdownMenuItem onSelect={() => setHistory(true)}>
                      <History />
                      History
                    </DropdownMenuItem>
                  )}
                  {hasFile && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={isSaving}
                        onSelect={() => setRemoving(true)}
                      >
                        <Trash2 />
                        Remove file
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* The note, with the file's check and verify on the same line; on a narrow card the text wraps and they drop below, kept right */}
      {banner && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 pt-2 pb-1.5 text-xs font-medium",
            BANNER_TONE[banner.tone].strip,
          )}
        >
          <p className="flex min-w-0 flex-1 basis-48 items-start gap-2">
            {banner.tone === "action" ? (
              <CircleAlert className="mt-px size-3.5 shrink-0" />
            ) : (
              <Info className="mt-px size-3.5 shrink-0" />
            )}
            <span className="min-w-0">{banner.text}</span>
          </p>
          {/* Checking with AI only helps before verifying, so it sits here rather than on every paper */}
          {canVerify && (
            <div className="ml-auto flex min-w-0 items-center gap-2">
              {document.file && canReview(document.file) && (
                <DocumentReviewButton
                  shipmentId={shipmentId}
                  file={document.file}
                  onReview={data.onReview}
                />
              )}
              <VerifyButton {...props} />
            </div>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />
      <ConfirmDeleteDialog
        open={removing}
        onOpenChange={setRemoving}
        title={`Remove the ${document.title.toLowerCase()} file?`}
        description={`${document.file?.name ?? "The file"} comes off this document and out of the shipment's attachments. The document goes back to missing; the file stays in its history.`}
        confirmLabel="Remove file"
        successMessage={`${document.title} file removed`}
        onConfirm={() => onRemove(document)}
      />
      <RejectDialog
        open={rejecting}
        onOpenChange={setRejecting}
        document={document}
        data={data}
      />
      <HistoryDialog
        open={history}
        onOpenChange={setHistory}
        document={document}
        members={members}
        getActivity={props.getActivity}
        onPreview={onPreview}
      />
    </li>
  );
}

/** Verifies the current version once confirmed. */
function VerifyButton({ document, data }: ItemProps) {
  const { onVerify, isSaving } = data;
  const [open, setOpen] = useState(false);
  const gate =
    document.blocks !== undefined ? gateName(document.blocks) : undefined;
  return (
    <>
      <Button
        variant="default"
        size="xs"
        startIcon={<Check size={13} />}
        disabled={isSaving}
        onClick={() => setOpen(true)}
      >
        Verify
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Verify the ${document.title.toLowerCase()}?`}
        description={`${document.file?.name ?? "This file"} counts as the shipment's ${document.title.toLowerCase()}${gate !== undefined ? `, and ${gate} can go ahead` : ""}. Reject it later if it turns out wrong.`}
        confirmLabel="Verify"
        confirmIcon={<Check size={13} />}
        successMessage={`${document.title} verified`}
        errorMessage="Couldn't verify the document"
        onConfirm={() => onVerify(document)}
      />
    </>
  );
}

function RejectDialog({
  open,
  onOpenChange,
  document,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: IShipmentDocument;
  data: DocumentData;
}) {
  const { onReject, isSaving } = data;
  const [reason, setReason] = useState("");
  const reject = useCallback(async () => {
    const done = await attempt("Couldn't reject the document", () =>
      onReject(document, reason.trim()),
    );
    if (done) {
      setReason("");
      onOpenChange(false);
    }
  }, [onReject, document, reason, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject {document.title?.toLowerCase()}</DialogTitle>
          <DialogDescription>
            The current file stops counting. Upload a corrected file to verify
            it again.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          aria-label="Reason"
          placeholder="Why, e.g. wrong consignee"
          value={reason}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && reason.trim() !== "") void reject();
          }}
        />
        <DialogFooter>
          <Button
            variant="outline"
            size="xs"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="xs"
            disabled={reason.trim() === ""}
            isLoading={isSaving}
            onClick={() => void reject()}
          >
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Every version, verify and reject of a document, newest first, with who did it. */
function HistoryDialog({
  open,
  onOpenChange,
  document,
  members,
  getActivity,
  onPreview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: IShipmentDocument;
  members: IUserInfo[];
  getActivity: DocumentApi["getDocumentActivity"];
  onPreview: (file: IAttachment) => void;
}) {
  const activity = useDocumentActivity(
    getActivity,
    open ? document.objId : undefined,
  );
  const entries = useMemo(
    () => [...activity.entries].reverse(),
    [activity.entries],
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80dvh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{document.title} history</DialogTitle>
          <DialogDescription>
            Only the latest file counts; earlier ones stay here.
          </DialogDescription>
        </DialogHeader>
        <QueryWrapper
          isLoading={activity.isLoading}
          error={activity.error}
          onRetry={activity.onRetry}
          renderLoader={
            <div
              className="flex flex-col gap-2"
              aria-busy
              aria-label="Loading history"
            >
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-12 rounded-lg" />
              ))}
            </div>
          }
        >
          {entries.length > 0 ? (
            <ol className="flex min-h-0 flex-col gap-3 overflow-y-auto">
              {entries.map((entry) => (
                <li
                  key={entry.objId}
                  className="flex flex-col gap-1 border-l-2 pl-3"
                >
                  <span className="text-sm">{entry.body}</span>
                  {entry.file && (
                    <AttachmentChip
                      attachment={entry.file}
                      onOpen={() => entry.file && onPreview(entry.file)}
                    />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {actorName(members, entry.actorId)} ·{" "}
                    {stamp(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing filed yet.</p>
          )}
        </QueryWrapper>
      </DialogContent>
    </Dialog>
  );
}
