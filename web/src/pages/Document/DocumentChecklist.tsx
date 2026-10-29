import { useCallback, useMemo, useRef, useState } from "react";
import {
  Check,
  FileText,
  History,
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
  DropdownMenuTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
} from "@moduleleague/ui";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { attempt } from "@/lib/toastHelper";
import { QueryWrapper } from "@/components/custom/QueryWrapper";
import { AttachmentChip } from "@/components/custom/AttachmentChip";
import { ConfirmDeleteDialog } from "@/components/custom/ConfirmDeleteDialog";
import { AttachmentPreviewDialog } from "@/components/custom/AttachmentPreviewDialog";
import { useAttachmentPreview } from "@/hooks/useAttachmentPreview";
import {
  tableFields,
  TONE_CLASS,
} from "@/module/dashboard/moduleDashboard.utils";
import { actorName } from "@/services/user/current.user";
import { CHIP_CLASS } from "../Exception/ExceptionList";
import { labelOf, stamp } from "../Exception/exception.utils";
import { DocumentReviewButton } from "./DocumentReviewButton";
import {
  canReview,
  checkSize,
  DOCUMENT_STATUSES,
  gateName,
  groupDocuments,
  reasonText,
  SOURCE_LABEL,
  STATUS_CLASS,
  stepLabel,
  TILE_CLASS,
  type DocumentRow,
} from "./document.utils";
import {
  useDocumentActivity,
  type DocumentApi,
  type DocumentData,
} from "./useDocumentData";

const ACCEPT = "application/pdf,image/png,image/jpeg";

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
    <section className="flex flex-col gap-4 rounded-xl border bg-background p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-base font-semibold">
            {shipment.title} checklist
          </h2>
          <p className="text-xs text-muted-foreground">
            {reasonText(checklist, names.mode, names.incoterm)}{" "}
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
              ? TONE_CLASS.amber
              : TONE_CLASS.green,
          )}
        >
          {checklist.blocks !== undefined
            ? `Blocks ${gateName(checklist.blocks)}`
            : "Nothing blocked"}
        </span>
      </header>
      {groups.required.length > 0 ? (
        <ul className="flex flex-col divide-y rounded-lg border">
          {groups.required.map(item)}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No papers are required at this stage.
        </p>
      )}
      {groups.upcoming.length > 0 && (
        <DocumentGroup title="Needed later">
          {groups.upcoming.map(item)}
        </DocumentGroup>
      )}
      {groups.extra.length > 0 && (
        <DocumentGroup title="Other filed papers">
          {groups.extra.map(item)}
        </DocumentGroup>
      )}
      <AttachmentPreviewDialog {...dialogProps} />
    </section>
  );
}

function DocumentGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <ul className="flex flex-col divide-y rounded-lg border">{children}</ul>
    </div>
  );
}

/** One paper: its tile, why it's needed and its file, its status, and what can be done with it now. */
function DocumentItem(props: ItemProps) {
  const { document, shipmentId, data, onPreview } = props;
  const { members, isSaving, onUpload, onRemove } = data;
  const inputRef = useRef<HTMLInputElement>(null);
  const [rejecting, setRejecting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [history, setHistory] = useState(false);
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
    (file: File) =>
      checkSize(file) &&
      attempt("Couldn't upload the file", () =>
        onUpload(shipmentId, document.docType, file),
      ),
    [onUpload, shipmentId, document.docType],
  );

  const detail = [
    document.when ?? (isOther ? "Classified as Other" : "Not required now"),
    document.upcoming && `needed from ${stepLabel(document.requiredAtStep)}`,
    document.blocks !== undefined && `gates ${gateName(document?.blocks)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const state =
    document.status === "verified"
      ? [
          `Verified by ${actorName(members, document.verifiedBy)} · ${stamp(document.verifiedAt)}`,
          document.expiresAt != null &&
            document.expiresAt !== "" &&
            `valid until ${stamp(document.expiresAt)}`,
        ]
          .filter(Boolean)
          .join(" · ")
      : document.status === "rejected"
        ? `Rejected: ${document.rejectReason}`
        : hasFile
          ? `Version ${document.version} · ${SOURCE_LABEL[document.source ?? "upload"]} · ${stamp(document.updatedAt)}`
          : "";

  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <span
        aria-hidden
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          TILE_CLASS[document.expired ? "missing" : document.status],
        )}
      >
        <FileText className="size-4" />
      </span>
      <span className="flex min-w-48 flex-1 basis-48 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{document.title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {detail} ·{" "}
          {document.file ? (
            <button
              type="button"
              onClick={() => document.file && onPreview(document.file)}
              className="cursor-pointer underline-offset-2 hover:text-foreground hover:underline"
            >
              {document.file?.name}
            </button>
          ) : (
            "No file yet"
          )}
        </span>
        {state !== "" && (
          <span
            className={cn(
              "truncate text-xs",
              document.status === "rejected"
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground",
            )}
          >
            {state}
          </span>
        )}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-2">
        {!isOther && (
          <span
            className={cn(
              CHIP_CLASS,
              "py-0.5",
              document.expired ? TONE_CLASS.red : STATUS_CLASS[document.status],
            )}
          >
            {status}
          </span>
        )}
        {document.file && canReview(document.file) && (
          <DocumentReviewButton
            shipmentId={shipmentId}
            file={document.file}
            onReview={data.onReview}
          />
        )}
        {canVerify && <VerifyButton {...props} />}
        {(!hasFile || document.status === "rejected") && (
          <Button
            variant="outline"
            size="sm"
            startIcon={<Upload size={14} />}
            disabled={isSaving}
            onClick={() => inputRef.current?.click()}
          >
            Upload
          </Button>
        )}
        {hasFile && document.status !== "rejected" && (
          <Button
            variant="outline"
            size="sm"
            startIcon={<Upload size={14} />}
            disabled={isSaving}
            title="Upload a new file in place of this one"
            onClick={() => inputRef.current?.click()}
          >
            Replace
          </Button>
        )}
        {hasFile && (
          <Button
            variant="outline"
            size="sm"
            startIcon={<Trash2 size={14} />}
            disabled={isSaving}
            title="Take the file off; the document goes back to missing"
            onClick={() => setRemoving(true)}
          >
            Remove
          </Button>
        )}
        {document.version > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`More for ${document.title}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canReject && (
                <DropdownMenuItem onSelect={() => setRejecting(true)}>
                  <X />
                  Reject…
                </DropdownMenuItem>
              )}
              {document.objId != null && document.objId !== "" && (
                <DropdownMenuItem onSelect={() => setHistory(true)}>
                  <History />
                  History
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </span>
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

/** Verifies the current version; papers that expire ask until when they're valid. */
function VerifyButton({ document, data }: ItemProps) {
  const { onVerify, isSaving } = data;
  const [open, setOpen] = useState(false);
  const [until, setUntil] = useState<Date>();
  const verify = useCallback(
    async (expiresAt?: Date) => {
      const done = await attempt("Couldn't verify the document", () =>
        onVerify(document, expiresAt),
      );
      if (done) setOpen(false);
    },
    [onVerify, document],
  );
  const button = (
    <Button
      size="sm"
      startIcon={<Check size={14} />}
      disabled={isSaving}
      onClick={document.expires ? undefined : () => void verify()}
    >
      Verify
    </Button>
  );
  if (!document.expires) return button;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent align="end" className="flex w-72 flex-col gap-3 p-3">
        <span className="text-sm font-medium">Valid until</span>
        <DateTimePicker granularity="day" value={until} onChange={setUntil} />
        <Button
          size="sm"
          className="self-end"
          disabled={!until}
          isLoading={isSaving}
          onClick={() => void verify(until)}
        >
          Verify
        </Button>
      </PopoverContent>
    </Popover>
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
            Version {document.version} stops counting. Upload a corrected
            version to verify it again.
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
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
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
            Only the current version counts; older ones stay here.
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
