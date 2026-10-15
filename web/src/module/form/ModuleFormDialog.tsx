import { useCallback, useMemo, useRef, useState } from "react";
import {
  EyeOff,
  FileText,
  ImagePlus,
  ListPlus,
  Plus,
  SquarePen,
  Trash2,
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  FieldTypeIcon,
  Input,
  Separator,
  Switch,
  toast,
} from "@moduleleague/ui";
import { attachmentUrl } from "@/services/attachments/attachment.api";
import QueryWrapper from "@/components/custom/QueryWrapper";
import { ConfirmDeleteDialog } from "@/components/custom/ConfirmDeleteDialog";
import { SortableHandle, SortableList } from "@/components/custom/SortableList";
import { useSortableRow } from "@/hooks/useSortableRow";
import { errorParser } from "@/hooks/useErrorParser";
import type {
  ModuleFormDialogProps,
  ModuleFormEditorProps,
} from "./moduleForm.types";

/**
 * The forms of a sidebar: the list on the left, the picked form's title, flags and fields on the right.
 * @example
 * <ModuleFormDialog open={open} onOpenChange={setOpen} title="Dispatch" fields={fields} forms={forms} {...formHandlers} />
 */
export function ModuleFormDialog({
  open,
  onOpenChange,
  title,
  fields,
  forms,
  isLoading = false,
  error,
  onRetry,
  onAddForm,
  onUpdateForm,
  onDeleteForm,
  onReorderForms,
  onUploadAttachment,
}: ModuleFormDialogProps) {
  const [selectedId, setSelectedId] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const selected = useMemo(
    () => forms?.find((form) => form?.objId === selectedId) ?? forms?.[0],
    [forms, selectedId],
  );
  const formIds = useMemo(() => forms?.map((form) => form?.objId), [forms]);
  const fillableFields = useMemo(
    () =>
      fields?.filter(
        (field) => !field?.isSystemField && field?.type !== "lookup",
      ) ?? [],
    [fields],
  );

  const startForm = useCallback(async () => {
    const taken = new Set(forms?.map((form) => form?.formTitle));
    let formTitle = `${title} form`;
    for (let n = 2; taken.has(formTitle); n++) formTitle = `${title} form ${n}`;
    setCreating(true);
    try {
      const created = await onAddForm({
        formTitle,
        isHidden: false,
        isDefault: false,
        fieldIds: [],
      });
      setSelectedId(created?.objId);
    } catch (err) {
      toast.error("Couldn't start a form", {
        description: errorParser(err)?.message,
      });
    } finally {
      setCreating(false);
    }
  }, [forms, title, onAddForm]);
  const reorder = useCallback(
    (ids: string[]) =>
      onReorderForms(ids).catch((err) =>
        toast.error("Couldn't reorder forms", {
          description: errorParser(err)?.message,
        }),
      ),
    [onReorderForms],
  );
  const deleteSelected = useCallback(async () => {
    if (!selected) return;
    await onDeleteForm(selected.objId);
    setSelectedId(undefined);
  }, [selected, onDeleteForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(680px,90dvh)] flex-col gap-0 p-0 w-full"
        overlayClassName="supports-backdrop-filter:backdrop-blur-none"
        style={{ maxWidth: "90%" }}
      >
        <DialogHeader className="shrink-0 border-b p-4 pr-10 pb-3">
          <DialogTitle>{title} forms</DialogTitle>
          <DialogDescription>
            Each form lists the fields people fill in, in order.
          </DialogDescription>
        </DialogHeader>
        <QueryWrapper isLoading={isLoading} error={error} onRetry={onRetry}>
          <div className="flex min-h-0 flex-1">
            <aside className="flex w-60 shrink-0 flex-col gap-2 border-r bg-muted/30 p-3">
              <Button
                variant="outline"
                size="xs"
                disabled={creating}
                startIcon={<Plus size={13} />}
                onClick={startForm}
              >
                {creating ? "Starting…" : "New form"}
              </Button>
              <nav
                aria-label="Forms"
                className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto"
              >
                <SortableList ids={formIds} onReorder={reorder}>
                  {forms?.map((form) => (
                    <FormListItem
                      key={form.objId}
                      form={form}
                      selected={form.objId === selected?.objId}
                      onSelect={setSelectedId}
                    />
                  ))}
                </SortableList>
              </nav>
            </aside>
            <div className="flex min-w-0 flex-1 flex-col">
              {selected ? (
                <FormEditor
                  key={selected.objId}
                  form={selected}
                  fillableFields={fillableFields}
                  onUpdateForm={onUpdateForm}
                  onUploadAttachment={onUploadAttachment}
                  onDelete={() => setDeleteOpen(true)}
                />
              ) : (
                <div className="m-auto flex max-w-72 flex-col items-center gap-2 text-center">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary-10 text-primary">
                    <FileText className="size-5" />
                  </span>
                  <p className="text-sm font-medium">No forms yet</p>
                  <p className="text-xs text-muted-foreground">
                    Start a form, then add the {title} fields people fill in.
                  </p>
                  <Button
                    size="xs"
                    disabled={creating}
                    startIcon={<Plus size={13} />}
                    onClick={startForm}
                  >
                    Start a form
                  </Button>
                </div>
              )}
            </div>
          </div>
        </QueryWrapper>
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={`Delete “${selected?.formTitle ?? "form"}”?`}
          description="The form is removed. Records and fields stay as they are."
          confirmLabel="Delete form"
          successMessage="Form deleted"
          onConfirm={deleteSelected}
        />
      </DialogContent>
    </Dialog>
  );
}

/** One form in the list: dragged by its grip, picked by a click. */
function FormListItem({
  form,
  selected,
  onSelect,
}: {
  form: ISidebarForm;
  selected: boolean;
  onSelect: (objId: string) => void;
}) {
  const { ref, style, isDragging, handle } = useSortableRow(form?.objId);

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "group/form flex items-center gap-1 rounded-md pr-2 text-sm hover:bg-primary-10",
        selected && "bg-primary-10 font-medium text-primary",
        isDragging && "relative z-10 bg-background shadow-md",
      )}
    >
      <SortableHandle
        handle={handle}
        label={form?.formTitle}
        className="opacity-0 group-hover/form:opacity-100 focus-visible:opacity-100"
      />
      <button
        type="button"
        aria-current={selected || undefined}
        onClick={() => onSelect(form?.objId)}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1.5 text-left"
      >
        <FileText className="size-3.5 shrink-0" />
        <span className="truncate">{form?.formTitle}</span>
      </button>
      {form?.isDefault && (
        <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[0.65rem] font-medium text-primary-foreground">
          Default
        </span>
      )}
      {form?.isHidden && (
        <EyeOff
          aria-label="Hidden"
          className="size-3.5 shrink-0 text-muted-foreground"
        />
      )}
    </div>
  );
}

/** What each field's answer box says on the form preview. */
const ANSWER_HINTS: Partial<Record<IField["type"], string>> = {
  text: "Short answer",
  long_text: "Long answer",
  number: "Number",
  currency: "Amount",
  single_select: "Pick one option",
  multi_select: "Pick any options",
  date: "Pick a date",
  member: "Pick people",
  link_table: "Link records",
  attachment: "Drop files here or browse",
};

/** The picked form, laid out as people will see it; nothing is saved until Save. */
function FormEditor({
  form,
  fillableFields,
  onUpdateForm,
  onUploadAttachment,
  onDelete,
}: ModuleFormEditorProps) {
  const saved = useMemo(() => toFormInput(form), [form]);
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  );
  const fieldById = useMemo(
    () => new Map(fillableFields?.map((field) => [field?.objId, field])),
    [fillableFields],
  );
  const shownIds = useMemo(
    () => draft.fieldIds.filter((id) => fieldById.has(id)),
    [draft.fieldIds, fieldById],
  );
  const availableFields = useMemo(
    () => fillableFields?.filter((field) => !shownIds.includes(field?.objId)),
    [fillableFields, shownIds],
  );

  const change = useCallback(
    (patch: Partial<ISidebarFormInput>) =>
      setDraft((current) => ({ ...current, ...patch })),
    [],
  );
  const setFieldIds = useCallback(
    (fieldIds: string[]) => change({ fieldIds }),
    [change],
  );
  const removeField = useCallback(
    (id: string) => setFieldIds(shownIds.filter((shownId) => shownId !== id)),
    [shownIds, setFieldIds],
  );
  const save = useCallback(async () => {
    setSaving(true);
    try {
      const updated = await onUpdateForm(form.objId, {
        ...draft,
        fieldIds: shownIds,
      });
      setDraft(toFormInput(updated));
      toast.success("Form saved");
    } catch (err) {
      toast.error("Couldn't save form", {
        description: errorParser(err)?.message,
      });
    } finally {
      setSaving(false);
    }
  }, [form.objId, draft, shownIds, onUpdateForm]);

  return (
    <>
      <div className="flex shrink-0 items-center justify-end gap-5 border-b px-5 py-2 text-sm">
        <label
          className="flex cursor-pointer items-center gap-2"
          title={
            draft.isHidden
              ? "A hidden form can't be the default."
              : "The sidebar's main form; only one form is."
          }
        >
          <Switch
            size="sm"
            checked={draft.isDefault}
            disabled={draft.isHidden}
            onCheckedChange={(isDefault) => change({ isDefault })}
          />
          Default form
        </label>
        <label
          className="flex cursor-pointer items-center gap-2"
          title="Kept, but not offered to people."
        >
          <Switch
            size="sm"
            checked={draft.isHidden}
            onCheckedChange={(isHidden) =>
              change({
                isHidden,
                isDefault: isHidden ? false : draft.isDefault,
              })
            }
          />
          Hidden
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 px-6 py-8">
        <article className="mx-auto max-w-xl overflow-hidden rounded-xl border bg-background shadow-sm">
          <FormImage
            kind="cover"
            imageId={draft.coverImageId}
            onChange={(coverImageId) => change({ coverImageId })}
            onUpload={onUploadAttachment}
          />
          <div className="px-8 pb-8">
            <FormImage
              kind="logo"
              imageId={draft.logoId}
              onChange={(logoId) => change({ logoId })}
              onUpload={onUploadAttachment}
            />
            <Input
              aria-label="Form title"
              maxLength={80}
              placeholder="Form title"
              value={draft.formTitle}
              onChange={(event) => change({ formTitle: event.target.value })}
              className="w-full rounded-md bg-transparent text-2xl font-semibold outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <textarea
              aria-label="Form description"
              maxLength={500}
              rows={2}
              placeholder="Add a description"
              value={draft.formDescription ?? ""}
              onChange={(event) =>
                change({ formDescription: event.target.value })
              }
              className="mt-1 w-full resize-none rounded-md bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <Separator className="border-b" />
            <div className="mt-6 flex flex-col gap-3">
              {shownIds.length ? (
                <SortableList ids={shownIds} onReorder={setFieldIds}>
                  {shownIds.map((id) => (
                    <FormFieldRow
                      key={id}
                      field={fieldById.get(id)}
                      onRemove={removeField}
                    />
                  ))}
                </SortableList>
              ) : (
                <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No fields yet. Add the fields people fill in.
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!availableFields?.length}
                  startIcon={<Plus size={14} />}
                  className="mt-3 w-full border-dashed"
                >
                  {availableFields?.length
                    ? "Add field"
                    : "Every field is on the form"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-72 w-(--radix-dropdown-menu-trigger-width)"
              >
                <DropdownMenuLabel>Add a field</DropdownMenuLabel>
                {availableFields?.map((field) => (
                  <DropdownMenuItem
                    key={field.objId}
                    onSelect={() => setFieldIds([...shownIds, field.objId])}
                  >
                    <FieldTypeIcon type={field.type} />
                    {field.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() =>
                    setFieldIds([
                      ...shownIds,
                      ...(availableFields?.map((field) => field?.objId) ?? []),
                    ])
                  }
                >
                  <ListPlus />
                  Add all fields
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="mt-8 flex items-center justify-between gap-3 border-t pt-6">
              <ButtonLabelInput
                aria-label="Clear form button label"
                placeholder="Clear form"
                value={draft.clearLabel ?? ""}
                onChange={(clearLabel) => change({ clearLabel })}
                className="text-muted-foreground hover:bg-muted"
              />

              <ButtonLabelInput
                aria-label="Submit button label"
                placeholder="Submit"
                value={draft.submitLabel ?? ""}
                onChange={(submitLabel) => change({ submitLabel })}
                className="bg-primary text-primary-foreground"
              />
            </div>
          </div>
        </article>
      </div>

      <DialogFooter className="m-0 shrink-0 items-center sm:justify-between">
        <Button
          variant="ghost"
          size="xs"
          className="text-destructive hover:text-destructive"
          startIcon={<Trash2 size={13} />}
          onClick={onDelete}
        >
          Delete form
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="xs"
            disabled={!dirty || saving}
            onClick={() => setDraft(saved)}
          >
            Discard
          </Button>
          <Button
            size="xs"
            disabled={!dirty || saving || !draft.formTitle.trim()}
            onClick={save}
          >
            {saving ? "Saving…" : "Save form"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

/** The form's cover across the top, or its logo under it: an uploaded image that can be changed or removed. */
function FormImage({
  kind,
  imageId,
  onChange,
  onUpload,
}: {
  kind: "cover" | "logo";
  imageId?: string;
  onChange: (imageId?: string) => void;
  onUpload?: (file: File) => Promise<IAttachment>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const name = kind === "cover" ? "cover image" : "logo";
  const upload = useCallback(
    async (file?: File) => {
      if (!file || !onUpload) return;
      if (!file.type.startsWith("image/")) {
        toast.error(`The ${name} must be an image`);
        return;
      }
      setUploading(true);
      try {
        onChange((await onUpload(file))?.id);
      } catch (err) {
        toast.error(`Couldn't upload the ${name}`, {
          description: errorParser(err)?.message,
        });
      } finally {
        setUploading(false);
      }
    },
    [name, onUpload, onChange],
  );
  const pick = () => fileInput.current?.click();
  const actions = (
    <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover/image:opacity-100 group-focus-within/image:opacity-100">
      <Button
        variant="outline"
        size="xs"
        disabled={uploading || !onUpload}
        onClick={pick}
      >
        {uploading ? "Uploading…" : "Change"}
      </Button>
      <Button
        variant="outline"
        size="icon-xs"
        aria-label={`Remove ${name}`}
        startIcon={<X size={13} />}
        onClick={() => onChange(undefined)}
      />
    </div>
  );

  return (
    <div
      className={cn(
        "group/image relative overflow-hidden",
        kind === "cover"
          ? "h-40 bg-linear-to-br from-primary-10 to-primary/25"
          : "-mt-10 mb-4 size-20 rounded-xl border-4 border-background bg-muted shadow-sm",
      )}
    >
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          upload(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {imageId ? (
        <>
          <img
            src={attachmentUrl(imageId)}
            alt={`Form ${name}`}
            className="size-full object-cover"
          />
          {kind === "cover" ? (
            actions
          ) : (
            <button
              type="button"
              aria-label="Change logo"
              onClick={pick}
              className="absolute inset-0 flex cursor-pointer items-center justify-center bg-foreground/40 text-background opacity-0 transition-opacity group-hover/image:opacity-100 focus-visible:opacity-100"
            >
              <ImagePlus className="size-5" />
            </button>
          )}
        </>
      ) : (
        <button
          type="button"
          disabled={uploading || !onUpload}
          onClick={pick}
          aria-label={`Add ${name}`}
          className={cn(
            "flex size-full cursor-pointer items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary disabled:cursor-not-allowed",
            kind === "cover" &&
              "opacity-0 group-hover/image:opacity-100 focus-visible:opacity-100",
          )}
        >
          <ImagePlus className="size-5" />
          {kind === "cover" && (uploading ? "Uploading…" : "Add cover image")}
        </button>
      )}
    </div>
  );
}

/** What the editor edits: the saved form's title, description, flags and fields. */
function toFormInput(form?: ISidebarForm): ISidebarFormInput {
  return {
    formTitle: form?.formTitle ?? "",
    formDescription: form?.formDescription ?? "",
    isHidden: !!form?.isHidden,
    isDefault: !!form?.isDefault,
    fieldIds: form?.fieldIds ?? [],
    coverImageId: form?.coverImageId ?? undefined,
    logoId: form?.logoId ?? undefined,
    submitLabel: form?.submitLabel ?? "",
    clearLabel: form?.clearLabel ?? "",
  };
}

/** A form button whose text is typed in place; a blank label falls back to the placeholder. */
function ButtonLabelInput({
  value,
  placeholder = "",
  onChange,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  "aria-label": string;
}) {
  return (
    <label
      title="Click to rename"
      className={cn(
        "group/label inline-flex h-9 cursor-text items-center gap-1.5 rounded-md px-4 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-primary/30",
        className,
      )}
    >
      <input
        aria-label={ariaLabel}
        maxLength={40}
        placeholder={placeholder}
        size={Math.max(value?.length, placeholder?.length, 1)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-sizing-content min-w-4 bg-transparent outline-none placeholder:text-current placeholder:opacity-60"
      />
      <SquarePen className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/label:opacity-70 group-focus-within/label:opacity-70" />
    </label>
  );
}

/** One field on the form, with a preview of its answer box: dragged by its grip, removed by its X. */
function FormFieldRow({
  field,
  onRemove,
}: {
  field?: ISidebarField;
  onRemove: (id: string) => void;
}) {
  const { ref, style, isDragging, handle } = useSortableRow(field?.objId ?? "");
  if (!field) return null;

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "group/field rounded-lg border bg-background p-3 transition-colors hover:border-primary/40",
        isDragging && "relative z-10 shadow-md",
      )}
    >
      <div className="flex items-center gap-2">
        <SortableHandle
          handle={handle}
          label={field.name}
          className="-ml-1 opacity-0 group-hover/field:opacity-100 focus-visible:opacity-100"
        />
        <FieldTypeIcon type={field.type} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {field.name}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Remove ${field.name}`}
          title="Remove from form"
          className="text-muted-foreground opacity-0 group-hover/field:opacity-100 hover:text-foreground focus-visible:opacity-100"
          startIcon={<X size={13} />}
          onClick={() => onRemove(field.objId)}
        />
      </div>
      {field.type === "checkbox" ? (
        <div className="mt-2 flex items-center gap-2 pl-6 text-xs text-muted-foreground">
          <span className="size-4 rounded border" />
          Tick if yes
        </div>
      ) : (
        <div className="mt-2 ml-6 flex h-9 items-center rounded-md border bg-muted/30 px-3 text-xs text-muted-foreground">
          {ANSWER_HINTS[field.type] ?? "Answer"}
        </div>
      )}
    </div>
  );
}
