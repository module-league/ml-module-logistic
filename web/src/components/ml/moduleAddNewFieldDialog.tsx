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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import type {
  ModuleAddFieldStepsProps,
  ModuleAddNewFieldDialogProps,
  ModuleFieldOptionColorPickerProps,
  ModuleFieldOptionRowProps,
  ModuleFieldOptionsEditorProps,
  ModuleFieldPreviewProps,
  ModuleFieldTypeCardProps,
} from "./moduleAddNewField.types";
import {
  createDropDownValue,
  fieldTypeOption,
  isFieldNameTaken,
  lockToVerticalAxis,
  MODULE_FIELD_TYPES,
  nextOptionValue,
  toField,
} from "./moduleAddNewField.utils";

/**
 * Two-step dialog: pick a field type, then name it. A select also lists its choices with a color and order. Builds an {@link IField}.
 * @example
 * <ModuleAddNewFieldDialog open={open} onOpenChange={setOpen} onAdd={addColumn} />
 */
export function ModuleAddNewFieldDialog({
  open,
  onOpenChange,
  onAdd,
  takenNames,
}: ModuleAddNewFieldDialogProps) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const add = useCallback(
    (field: IField) => {
      onAdd(field);
      onOpenChange(false);
      toast.success("Field added", {
        description: `${field.name} was added as a ${fieldTypeOption(field.type)?.label.toLowerCase()} field.`,
      });
    },
    [onAdd, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(620px,90dvh)] flex-col gap-0 p-0 sm:max-w-lg">
        <AddFieldSteps onAdd={add} onCancel={close} takenNames={takenNames} />
      </DialogContent>
    </Dialog>
  );
}

function AddFieldSteps({
  onAdd,
  onCancel,
  takenNames,
}: ModuleAddFieldStepsProps) {
  const [type, setType] = useState<IField["type"] | null>(null);
  const [name, setName] = useState("");
  const [options, setOptions] = useState<IFieldDropDownValue[]>(() => [
    createDropDownValue(0),
    createDropDownValue(1),
  ]);
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
    });
  }, [type, name, options]);
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
      if (!draft || !canAdd) return;
      onAdd(draft);
    },
    [draft, canAdd, onAdd],
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
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            {MODULE_FIELD_TYPES.map((fieldType) => (
              <FieldTypeCard
                key={fieldType.value}
                option={fieldType}
                onChoose={setType}
              />
            ))}
          </div>
        </div>
        <DialogFooter className="m-0 shrink-0">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
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
          New {option?.label.toLowerCase()} field
        </DialogTitle>
        <DialogDescription>
          Name the field as it should appear in the table and forms.
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
        </div>
      </div>

      <DialogFooter className="m-0 shrink-0 items-center sm:justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setType(null)}
          startIcon={<ChevronLeft size={14} />}
        >
          Field type
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!canAdd}>
            Add field
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

function FieldTypeCard({ option, onChoose }: ModuleFieldTypeCardProps) {
  const Icon = option?.icon;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={false}
      onClick={() => onChoose(option?.value)}
      className="flex cursor-pointer flex-col gap-2 rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-primary-10 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none"
    >
      <span className="flex size-8 items-center justify-center rounded-md bg-primary-10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="text-sm font-medium">{option?.label}</span>
      <span className="text-xs text-muted-foreground">
        {option?.description}
      </span>
    </button>
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
