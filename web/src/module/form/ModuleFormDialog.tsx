import { useCallback, useMemo, useState } from "react";
import { EyeOff, FileText, Plus, Trash2, X } from "lucide-react";
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldLabel,
  FieldTypeIcon,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  toast,
} from "@moduleleague/ui";
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
      <DialogContent className="flex h-[min(680px,90dvh)] flex-col gap-0 p-0 sm:max-w-4xl">
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

/** The picked form's settings and fields; nothing is saved until Save. */
function FormEditor({
  form,
  fillableFields,
  onUpdateForm,
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
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
        <Field>
          <FieldLabel htmlFor="form-title">Form title</FieldLabel>
          <Input
            id="form-title"
            maxLength={80}
            value={draft.formTitle}
            onChange={(event) => change({ formTitle: event.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="form-description">Description</FieldLabel>
          <Textarea
            id="form-description"
            maxLength={500}
            placeholder="What this form is for"
            className="min-h-16"
            value={draft.formDescription ?? ""}
            onChange={(event) =>
              change({ formDescription: event.target.value })
            }
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm">
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">Default form</span>
              <span className="text-xs text-muted-foreground">
                {draft.isHidden
                  ? "A hidden form can't be the default."
                  : "The sidebar's main form; only one form is."}
              </span>
            </span>
            <Switch
              checked={draft.isDefault}
              disabled={draft.isHidden}
              onCheckedChange={(isDefault) => change({ isDefault })}
            />
          </label>
          <label className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm">
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">Hidden</span>
              <span className="text-xs text-muted-foreground">
                Kept, but not offered to people.
              </span>
            </span>
            <Switch
              checked={draft.isHidden}
              onCheckedChange={(isHidden) =>
                change({
                  isHidden,
                  isDefault: isHidden ? false : draft.isDefault,
                })
              }
            />
          </label>
        </div>

        <section aria-labelledby="form-fields" className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 id="form-fields" className="text-sm font-medium">
              Fields{" "}
              <span className="font-normal text-muted-foreground">
                {shownIds.length} of {fillableFields?.length ?? 0}
              </span>
            </h3>
            <Button
              variant="ghost"
              size="xs"
              disabled={!availableFields?.length}
              onClick={() =>
                setFieldIds([
                  ...shownIds,
                  ...(availableFields?.map((field) => field?.objId) ?? []),
                ])
              }
            >
              Add all
            </Button>
          </div>
          {shownIds.length ? (
            <div className="flex flex-col gap-1 rounded-lg border p-1">
              <SortableList ids={shownIds} onReorder={setFieldIds}>
                {shownIds.map((id) => (
                  <FormFieldRow
                    key={id}
                    field={fieldById.get(id)}
                    onRemove={removeField}
                  />
                ))}
              </SortableList>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
              No fields on this form yet. Add the fields people fill in.
            </p>
          )}
          <Select
            value=""
            onValueChange={(id) => setFieldIds([...shownIds, id])}
            disabled={!availableFields?.length}
          >
            <SelectTrigger aria-label="Add a field" className="w-full">
              <SelectValue
                placeholder={
                  availableFields?.length
                    ? "Add a field"
                    : "Every field is on the form"
                }
              />
            </SelectTrigger>
            <SelectContent position="popper" searchable>
              {availableFields?.map((field) => (
                <SelectItem
                  key={field.objId}
                  value={field.objId}
                  textValue={field.name}
                >
                  <FieldTypeIcon type={field.type} />
                  {field.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>
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

/** What the editor edits: the saved form's title, description, flags and fields. */
function toFormInput(form?: ISidebarForm): ISidebarFormInput {
  return {
    formTitle: form?.formTitle ?? "",
    formDescription: form?.formDescription ?? "",
    isHidden: !!form?.isHidden,
    isDefault: !!form?.isDefault,
    fieldIds: form?.fieldIds ?? [],
  };
}

/** One field on the form: dragged by its grip, removed by its X. */
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
        "flex items-center gap-2 rounded-md py-1 pr-1 text-sm hover:bg-muted/60",
        isDragging && "relative z-10 bg-background shadow-md",
      )}
    >
      <SortableHandle handle={handle} label={field.name} />
      <FieldTypeIcon type={field.type} />
      <span className="min-w-0 flex-1 truncate">{field.name}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Remove ${field.name}`}
        title="Remove from form"
        className="text-muted-foreground hover:text-foreground"
        startIcon={<X size={13} />}
        onClick={() => onRemove(field.objId)}
      />
    </div>
  );
}
