import { useCallback, useMemo, useState, type SyntheticEvent } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Check, ChevronLeft, GripVertical, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getContrastColor, presetColors } from "@/lib/colorUtils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
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
import type {
  ModuleAddFieldStepsProps,
  ModuleFieldNumberSettingsProps,
  ModuleFieldDateSettings,
  ModuleFieldDateSettingsProps,
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
  isFieldNameTaken,
  lockToVerticalAxis,
  MODULE_FIELD_TYPES,
  nextOptionValue,
  toField,
  fieldDateDraft,
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
  const [deleting, setDeleting] = useState(false);
  const changeOpen = useCallback(
    (next: boolean) => {
      if (!deleting) onOpenChange(next);
    },
    [deleting, onOpenChange],
  );
  const confirm = useCallback(
    async (event: SyntheticEvent) => {
      event.preventDefault();
      setDeleting(true);
      try {
        await onDelete();
        onOpenChange(false);
        toast.success("Field deleted", {
          description: `${field?.name} was removed from every record.`,
        });
      } catch (error) {
        toast.error("Couldn't delete field", {
          description: errorParser(error)?.message,
        });
      } finally {
        setDeleting(false);
      }
    },
    [field, onDelete, onOpenChange],
  );

  if (!field) return null;

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{field.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The field and its values are removed from every record. This can't
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            size="xs"
            disabled={deleting}
            onClick={() => changeOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="xs"
            disabled={deleting}
            onClick={confirm}
          >
            {deleting ? "Deleting…" : "Delete field"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
    });
  }, [type, name, options, dateSettings, multipleMembers, numberSettings]);
  const nameTaken = useMemo(
    () => isFieldNameTaken(name, takenNames),
    [name, takenNames],
  );
  const canAdd =
    !!draft?.name &&
    !nameTaken &&
    (!draft.isSelectionField || draft.dropDownValues.length > 0);
  const submit = useCallback(
    (event: SyntheticEvent) => {
      event.preventDefault();
      if (!draft || !canAdd || saving) return;
      onAdd(draft);
    },
    [draft, canAdd, saving, onAdd],
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
              aria-invalid={nameTaken || undefined}
              aria-describedby={nameTaken ? "field-label-error" : undefined}
              onChange={(e) => setName(e.target.value)}
            />
            {nameTaken && (
              <p id="field-label-error" className="text-xs text-destructive">
                A field named “{name.trim()}” already exists.
              </p>
            )}
          </Field>
          {type === "single_select" && (
            <Field>
              <FieldLabel>Options</FieldLabel>
              <FieldOptionsEditor options={options} onChange={setOptions} />
            </Field>
          )}
          {type === "date" && (
            <FieldDateSettings
              value={dateSettings}
              onChange={setDateSettings}
            />
          )}
          {(type === "number" || type === "currency") && (
            <FieldNumberSettings
              value={numberSettings}
              onChange={setNumberSettings}
              withSymbol={type === "currency"}
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
          <Button type="submit" size="xs" disabled={!canAdd || saving}>
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

function FieldDateSettings({ value, onChange }: ModuleFieldDateSettingsProps) {
  const sample = useMemo(() => new Date(), []);
  const preview = useMemo(
    () => format(sample, fieldDateFormat(value)),
    [sample, value],
  );

  return (
    <div className="flex flex-col gap-4">
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
      <label className="flex items-center justify-between gap-3 text-sm font-medium">
        Include time
        <Switch
          checked={value.displayTime}
          onCheckedChange={(displayTime) => onChange({ ...value, displayTime })}
        />
      </label>
      {value.displayTime && (
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
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
  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active?.id === over?.id) return;
      onChange(
        arrayMove(
          options,
          ids.indexOf(String(active.id)),
          ids.indexOf(String(over.id)),
        ),
      );
    },
    [options, ids, onChange],
  );

  return (
    <div className="flex flex-col gap-2 justify-end w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[lockToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
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
        </SortableContext>
      </DndContext>
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
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option?.id });
  const style = useMemo(
    () => ({
      transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
      transition,
    }),
    [transform, transition],
  );
  const label = option?.value?.trim() || `option ${index + 1}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1.5 rounded-lg",
        isDragging && "relative z-10 bg-popover shadow-md",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${label}`}
        className="flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-foreground/10 active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </button>
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
