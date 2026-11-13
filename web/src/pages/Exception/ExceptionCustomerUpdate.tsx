import { useState, type ReactNode } from "react";
import { Copy, Mail, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  cn,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@moduleleague/ui";
import { Spinner } from "@/components/ui/spinner";
import { attempt } from "@/lib/toastHelper";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import { ExceptionStep } from "./ExceptionStep";
import type { ExceptionData } from "./useExceptionData";

const LANGUAGES: { value: ICustomerUpdateLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ms", label: "Bahasa Melayu" },
  { value: "zh", label: "中文" },
];

interface ExceptionCustomerUpdateProps {
  exception: IException;
  onDraft: ExceptionData["onDraftCustomerUpdate"];
  onLog: ExceptionData["onLog"];
}

/**
 * Has the AI draft an email and a WhatsApp message to the customer about the exception, from what the customer may see. The
 * person edits it, sends it from their own email or chat, then logs it on the timeline; nothing is sent from here. Each draft is
 * a paid call, so it stays until "Draft again". Key it by the exception so a new one starts empty.
 */
export function ExceptionCustomerUpdate({
  exception,
  onDraft,
  onLog,
}: ExceptionCustomerUpdateProps) {
  const [language, setLanguage] = useState<ICustomerUpdateLanguage>("en");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [shortMessage, setShortMessage] = useState("");
  const [isLogged, setIsLogged] = useState(false);
  const {
    mutateAsync,
    data: draft,
    isPending,
  } = useMutation({
    mutationFn: () => onDraft(exception.objId, { language }),
  });
  const run = () =>
    attempt("Couldn't draft the message", async () => {
      const drafted = await mutateAsync();
      setSubject(drafted.subject);
      setMessage(drafted.message);
      setShortMessage(drafted.shortMessage);
      setIsLogged(false);
    });
  const { mutateAsync: log, isPending: isLogging } = useMutation({
    mutationFn: (body: string) => onLog(exception, "action", body),
  });
  const logSent = () =>
    attempt("Couldn't log it", async () => {
      await log(`Sent the customer an update: ${subject}`);
      setIsLogged(true);
    });
  const copy = (text: string, what: string) =>
    attempt("Couldn't copy it", async () => {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied`);
    });
  const email = draft?.recipientEmail ?? "";
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

  return (
    <ExceptionStep
      title="Tell the customer"
      hint={
        draft
          ? undefined
          : "The AI drafts an email and a WhatsApp message from what the customer may see. You check it and send it yourself."
      }
      actions={
        <>
          <Select
            value={language}
            onValueChange={(value) =>
              setLanguage(value as ICustomerUpdateLanguage)
            }
          >
            <SelectTrigger className="h-7 w-36 text-xs" aria-label="Language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {LANGUAGES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="xs"
            variant="outline"
            startIcon={
              isPending ? (
                <Spinner className="size-3.5" />
              ) : (
                <Sparkles size={13} />
              )
            }
            disabled={isPending}
            onClick={() => void run()}
          >
            {isPending ? "Drafting…" : draft ? "Draft again" : "Draft message"}
          </Button>
        </>
      }
    >
      {draft && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            To:{" "}
            {draft.recipientName != null || email !== "" ? (
              <span className="font-medium text-foreground">
                {draft.recipientName}
                {email !== "" && ` <${email}>`}
              </span>
            ) : (
              "the customer isn't known. Pick the Bill To and the party's email field in Billing settings."
            )}
          </p>

          {draft.checks?.length > 0 && (
            <div
              className={cn(
                "flex flex-col gap-1 rounded-md border px-3 py-2 text-sm",
                TONE_CLASS.amber,
              )}
            >
              <span className="font-medium">Before you send</span>
              <ul className="list-disc pl-5">
                {draft.checks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </div>
          )}

          {draft.slots?.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Offers {draft.slots.join(" · ")}, from the receiver's opening
              time.
            </p>
          )}

          <UpdatePart
            title="Email"
            actions={
              <>
                <Button
                  size="xs"
                  variant="outline"
                  startIcon={<Copy size={13} />}
                  onClick={() => void copy(`${subject}\n\n${message}`, "Email")}
                >
                  Copy
                </Button>
                {/* Opens the person's own mail app with the draft; nothing is sent from here */}
                <Button
                  size="xs"
                  variant="outline"
                  startIcon={<Mail size={13} />}
                  onClick={() => window.open(mailto, "_self")}
                >
                  Open in email
                </Button>
              </>
            }
          >
            <Input
              aria-label="Subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="h-8 text-sm"
            />
            <Textarea
              aria-label="Email message"
              rows={8}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="text-sm"
            />
          </UpdatePart>

          <UpdatePart
            title="WhatsApp or SMS"
            actions={
              <Button
                size="xs"
                variant="outline"
                startIcon={<Copy size={13} />}
                onClick={() => void copy(shortMessage, "Message")}
              >
                Copy
              </Button>
            }
          >
            <Textarea
              aria-label="Short message"
              rows={3}
              value={shortMessage}
              onChange={(event) => setShortMessage(event.target.value)}
              className="text-sm"
            />
          </UpdatePart>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
            <span className="text-[11px] text-muted-foreground">
              Drafted by {draft.usage?.model} · check before sending ·{" "}
              {(
                (draft.usage?.inputTokens ?? 0) +
                (draft.usage?.outputTokens ?? 0)
              ).toLocaleString()}{" "}
              tokens
            </span>
            <Button
              size="xs"
              variant="outline"
              disabled={isLogged || isLogging || subject.trim() === ""}
              title="Adds “Sent the customer an update” to the activity"
              onClick={() => void logSent()}
            >
              {isLogged ? "Logged" : isLogging ? "Logging…" : "Log as sent"}
            </Button>
          </div>
        </div>
      )}
    </ExceptionStep>
  );
}

function UpdatePart({
  title,
  actions,
  children,
}: {
  title: string;
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h4>
        <div className="flex items-center gap-1">{actions}</div>
      </div>
      {children}
    </div>
  );
}
