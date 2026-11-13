import { useCallback, useState, type ReactNode } from "react";
import { Copy, MailPlus, Sparkles } from "lucide-react";
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
  Textarea,
  toast,
} from "@moduleleague/ui";
import { Spinner } from "@/components/ui/spinner";
import { RecordAttachmentInput } from "@/components/custom/RecordAttachmentInput";
import { parseAttachments } from "@/lib/attachmentHelper";
import { attempt } from "@/lib/toastHelper";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import { ModuleNewRecord } from "@/module/record/ModuleNewRecord";
import type { ModuleData } from "@/module/page/modulePage.types";
import { readBooking } from "@/services/bookings/booking.api";

interface ShipmentBookingIntakeProps {
  data: ModuleData;
}

/**
 * "New from booking": the person pastes a booking email and attaches its purchase order, the AI reads them into shipment values,
 * and the person checks them in the New record form before anything is created. Parties and places that aren't on file are only
 * listed, never added. Each read is a paid call, so the result stays until "Read again".
 */
export function ShipmentBookingIntake({ data }: ShipmentBookingIntakeProps) {
  const [open, setOpen] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [files, setFiles] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<{
    key: number;
    values: ISidebarRecordValues;
  }>();
  const [createOpen, setCreateOpen] = useState(false);
  const {
    mutateAsync,
    data: intake,
    isPending,
    reset,
  } = useMutation({
    mutationFn: () =>
      readBooking({
        emailText: emailText.trim(),
        attachmentIds: parseAttachments(files).map((file) => file.id),
      }),
  });
  const read = () =>
    attempt("Couldn't read the booking", async () => {
      const result = await mutateAsync();
      setSubject(result.reply?.subject ?? "");
      setMessage(result.reply?.message ?? "");
    });
  const copyReply = () =>
    attempt("Couldn't copy it", async () => {
      await navigator.clipboard.writeText(`${subject}\n\n${message}`);
      toast.success("Reply copied");
    });

  // The booking's files go on the shipment's first attachment field, so the PO stays with the record
  const review = () => {
    if (!intake) return;
    const attachmentField = data.fields.find(
      (field) => field.type === "attachment",
    );
    setDraft({
      key: Date.now(),
      values: {
        ...intake.values,
        ...(attachmentField &&
          files !== "" && { [attachmentField.objId]: files }),
      },
    });
    setOpen(false);
    data.onRefreshFields();
    setCreateOpen(true);
  };
  const onAddRecord = data.onAddRecord;
  const save = useCallback(
    async (values: ISidebarRecordValues) => {
      await onAddRecord(values);
      toast.success("Shipment added");
      setEmailText("");
      setFiles("");
      reset();
    },
    [onAddRecord, reset],
  );
  const canRead = emailText.trim() !== "" || files !== "";

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        startIcon={<MailPlus size={14} />}
        onClick={() => setOpen(true)}
      >
        New from booking
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New shipment from a booking</DialogTitle>
            <DialogDescription>
              {intake
                ? "Check what the AI read. You'll see every value in the form before the shipment is created."
                : "Paste the customer's email and attach their PO or booking form. The AI fills what they state and lists what's missing."}
            </DialogDescription>
          </DialogHeader>

          <div className="-mx-6 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6">
            {intake ? (
              <IntakeResult
                intake={intake}
                subject={subject}
                message={message}
                onSubjectChange={setSubject}
                onMessageChange={setMessage}
                onCopy={() => void copyReply()}
              />
            ) : (
              <>
                <Textarea
                  autoFocus
                  aria-label="Booking email"
                  placeholder="Paste the booking email here"
                  rows={10}
                  value={emailText}
                  onChange={(event) => setEmailText(event.target.value)}
                  className="text-sm"
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    PO or booking form: PDF, JPG or PNG, up to 5 files
                  </span>
                  <RecordAttachmentInput
                    value={files}
                    onChange={setFiles}
                    onUpload={data.onUploadAttachment}
                    disabled={isPending}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="items-center gap-2 sm:justify-between">
            <span className="text-[11px] text-muted-foreground">
              {intake &&
                `Read by ${intake.usage?.model} · ${(
                  (intake.usage?.inputTokens ?? 0) +
                  (intake.usage?.outputTokens ?? 0)
                ).toLocaleString()} tokens`}
            </span>
            <div className="flex gap-2">
              {intake ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => reset()}>
                    Back to the email
                  </Button>
                  <Button size="sm" onClick={review}>
                    Review and create
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    startIcon={
                      isPending ? (
                        <Spinner className="size-3.5" />
                      ) : (
                        <Sparkles size={14} />
                      )
                    }
                    disabled={!canRead || isPending}
                    onClick={() => void read()}
                  >
                    {isPending ? "Reading…" : "Read with AI"}
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModuleNewRecord
        key={draft?.key}
        {...data.fieldsState}
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New shipment from booking"
        description="Filled from the booking. Check each value, add what's missing, then add the record."
        fields={data.fields}
        members={data.members}
        initialValues={draft?.values}
        onUploadAttachment={data.onUploadAttachment}
        onSave={save}
      />
    </>
  );
}

interface IntakeResultProps {
  intake: IBookingIntake;
  subject: string;
  message: string;
  onSubjectChange: (subject: string) => void;
  onMessageChange: (message: string) => void;
  onCopy: () => void;
}

function IntakeResult({
  intake,
  subject,
  message,
  onSubjectChange,
  onMessageChange,
  onCopy,
}: IntakeResultProps) {
  return (
    <>
      {intake.summary !== "" && <p className="text-sm">{intake.summary}</p>}

      {intake.checks?.length > 0 && (
        <Callout title="Before you create" tone="amber">
          <ul className="list-disc pl-5">
            {intake.checks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
        </Callout>
      )}

      {intake.notOnFile?.length > 0 && (
        <Callout title="Not on file">
          <ul className="list-disc pl-5">
            {intake.notOnFile.map((item) => (
              <li key={`${item.field}-${item.text}`}>
                <span className="font-medium">{item.field}:</span> {item.text}
              </li>
            ))}
          </ul>
          <span className="text-xs">
            Nothing was added. Add them from the link field in the next step, or
            ask the customer to confirm them.
          </span>
        </Callout>
      )}

      <Part title={`Filled (${intake.rows?.length ?? 0})`}>
        {intake.rows?.length > 0 ? (
          <dl className="grid grid-cols-[minmax(7rem,auto)_1fr_auto] gap-x-4 gap-y-1.5 text-sm">
            {intake.rows.map((row) => (
              <div key={row.fieldId} className="contents">
                <dt className="text-muted-foreground">{row.name}</dt>
                <dd className="min-w-0 break-words whitespace-pre-line">
                  {row.text}
                </dd>
                <dd className="text-right text-xs text-muted-foreground">
                  {row.source}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            The booking didn't state any field's value.
          </p>
        )}
      </Part>

      {intake.missing?.length > 0 && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Left empty:</span>{" "}
          {intake.missing.join(", ")}
        </p>
      )}

      <Part
        title="Reply to the customer"
        actions={
          <Button
            size="xs"
            variant="outline"
            startIcon={<Copy size={13} />}
            onClick={onCopy}
          >
            Copy
          </Button>
        }
      >
        <Input
          aria-label="Reply subject"
          value={subject}
          onChange={(event) => onSubjectChange(event.target.value)}
          className="h-8 text-sm"
        />
        <Textarea
          aria-label="Reply message"
          rows={7}
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          className="text-sm"
        />
      </Part>
    </>
  );
}

function Callout({
  title,
  tone,
  children,
}: {
  title: string;
  /** Left out for a plain, neutral box. */
  tone?: keyof typeof TONE_CLASS;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-md border px-3 py-2 text-sm",
        tone === undefined ? "bg-muted/40" : TONE_CLASS[tone],
      )}
    >
      <span className="font-medium">{title}</span>
      {children}
    </div>
  );
}

function Part({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h4>
        {actions}
      </div>
      {children}
    </div>
  );
}
