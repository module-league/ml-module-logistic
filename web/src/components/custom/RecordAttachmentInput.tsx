import { useCallback, useMemo, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Tag, Trash2Icon, Upload, UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/sonner";
import { errorParser } from "@/hooks/useErrorParser";
import { ATTACHMENT_MAX_BYTES } from "@/services/attachments/attachment.api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  attachmentOption,
  bytesToKilobytes,
  formatFileSize,
  parseAttachments,
  toAttachmentValue,
} from "@/lib/attachmentHelper";
import { useAttachmentPreview } from "@/hooks/useAttachmentPreview";
import { AttachmentPreviewDialog } from "./AttachmentPreviewDialog";
import { AttachmentThumbnail } from "./AttachmentThumbnail";
import { SelectionNode } from "./RecordValueNode";
import type {
  AttachmentCardProps,
  AttachmentLabelSelectProps,
  AttachmentTextLabelProps,
  RecordAttachmentInputProps,
} from "./RecordAttachmentInput.types";
import { Button } from "@/ui-kit";
import { nonEmpty } from "@/lib/stringHelper";

type PendingUpload = Pick<IAttachment, "name" | "fileSize"> & { key: string };

/** Radix Select can't hold an empty value, so "No label" is this. */
const NO_LABEL = "__none";

/**
 * Files for an attachment field: drop anywhere on it, or use Attach File / the empty box, to upload; open one in the
 * viewer, or remove it. Uploading stays off while a batch uploads, so two batches can't overwrite each other's result.
 */
export function RecordAttachmentInput({
  id,
  value,
  disabled,
  className,
  style,
  onChange,
  onBlur,
  onUpload,
  options,
  trigger = "dropzone",
  cardSize = "default",
  labelMode = "options",
  labelSuggestions,
  removable = true,
}: RecordAttachmentInputProps) {
  const attachments = useMemo(() => parseAttachments(value), [value]);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const { openPreview, dialogProps } = useAttachmentPreview();

  const upload = useCallback(
    async (files: File[]) => {
      if (!onUpload || files.length === 0) return;
      setPending(
        files.map((file) => ({
          key: window.crypto.randomUUID(),
          name: file.name,
          fileSize: bytesToKilobytes(file.size),
        })),
      );
      const results = await Promise.allSettled(
        files.map((file) => onUpload(file)),
      );
      setPending([]);
      const uploaded = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      const failed = results.flatMap((result, index) =>
        result.status === "rejected"
          ? [{ name: files[index]?.name, reason: result.reason as unknown }]
          : [],
      );
      if (failed.length > 0) {
        toast.error(
          `Couldn't upload ${failed.map(({ name }) => name).join(", ")}`,
          { description: errorParser(failed[0]?.reason)?.message },
        );
      }
      if (uploaded.length > 0) {
        onChange?.(toAttachmentValue([...attachments, ...uploaded]));
      }
      onBlur?.();
    },
    [onUpload, onChange, onBlur, attachments],
  );
  const reject = useCallback((rejections: FileRejection[]) => {
    const tooLarge = rejections.filter(({ errors }) =>
      errors.some((error) => error.code === "file-too-large"),
    );
    toast.error(
      tooLarge.length > 0
        ? `Files can be up to ${formatFileSize(bytesToKilobytes(ATTACHMENT_MAX_BYTES))}`
        : "Couldn't add these files",
      {
        description: rejections.map(({ file }) => file.name).join(", "),
      },
    );
  }, []);
  const remove = useCallback(
    (attachmentId: string) => {
      onChange?.(
        toAttachmentValue(
          attachments.filter((attachment) => attachment.id !== attachmentId),
        ),
      );
      onBlur?.();
    },
    [attachments, onChange, onBlur],
  );

  const label = useCallback(
    (
      attachmentId: string,
      patch: Pick<IAttachment, "optionId"> | Pick<IAttachment, "label">,
    ) => {
      onChange?.(
        toAttachmentValue(
          attachments.map((attachment) =>
            attachment.id === attachmentId
              ? { ...attachment, ...patch }
              : attachment,
          ),
        ),
      );
      onBlur?.();
    },
    [attachments, onChange, onBlur],
  );

  const uploading = pending.length > 0;
  const canUpload = !!onUpload && disabled !== true;
  const hasFiles = attachments.length > 0 || uploading;
  const compact = cardSize === "compact";
  const maxSizeLabel = formatFileSize(bytesToKilobytes(ATTACHMENT_MAX_BYTES));
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDropAccepted: (files) => void upload(files),
    onDropRejected: reject,
    maxSize: ATTACHMENT_MAX_BYTES,
    disabled: !canUpload || uploading,
    noClick: true,
    noKeyboard: true,
  });

  return (
    <>
      <div
        {...getRootProps({
          className: cn(
            "relative flex min-w-0 flex-col gap-2",
            isDragActive && "min-h-20",
            className,
          ),
          style,
        })}
      >
        <input {...getInputProps({ id })} />
        {canUpload &&
          (hasFiles || trigger === "button" ? (
            <Button
              variant="outline"
              size="xs"
              startIcon={<UploadIcon size={13} />}
              disabled={uploading}
              onClick={open}
              className="w-fit"
            >
              {uploading ? "Uploading…" : "Attach File"}
            </Button>
          ) : (
            <button
              type="button"
              onClick={open}
              className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed px-3 py-3 text-center text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-primary-10 focus-visible:border-primary focus-visible:outline-none"
            >
              <Upload className="size-4" />
              <span>
                Drop files here or{" "}
                <span className="font-medium text-primary">browse</span>
              </span>
              <span className="text-[0.7rem]">Up to {maxSizeLabel} each</span>
            </button>
          ))}
        {hasFiles && (
          <div className={cn("flex flex-wrap", compact ? "gap-2" : "gap-3")}>
            {attachments.map((attachment, index) => (
              <AttachmentCard
                key={attachment.id}
                size={cardSize}
                media={
                  <AttachmentThumbnail
                    attachment={attachment}
                    iconSize={compact ? "sm" : "lg"}
                    className="size-full object-cover"
                  />
                }
                title={attachment.name}
                description={[
                  attachment.fileExtension.toUpperCase(),
                  formatFileSize(attachment.fileSize),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                onOpen={() => openPreview(attachments, index)}
              >
                {labelMode === "text" ? (
                  <AttachmentTextLabel
                    name={attachment.name}
                    value={attachment.label}
                    suggestions={labelSuggestions}
                    disabled={disabled}
                    onChange={(text) => label(attachment.id, { label: text })}
                  />
                ) : (
                  options !== undefined &&
                  options.length > 0 && (
                    <AttachmentLabelSelect
                      name={attachment.name}
                      options={options}
                      value={attachmentOption(attachment, options)?.id}
                      disabled={disabled}
                      onChange={(optionId) =>
                        label(attachment.id, { optionId })
                      }
                    />
                  )
                )}
                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  {disabled !== true && removable && (
                    <Button
                      variant="outline"
                      size="icon-xs"
                      aria-label={`Remove ${attachment.name}`}
                      title="Remove"
                      onClick={() => remove(attachment.id)}
                      startIcon={<Trash2Icon size={13} />}
                      className="text-muted-foreground hover:text-destructive"
                    />
                  )}
                </div>
              </AttachmentCard>
            ))}
            {pending.map((file) => (
              <AttachmentCard
                key={file.key}
                size={cardSize}
                media={<Spinner className={compact ? "size-4" : "size-5"} />}
                title={file.name}
                description={`Uploading · ${formatFileSize(file.fileSize)}`}
                uploading
              />
            ))}
          </div>
        )}
        {isDragActive && (
          <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-primary bg-primary-10 text-center text-xs text-primary">
            <Upload className="size-4" />
            <span className="font-medium">Drop to upload</span>
            <span className="text-[0.7rem]">Up to {maxSizeLabel} each</span>
          </div>
        )}
      </div>
      <AttachmentPreviewDialog {...dialogProps} />
    </>
  );
}

/** The label of one file, picked from the attachment field's options; it sits above the card's open trigger. */
function AttachmentLabelSelect({
  name,
  options,
  value,
  disabled,
  onChange,
}: AttachmentLabelSelectProps) {
  const picked = options.find((option) => option.id === value);
  if (disabled === true && !picked) return null;
  return (
    <Select
      value={value ?? NO_LABEL}
      onValueChange={(next) => onChange(next === NO_LABEL ? undefined : next)}
      disabled={disabled}
    >
      <SelectTrigger
        asChild
        aria-label={`Label for ${name}`}
        className="flex h-6 w-fit max-w-full min-w-0 cursor-pointer items-center rounded-md border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none disabled:cursor-default"
      >
        <button type="button">
          {picked ? (
            <SelectionNode
              dropDownValue={picked}
              className="flex h-6 min-w-0 items-center gap-1 px-2 text-xs font-medium"
            >
              <Tag className="size-3 shrink-0" />
              <span className="truncate">{picked.value}</span>
            </SelectionNode>
          ) : (
            <span className="flex h-6 items-center gap-1 rounded-md border bg-background px-2 font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <Tag className="size-3" />
              Add label
            </span>
          )}
        </button>
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={NO_LABEL} textValue="No label">
          <span className="text-muted-foreground">No label</span>
        </SelectItem>
        {options.map((option) => (
          <SelectItem
            key={option.id}
            value={option.id}
            textValue={option.value}
          >
            <SelectionNode dropDownValue={option}>{option.value}</SelectionNode>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** A label typed for one file: "Add label", or the label, opens a box to type or pick a suggestion; it sits above the card's open trigger. */
function AttachmentTextLabel({
  name,
  value,
  suggestions,
  disabled,
  onChange,
}: AttachmentTextLabelProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const offered = useMemo(() => {
    const term = draft.trim().toLowerCase();
    return (suggestions ?? [])
      .filter(
        (suggestion) =>
          suggestion !== value && suggestion.toLowerCase().includes(term),
      )
      .slice(0, 6);
  }, [suggestions, draft, value]);
  const changeOpen = useCallback(
    (next: boolean) => {
      if (next) setDraft(value ?? "");
      setOpen(next);
    },
    [value],
  );
  const save = useCallback(
    (text?: string) => {
      const next = nonEmpty(text?.trim());
      if (next !== value) onChange(next);
      setOpen(false);
    },
    [value, onChange],
  );
  if (disabled === true && (value == null || value === "")) return null;
  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={`Label for ${name}`}
          className="flex h-6 max-w-full min-w-0 cursor-pointer items-center rounded-md text-xs focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none disabled:cursor-default"
        >
          {value != null && value !== "" ? (
            <span className="flex h-6 min-w-0 items-center gap-1 rounded-md bg-primary-10 px-2 font-medium text-primary">
              <Tag className="size-3 shrink-0" />
              <span className="truncate">{value}</span>
            </span>
          ) : (
            <span className="flex h-6 items-center gap-1 rounded-md border bg-background px-2 font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <Tag className="size-3" />
              Add label
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-60 flex-col gap-2 p-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save(draft);
          }}
        >
          <Input
            autoFocus
            aria-label={`Label for ${name}`}
            placeholder="e.g. Proof of delivery"
            maxLength={60}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="h-8 text-sm"
          />
        </form>
        {offered.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {offered.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => save(suggestion)}
                className="max-w-full cursor-pointer truncate rounded-md border px-2 py-0.5 text-xs hover:border-primary hover:text-primary"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          {value != null && value !== "" ? (
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              onClick={() => save(undefined)}
            >
              Remove label
            </Button>
          ) : (
            <span />
          )}
          <Button size="xs" onClick={() => save(draft)}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * One file as a card: its tile, name and details in a raised panel that opens it, with the footer's controls below.
 * Compact puts it all on one row and the whole card opens it; the controls sit above that so they keep their own clicks.
 */
function AttachmentCard({
  media,
  title,
  description,
  uploading = false,
  onOpen,
  children,
  size = "default",
}: AttachmentCardProps) {
  if (size === "compact") {
    return (
      <div className="relative flex w-64 max-w-full items-start gap-2 rounded-lg border bg-background p-1.5 transition-colors">
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Open ${title}`}
          disabled={uploading}
          onClick={onOpen}
          className="absolute inset-0 rounded-lg transition-colors enabled:cursor-pointer enabled:hover:bg-muted/40"
        />
        <span className="pointer-events-none relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-card text-muted-foreground h-full">
          {media}
        </span>
        <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            title={title}
            className={cn(
              "truncate text-xs font-semibold text-foreground",
              uploading && "animate-pulse",
            )}
          >
            {title}
          </span>
          <span className="truncate text-[11px] text-muted-foreground">
            {description}
          </span>
          {Boolean(children) && (
            <div className="flex min-h-6 items-center gap-1.5 *:pointer-events-auto">
              {children}
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex w-58 max-w-full flex-col gap-1.5 rounded-xl border bg-muted/50 p-1.5">
      <button
        type="button"
        tabIndex={-1}
        disabled={uploading}
        onClick={onOpen}
        className="flex flex-col h-48 items-start gap-3 rounded-lg border bg-card p-3 text-left shadow-xs transition-colors enabled:cursor-pointer enabled:hover:border-primary/40"
      >
        <span className="flex w-full flex-1 items-center justify-center overflow-hidden rounded-lg text-muted-foreground">
          {media}
        </span>
        <span className="flex w-full min-w-0 flex-col gap-0.5">
          <span
            title={title}
            className={cn(
              "truncate text-sm font-semibold text-foreground",
              uploading && "animate-pulse",
            )}
          >
            {title}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {description}
          </span>
        </span>
      </button>
      {Boolean(children) && (
        <div className="flex min-h-6 items-center gap-1.5 px-0.5">
          {children}
        </div>
      )}
    </div>
  );
}
