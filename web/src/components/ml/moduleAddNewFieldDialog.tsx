import { useCallback, useMemo, useState, type SyntheticEvent } from "react";
import { Check, ChevronLeft, Link2, Plus, X } from "lucide-react";
import { SortableHandle, SortableList } from "@/components/custom/SortableList";
import { useSortableRow } from "@/hooks/useSortableRow";
import { cn } from "@/lib/utils";
import { getContrastColor, presetColors } from "@/lib/colorUtils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fieldDateFormat } from "@/lib/dateHelper";
import {
  NUMBER_ABBREVIATIONS,
  formatNumber,
  type NumberSettings,
} from "@/lib/numberHelper";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/components/ui/sonner";
import { errorParser } from "@/hooks/useErrorParser";
import { zodErrors } from "@/lib/validationHelper";
import {
  LOOKUP_CREATE_TIME_ID,
  previewableLookupFields,
  shownLookupFields,
} from "@/lib/lookupHelper";
import { Checkbox } from "@/components/ui/checkbox";
import { useRecordLookups } from "@/components/custom/RecordLookup.context";
import { FieldTypeIcon } from "./fieldTypeIcon";
import { ConfirmDeleteDialog } from "@/components/custom/ConfirmDeleteDialog";
import type {
  ModuleAddFieldStepsProps,
  ModuleFieldNumberSettingsProps,
  ModuleFieldDateSettings,
  ModuleFieldDateSettingsProps,
  ModuleFieldLinkSettingsProps,
  ModuleFieldLookupSettings,
  ModuleFieldLookupSettingsProps,
  ModuleAddNewFieldDialogProps,
  ModuleDeleteFieldDialogProps,
  ModuleEditFieldDialogProps,
  ModuleFieldOptionColorPickerProps,
  ModuleFieldOptionRowProps,
  ModuleFieldOptionsEditorProps,
} from "./moduleAddNewField.types";
import {
  createDropDownValue,
  NUMBER_DECIMAL_PLACES,
  NUMBER_PRESETS,
  fieldTypeOption,
  fieldDraftSchema,
  MODULE_FIELD_TYPES,
  nextOptionValue,
  toField,
  fieldDateDraft,
  hasFieldOptions,
  fieldNumberDraft,
  FIELD_DATE_FORMATS,
  FIELD_TIME_FORMATS,
} from "./moduleAddNewField.utils";

/**
 * Two-step dialog: pick a field type, then name it. A select also lists its choices with a color and order. Builds an {@link IField}.
 * @example
 * <ModuleAddNewFieldDialog open={open} onOpenChange={setOpen} onAdd={addColumn} />
 */
export function ModuleAddNewFieldDialog({
  onAdd,
  ...props
}: ModuleAddNewFieldDialogProps) {
  return <FieldDialog {...props} onSave={onAdd} />;
}

/**
 * The Add field dialog opened on an existing field: no type step, the type stays.
 * @example
 * <ModuleEditFieldDialog field={field} open={open} onOpenChange={setOpen} onSave={(edited) => onUpdateField(field.objId, edited)} />
 */
export function ModuleEditFieldDialog(props: ModuleEditFieldDialogProps) {
  if (!props.field) return null;
  return <FieldDialog {...props} />;
}

/**
 * Asks before deleting a field, since its values go from every record.
 * @example
 * <ModuleDeleteFieldDialog field={field} open={open} onOpenChange={setOpen} onDelete={() => onDeleteField(field.objId)} />
 */
export function ModuleDeleteFieldDialog({
  open,
  onOpenChange,
  field,
  onDelete,
}: ModuleDeleteFieldDialogProps) {
  if (!field) return null;
  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete “${field.name}”?`}
      description="The field and its values are removed from every record. This can't be undone."
      confirmLabel="Delete field"
      successMessage={`${field.name} was removed from every record.`}
      onConfirm={onDelete}
    />
  );
}

function FieldDialog({
  open,
  onOpenChange,
  field,
  onSave,
  takenNames,
}: ModuleEditFieldDialogProps) {
  const [saving, setSaving] = useState(false);
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const changeOpen = useCallback(
    (next: boolean) => {
      if (!saving) onOpenChange(next);
    },
    [saving, onOpenChange],
  );
  const save = useCallback(
    async (built: IField) => {
      setSaving(true);
      try {
        await onSave(built);
        onOpenChange(false);
        toast.success(field ? "Field updated" : "Field added", {
          description: field
            ? `Changes to ${built.name} were saved.`
            : `${built.name} was added as a ${fieldTypeOption(built.type)?.label.toLowerCase()} field.`,
        });
      } catch (error) {
        toast.error(field ? "Couldn't save field" : "Couldn't add field", {
          description: errorParser(error)?.message,
        });
      } finally {
        setSaving(false);
      }
    },
    [field, onSave, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="flex h-[min(620px,90dvh)] flex-col gap-0 p-0 sm:max-w-lg">
        <AddFieldSteps
          field={field}
          onAdd={save}
          onCancel={close}
          takenNames={takenNames}
          saving={saving}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddFieldSteps({
  field,
  onAdd,
  onCancel,
  takenNames,
  saving = false,
}: ModuleAddFieldStepsProps) {
  const editing = !!field;
  const [type, setType] = useState<IField["type"] | null>(field?.type ?? null);
  const [name, setName] = useState(field?.name ?? "");
  const [options, setOptions] = useState<IFieldDropDownValue[]>(() =>
    field?.dropDownValues?.length
      ? field.dropDownValues
      : [createDropDownValue(0), createDropDownValue(1)],
  );
  const [dateSettings, setDateSettings] = useState<ModuleFieldDateSettings>(
    () => fieldDateDraft(field),
  );
  const [multipleMembers, setMultipleMembers] = useState(
    !!field?.memberSettings?.multiple,
  );
  const [numberSettings, setNumberSettings] = useState<NumberSettings>(() =>
    fieldNumberDraft(field),
  );
  const { sources, linkFields, sidebarId } = useRecordLookups();
  const [lookupSettings, setLookupSettings] =
    useState<ModuleFieldLookupSettings>(() => ({
      categoryId: field?.lookupSettings?.categoryId,
      multiple: field?.lookupSettings?.multiple ?? true,
      linkFieldId: field?.lookupSettings?.linkFieldId,
      lookupFieldId: field?.lookupSettings?.lookupFieldId,
      previewEnabled: field?.lookupSettings?.previewEnabled ?? true,
      previewFieldIds: field?.lookupSettings?.previewFieldIds,
    }));
  const option = useMemo(
    () => (type ? fieldTypeOption(type) : undefined),
    [type],
  );
  const draft = useMemo(() => {
    if (!type) return null;
    return toField({
      type,
      name: name.trim(),
      dropDownValues: options,
      ...dateSettings,
      memberSettings: { multiple: multipleMembers },
      numberSettings,
      lookupSettings,
    });
  }, [
    type,
    name,
    options,
    dateSettings,
    multipleMembers,
    numberSettings,
    lookupSettings,
  ]);
  const [submitted, setSubmitted] = useState(false);
  const errors = useMemo(
    () =>
      zodErrors(fieldDraftSchema(takenNames), {
        type,
        name,
        options,
        numberSettings,
        lookupSettings,
      }),
    [type, name, options, numberSettings, lookupSettings, takenNames],
  );
  // Before the first save, only a typed name that can't be used is flagged
  const nameError = submitted || name.trim() ? errors?.name : undefined;
  const settingsError = submitted
    ? Object.entries(errors).find(([path]) => path !== "name")?.[1]
    : undefined;
  const submit = useCallback(
    (event: SyntheticEvent) => {
      event.preventDefault();
      setSubmitted(true);
      if (!draft || saving || Object.keys(errors).length) return;
      onAdd(draft);
    },
    [draft, errors, saving, onAdd],
  );

  if (!type || !draft) {
    return (
      <>
        <DialogHeader className="shrink-0 p-4 pr-10 pb-3">
          <DialogTitle>Add field</DialogTitle>
          <DialogDescription>
            Choose what kind of value this field holds.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4">
          <div
            role="radiogroup"
            aria-label="Field type"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {MODULE_FIELD_TYPES.map(
              ({ fieldType, label, description, icon: TypeIcon }) => (
                <button
                  key={fieldType}
                  type="button"
                  role="radio"
                  aria-checked={false}
                  onClick={() => setType(fieldType)}
                  className="flex cursor-pointer flex-col gap-2 rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-primary-10 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none"
                >
                  <span className="flex size-8 items-center justify-center rounded-md bg-primary-10 text-primary">
                    <TypeIcon className="size-4" />
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {description}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>
      </>
    );
  }

  const Icon = option?.icon;

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="shrink-0 p-4 pr-10 pb-3">
        <DialogTitle className="flex items-center gap-2">
          {Icon && (
            <span className="flex size-7 items-center justify-center rounded-md bg-primary-10 text-primary">
              <Icon className="size-4" />
            </span>
          )}
          {editing ? "Edit" : "New"} {option?.label.toLowerCase()} field
        </DialogTitle>
        <DialogDescription>
          {editing
            ? "The field type can't change. Changes show in the table and forms."
            : "Name the field as it should appear in the table and forms."}
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-1 pb-4">
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="field-label">Field label</FieldLabel>
            <Input
              id="field-label"
              autoFocus
              required
              maxLength={40}
              value={name}
              placeholder="e.g. Carrier"
              aria-invalid={!!nameError || undefined}
              aria-describedby={nameError ? "field-label-error" : undefined}
              onChange={(e) => setName(e.target.value)}
            />
            <FieldError id="field-label-error" className="text-xs">
              {nameError}
            </FieldError>
          </Field>
          {hasFieldOptions(type) && (
            <Field>
              <FieldLabel>Options</FieldLabel>
              <FieldOptionsEditor options={options} onChange={setOptions} />
            </Field>
          )}
          {(type === "date" || type === "time") && (
            <FieldDateSettings
              value={dateSettings}
              onChange={setDateSettings}
              timeOnly={type === "time"}
            />
          )}
          {(type === "number" || type === "currency") && (
            <FieldNumberSettings
              value={numberSettings}
              onChange={setNumberSettings}
              withSymbol={type === "currency"}
            />
          )}
          {type === "link_table" && (
            <FieldLinkSettings
              value={lookupSettings}
              onChange={setLookupSettings}
              sources={sources}
              sidebarId={sidebarId}
              sourceLocked={editing}
              savedMultiple={
                editing ? (field?.lookupSettings?.multiple ?? true) : undefined
              }
            />
          )}
          {type === "lookup" && (
            <FieldLookupSettings
              value={lookupSettings}
              onChange={setLookupSettings}
              sources={sources}
              linkFields={linkFields}
            />
          )}
          {type === "member" && (
            <label className="flex items-start justify-between gap-3 text-sm">
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">Allow several people</span>
                <span className="text-xs text-muted-foreground">
                  {multipleMembers
                    ? "Each record can list several people."
                    : "Each record has one person."}
                </span>
              </span>
              <Switch
                checked={multipleMembers}
                onCheckedChange={setMultipleMembers}
              />
            </label>
          )}
          <FieldError className="text-xs">{settingsError}</FieldError>
        </div>
      </div>

      <DialogFooter
        className={cn(
          "m-0 shrink-0 items-center",
          editing ? "sm:justify-end" : "sm:justify-between",
        )}
      >
        {!editing && (
          <Button
            variant="outline"
            size="xs"
            onClick={() => setType(null)}
            startIcon={<ChevronLeft size={14} />}
          >
            Field type
          </Button>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="xs" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="xs" disabled={saving}>
            {editing
              ? saving
                ? "Saving…"
                : "Save"
              : saving
                ? "Adding…"
                : "Add field"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

function FieldLinkSettings({
  value,
  onChange,
  sources,
  sidebarId,
  sourceLocked = false,
  savedMultiple,
}: ModuleFieldLinkSettingsProps) {
  const source = useMemo(
    () => sources?.find((entry) => entry?.sidebarId === value.categoryId),
    [sources, value.categoryId],
  );
  const multiple = value.multiple ?? true;
  const sourceText = source?.sidebarText ?? "that table";
  const shownFields = useMemo(() => shownLookupFields(source), [source]);
  const pickSource = useCallback(
    (categoryId: string) =>
      onChange({
        ...value,
        categoryId,
        lookupFieldId: shownLookupFields(
          sources?.find((entry) => entry?.sidebarId === categoryId),
        )[0]?.objId,
      }),
    [value, sources, onChange],
  );

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="field-link-source">Link to records in</FieldLabel>
        <Select
          value={value.categoryId ?? ""}
          onValueChange={pickSource}
          disabled={sourceLocked}
        >
          <SelectTrigger id="field-link-source" className="w-full">
            <SelectValue placeholder="Choose a table">
              {source?.sidebarText ?? value.categoryId}
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" searchable>
            {sources?.map((entry) => (
              <SelectItem
                key={entry.sidebarId}
                value={entry.sidebarId}
                textValue={entry.sidebarText}
              >
                {entry.sidebarText}
                {entry.sidebarId === sidebarId && (
                  <span className="text-muted-foreground">current table</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sourceLocked && (
          <p className="text-xs text-muted-foreground">
            The table can't change once the field exists.
          </p>
        )}
      </Field>
      {!!source && (
        <Field>
          <FieldLabel htmlFor="field-link-shown">Field to show</FieldLabel>
          <Select
            value={value.lookupFieldId ?? ""}
            onValueChange={(lookupFieldId) =>
              onChange({ ...value, lookupFieldId })
            }
            disabled={!shownFields.length}
          >
            <SelectTrigger id="field-link-shown" className="w-full">
              <SelectValue placeholder="Primary field" />
            </SelectTrigger>
            <SelectContent position="popper" searchable>
              {shownFields.map((shown) => (
                <SelectItem
                  key={shown.objId}
                  value={shown.objId}
                  textValue={shown.name}
                >
                  <FieldTypeIcon type={shown.type} />
                  {shown.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {shownFields.length
              ? `Each linked ${sourceText} record shows as this field.`
              : `${sourceText} has no text, number, select, date or member field to show yet, so records show as “Untitled record”.`}
          </p>
        </Field>
      )}
      <label className="flex items-start justify-between gap-3 text-sm">
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">Allow linking to multiple records</span>
          <span className="text-xs text-muted-foreground">
            {multiple
              ? `Each record can link to several records in ${sourceText}.`
              : `Each record links to one record in ${sourceText}.`}
          </span>
          {savedMultiple && !multiple && (
            <span className="text-xs text-amber-700">
              Records linked to several keep only their first link once you
              save.
            </span>
          )}
        </span>
        <Switch
          checked={multiple}
          onCheckedChange={(next) => onChange({ ...value, multiple: next })}
        />
      </label>
    </div>
  );
}

function FieldLookupSettings({
  value,
  onChange,
  sources,
  linkFields,
}: ModuleFieldLookupSettingsProps) {
  const linkField = useMemo(
    () => linkFields?.find((entry) => entry?.objId === value.linkFieldId),
    [linkFields, value.linkFieldId],
  );
  const sourceOf = useCallback(
    (link?: IField) =>
      sources?.find(
        (entry) => entry?.sidebarId === link?.lookupSettings?.categoryId,
      ),
    [sources],
  );
  const source = useMemo(() => sourceOf(linkField), [sourceOf, linkField]);
  const ready = !!linkField && !!source;
  const shownFields = useMemo(() => shownLookupFields(source), [source]);
  const previewFields = useMemo(
    () => previewableLookupFields(source?.fields),
    [source],
  );
  // Never picked means every field, so the list starts with all of them ticked
  const previewIds = useMemo(
    () =>
      value.previewFieldIds ?? [
        ...previewFields.map((previewField) => previewField.objId),
        LOOKUP_CREATE_TIME_ID,
      ],
    [value.previewFieldIds, previewFields],
  );
  const previewEnabled = value.previewEnabled ?? true;
  const pickLink = useCallback(
    (linkFieldId: string) => {
      const picked = sourceOf(
        linkFields?.find((entry) => entry?.objId === linkFieldId),
      );
      onChange({
        linkFieldId,
        categoryId: picked?.sidebarId,
        lookupFieldId: shownLookupFields(picked)[0]?.objId,
        previewEnabled: value.previewEnabled ?? true,
        previewFieldIds: [
          ...previewableLookupFields(picked?.fields).map(
            (previewField) => previewField.objId,
          ),
          LOOKUP_CREATE_TIME_ID,
        ],
      });
    },
    [sourceOf, linkFields, value.previewEnabled, onChange],
  );
  const togglePreviewField = useCallback(
    (id: string, checked: boolean) =>
      onChange({
        ...value,
        previewFieldIds: checked
          ? [...previewIds.filter((previewId) => previewId !== id), id]
          : previewIds.filter((previewId) => previewId !== id),
      }),
    [value, previewIds, onChange],
  );
  const previewOptions = useMemo(
    () => [
      ...previewFields.map((previewField) => ({
        id: previewField.objId,
        name: previewField.name,
        type: previewField.type,
      })),
      {
        id: LOOKUP_CREATE_TIME_ID,
        name: "Create time",
        type: "ds_create_time" as IField["type"],
      },
    ],
    [previewFields],
  );

  if (!linkFields?.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center">
        <Link2 className="size-5 text-muted-foreground" />
        <p className="text-sm font-medium">No available sources to look up.</p>
        <p className="text-xs text-muted-foreground">
          Add a lookup source, then try to configure your lookup again.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="field-lookup-link">Look up records in</FieldLabel>
        <Select value={value.linkFieldId ?? ""} onValueChange={pickLink}>
          <SelectTrigger id="field-lookup-link" className="w-full">
            <SelectValue placeholder="Choose a link record">
              {linkField?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" searchable>
            {linkFields?.map((entry) => (
              <SelectItem
                key={entry.objId}
                value={entry.objId}
                textValue={entry.name}
              >
                <FieldTypeIcon type={entry.type} />
                {entry.name}
                <span className="text-muted-foreground">
                  {sourceOf(entry)?.sidebarText}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Only link to another record fields of this table are listed.
        </p>
      </Field>
      {ready && (
        <Field>
          <FieldLabel htmlFor="field-lookup-shown">Field to show</FieldLabel>
          <Select
            value={value.lookupFieldId ?? ""}
            onValueChange={(lookupFieldId) =>
              onChange({ ...value, lookupFieldId })
            }
          >
            <SelectTrigger id="field-lookup-shown" className="w-full">
              <SelectValue placeholder="Choose a field" />
            </SelectTrigger>
            <SelectContent position="popper" searchable>
              {shownFields.map((shown) => (
                <SelectItem
                  key={shown.objId}
                  value={shown.objId}
                  textValue={shown.name}
                >
                  <FieldTypeIcon type={shown.type} />
                  {shown.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {shownFields.length
              ? `Shown for each ${source?.sidebarText} record linked in ${linkField?.name}.`
              : `${source?.sidebarText} has no text, number, select, date or member field to show yet.`}
          </p>
        </Field>
      )}
      {ready && (
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <Checkbox
              checked={previewEnabled}
              onCheckedChange={(checked) =>
                onChange({ ...value, previewEnabled: checked === true })
              }
              className="mt-0.5"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">Fields to preview</span>
              <span className="text-xs text-muted-foreground">
                {previewEnabled
                  ? "Shown when you preview a linked record from an open record."
                  : "No preview for this field. Your picked fields are kept for when you turn it back on."}
              </span>
            </span>
          </label>
          {previewEnabled && (
            <div
              role="group"
              aria-label="Fields to preview"
              className="ml-6 flex max-h-56 flex-col gap-0.5 overflow-y-auto rounded-lg border p-1"
            >
              {previewOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={previewIds.includes(option.id)}
                    onCheckedChange={(checked) =>
                      togglePreviewField(option.id, checked === true)
                    }
                  />
                  <FieldTypeIcon type={option.type} />
                  <span className="truncate">{option.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FieldDateSettings({
  value,
  onChange,
  timeOnly = false,
}: ModuleFieldDateSettingsProps) {
  const sample = useMemo(() => new Date(), []);
  const preview = useMemo(
    () => format(sample, timeOnly ? value.timeFormat : fieldDateFormat(value)),
    [sample, value, timeOnly],
  );

  return (
    <div className="flex flex-col gap-4">
      {!timeOnly && (
        <Field>
          <FieldLabel htmlFor="field-date-format">Date format</FieldLabel>
          <Select
            value={value.dateFormat}
            onValueChange={(dateFormat) =>
              onChange({
                ...value,
                dateFormat: dateFormat as IField["dateFormat"],
              })
            }
          >
            <SelectTrigger id="field-date-format" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {FIELD_DATE_FORMATS.map((dateFormat) => (
                <SelectItem key={dateFormat} value={dateFormat}>
                  {format(sample, dateFormat)}
                  <span className="text-muted-foreground">{dateFormat}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      {!timeOnly && (
        <label className="flex items-center justify-between gap-3 text-sm font-medium">
          Include time
          <Switch
            checked={value.displayTime}
            onCheckedChange={(displayTime) =>
              onChange({ ...value, displayTime })
            }
          />
        </label>
      )}
      {(timeOnly || value.displayTime) && (
        <Field>
          <FieldLabel htmlFor="field-time-format">Time format</FieldLabel>
          <Select
            value={value.timeFormat}
            onValueChange={(timeFormat) =>
              onChange({
                ...value,
                timeFormat: timeFormat as IField["timeFormat"],
              })
            }
          >
            <SelectTrigger id="field-time-format" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {FIELD_TIME_FORMATS.map((timeFormat) => (
                <SelectItem key={timeFormat.value} value={timeFormat.value}>
                  {timeFormat.label}
                  <span className="text-muted-foreground">
                    {format(sample, timeFormat.value)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      <p className="text-xs text-muted-foreground">
        Shows as <span className="font-medium text-foreground">{preview}</span>
      </p>
    </div>
  );
}

function FieldNumberSettings({
  value,
  onChange,
  withSymbol = false,
}: ModuleFieldNumberSettingsProps) {
  const symbol = withSymbol ? value.symbol : "";
  const preview = useMemo(
    () => formatNumber(1234567.89, { ...value, symbol }),
    [value, symbol],
  );
  const presetLabels = useMemo(
    () =>
      NUMBER_PRESETS.map((preset) =>
        formatNumber(preset.sample, { ...preset.settings, symbol }),
      ),
    [symbol],
  );
  const selectedPreset = useMemo(() => {
    const index = NUMBER_PRESETS.findIndex(
      (preset) =>
        preset.settings.decimalPlaces === value.decimalPlaces &&
        preset.settings.abbreviation === value.abbreviation,
    );
    return index < 0 ? "" : String(index);
  }, [value.decimalPlaces, value.abbreviation]);

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="field-number-presets">Presets</FieldLabel>
        <Select
          value={selectedPreset}
          onValueChange={(index) =>
            onChange({ ...value, ...NUMBER_PRESETS[Number(index)]?.settings })
          }
        >
          <SelectTrigger id="field-number-presets" className="w-full">
            <SelectValue placeholder="Select presets" />
          </SelectTrigger>
          <SelectContent position="popper">
            {presetLabels.map((label, index) => (
              <SelectItem key={label} value={String(index)}>
                <span className="tabular-nums">{label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {withSymbol && (
        <Field>
          <FieldLabel htmlFor="field-currency-symbol">
            Currency symbol
          </FieldLabel>
          <Input
            id="field-currency-symbol"
            maxLength={5}
            value={value.symbol}
            placeholder="e.g. $ or RM"
            onChange={(e) => onChange({ ...value, symbol: e.target.value })}
          />
        </Field>
      )}
      <Field>
        <FieldLabel htmlFor="field-number-decimals">Decimal places</FieldLabel>
        <Select
          value={
            value.decimalPlaces === undefined ? "" : String(value.decimalPlaces)
          }
          onValueChange={(decimalPlaces) =>
            onChange({ ...value, decimalPlaces: Number(decimalPlaces) })
          }
        >
          <SelectTrigger id="field-number-decimals" className="w-full">
            <SelectValue placeholder="Select decimal places" />
          </SelectTrigger>
          <SelectContent position="popper">
            {NUMBER_DECIMAL_PLACES.map((decimalPlaces) => (
              <SelectItem key={decimalPlaces} value={String(decimalPlaces)}>
                {decimalPlaces}
                <span className="ml-auto text-muted-foreground tabular-nums">
                  {formatNumber(1, { symbol, decimalPlaces })}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="field-number-abbreviation">
          Large number abbreviation
        </FieldLabel>
        <Select
          value={value.abbreviation}
          onValueChange={(abbreviation) =>
            onChange({
              ...value,
              abbreviation: abbreviation as NumberSettings["abbreviation"],
            })
          }
        >
          <SelectTrigger id="field-number-abbreviation" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {Object.entries(NUMBER_ABBREVIATIONS).map(
              ([abbreviation, { label, suffix }]) => (
                <SelectItem key={abbreviation} value={abbreviation}>
                  {label}
                  {suffix && (
                    <span className="ml-auto text-muted-foreground">
                      {suffix}
                    </span>
                  )}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </Field>
      <p className="text-xs text-muted-foreground">
        Shows as{" "}
        <span className="font-medium text-foreground tabular-nums">
          {preview}
        </span>
      </p>
    </div>
  );
}

function FieldOptionsEditor({
  options,
  onChange,
}: ModuleFieldOptionsEditorProps) {
  const [focusId, setFocusId] = useState<string>();
  const ids = useMemo(() => options?.map((option) => option?.id), [options]);
  const addOption = useCallback(() => {
    const next = createDropDownValue(
      options?.length ?? 0,
      nextOptionValue(options),
    );
    onChange([...(options ?? []), next]);
    setFocusId(next.id);
  }, [options, onChange]);
  const changeOption = useCallback(
    (changed: IFieldDropDownValue) =>
      onChange(
        options.map((option) => (option.id === changed.id ? changed : option)),
      ),
    [options, onChange],
  );
  const removeOption = useCallback(
    (id: string) => onChange(options.filter((option) => option.id !== id)),
    [options, onChange],
  );
  const reorder = useCallback(
    (ordered: string[]) =>
      onChange(
        ordered.flatMap((id) => options.filter((option) => option.id === id)),
      ),
    [options, onChange],
  );

  return (
    <div className="flex flex-col gap-2 justify-end w-full">
      <SortableList ids={ids} onReorder={reorder}>
        {options?.map((option, index) => (
          <FieldOptionRow
            key={option.id}
            option={option}
            index={index}
            removable={options.length > 1}
            autoFocus={option.id === focusId}
            onChange={changeOption}
            onRemove={removeOption}
            onEnter={addOption}
          />
        ))}
      </SortableList>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="xs"
          className="self-start"
          onClick={addOption}
          startIcon={<Plus size={13} />}
        >
          Add option
        </Button>
      </div>
    </div>
  );
}

function FieldOptionRow({
  option,
  index,
  removable,
  autoFocus,
  onChange,
  onRemove,
  onEnter,
}: ModuleFieldOptionRowProps) {
  const { ref, style, isDragging, handle } = useSortableRow(option?.id);
  const label = option?.value?.trim() || `option ${index + 1}`;

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "flex items-center gap-1.5 rounded-lg",
        isDragging && "relative z-10 bg-popover shadow-md",
      )}
    >
      <SortableHandle handle={handle} label={label} />
      <FieldOptionColorPicker
        value={option?.colorCode}
        label={`Color for ${label}`}
        onChange={(colorCode) => onChange({ ...option, colorCode })}
      />
      <Input
        value={option?.value}
        autoFocus={autoFocus}
        onFocus={(e) => autoFocus && e.target.select()}
        aria-label={`Option ${index + 1}`}
        placeholder={`Option ${index + 1}`}
        onChange={(e) => onChange({ ...option, value: e.target.value })}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          onEnter();
        }}
      />
      <Button
        variant="outline"
        size="icon-xs"
        aria-label={`Remove ${label}`}
        disabled={!removable}
        onClick={() => onRemove(option?.id)}
        startIcon={<X size={13} />}
      />
    </div>
  );
}

function FieldOptionColorPicker({
  value,
  label,
  onChange,
}: ModuleFieldOptionColorPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border hover:bg-muted"
        >
          <span
            className="size-4 rounded-full ring-1 ring-foreground/10"
            style={{ backgroundColor: value }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div
          role="radiogroup"
          aria-label={label}
          className="grid grid-cols-4 gap-1.5"
        >
          {presetColors.map((color) => {
            const selected = color.toUpperCase() === value?.toUpperCase();
            return (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={color}
                title={color}
                onClick={() => {
                  onChange(color);
                  setOpen(false);
                }}
                className="flex size-7 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                style={{ backgroundColor: color }}
              >
                {selected && (
                  <Check
                    className="size-3.5"
                    style={{ color: getContrastColor(color) }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
