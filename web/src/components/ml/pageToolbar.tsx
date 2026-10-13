import { useCallback, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ChevronsUpDown,
  Columns3,
  GripVertical,
  Download,
  ListFilter,
  Search,
  Trash2,
  X,
  PlusIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ModuleAddNewButton } from "./moduleAddNewButton";
import { Switch } from "@/components/ui/switch";
import type {
  FieldsDropdownItemProps,
  FieldsDropdownProps,
  FilterDropdownProps,
  PageToolbarProps,
  ToolbarTooltipProps,
  ModuleAppViewDropdownProps,
} from "./pageToolbar.types";
import { toast } from "@/components/ui/sonner";
import {
  countActiveFilters,
  PAGE_TOOLBAR_COMPACT_WIDTH,
  PAGE_TOOLBAR_VIEWS,
  sameFilterValue,
  toggleFilterValue,
} from "./pageToolbar.utils";

/**
 * Row under the page header: add record, view, filter and export on the left, search on the right.
 * @example
 * <ModulePageToolbar onAdd={create} inputOptions={[{ key: "status", label: "Status", options }]} filterValue={filter} onFilterChange={setFilter} search={search} onSearchChange={setSearch} />
 */
export function ModulePageToolbar({
  onAdd,
  addLabel = "Add record",
  views = PAGE_TOOLBAR_VIEWS,
  view,
  onViewChange,
  inputOptions,
  filterValue,
  onFilterChange,
  columnOptions,
  hiddenColumns,
  onHiddenColumnsChange,
  onColumnOrderChange,
  onExport,
  exportLabel = "Export",
  search,
  onSearchChange,
  searchPlaceholder = "Search",
  className,
  selectedCount = 0,
  onDeleteSelected,
  onCancelSelection,
}: PageToolbarProps) {
  const [compact, setCompact] = useState(false);
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setCompact((entry?.contentRect?.width ?? 0) < PAGE_TOOLBAR_COMPACT_WIDTH),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (selectedCount > 0) {
    return (
      <div
        ref={measureRef}
        className={cn(
          "flex min-h-[41px] items-center gap-2 border-b bg-primary-10 p-4 py-1",
          className,
        )}
      >
        <Button
          variant="destructive"
          size="xs"
          onClick={onDeleteSelected}
          disabled={!onDeleteSelected}
          startIcon={<Trash2 size={13} />}
        >
          Delete ({selectedCount})
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="ml-auto"
          onClick={onCancelSelection}
          startIcon={<X size={13} />}
        >
          Cancel selection
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={measureRef}
      className={cn(
        "flex min-h-10 items-center gap-2 border-b p-4 py-1",
        className,
      )}
    >
      {onAdd && <ModuleAddNewButton label={addLabel} onClick={onAdd} />}
      {columnOptions?.length && onHiddenColumnsChange ? (
        <FieldsDropdown
          fields={columnOptions}
          hidden={hiddenColumns ?? []}
          onChange={onHiddenColumnsChange}
          onReorder={onColumnOrderChange}
          compact={compact}
        />
      ) : null}
      {onViewChange && views?.length ? (
        <ModuleAppViewDropdown
          views={views}
          value={view}
          onChange={onViewChange}
          compact={compact}
        />
      ) : null}
      {inputOptions?.length ? (
        <FilterDropdown
          inputOptions={inputOptions}
          value={filterValue}
          onChange={onFilterChange}
          compact={compact}
        />
      ) : null}
      {/* {onExport && (
        <ToolbarTooltip label={exportLabel} enabled={compact}>
          <Button
            variant="outline"
            size={compact ? "icon-xs" : "xs"}
            onClick={onExport}
            aria-label={exportLabel}
            startIcon={<Download size={13} />}
          >
            {!compact && exportLabel}
          </Button>
        </ToolbarTooltip>
      )} */}
      {onSearchChange && (
        <InputGroup className="ml-auto w-48 min-w-28 shrink bg-background">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </InputGroup>
      )}
    </div>
  );
}

function ModuleAppViewDropdown({
  views,
  value,
  onChange,
  compact = false,
}: ModuleAppViewDropdownProps) {
  const [open, setOpen] = useState(false);
  const current = useMemo(
    () => views?.find((option) => option?.value === value) ?? views?.[0],
    [views, value],
  );
  const [draft, setDraft] = useState(current?.value);
  const CurrentIcon = current?.icon;
  const draftOption = useMemo(
    () => views?.find((option) => option?.value === draft),
    [views, draft],
  );

  const changeOpen = useCallback(
    (next: boolean) => {
      if (next) setDraft(current?.value);
      setOpen(next);
    },
    [current?.value],
  );
  const apply = useCallback(() => {
    if (!draft) return;
    onChange(draft);
    setOpen(false);
    toast.success("View changed", {
      description: `Showing records in ${draftOption?.label?.toLowerCase()}.`,
    });
  }, [draft, draftOption?.label, onChange]);

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <ToolbarTooltip label={`View: ${current?.label}`} enabled={compact}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size={compact ? "icon-xs" : "xs"}
            role="combobox"
            aria-expanded={open}
            aria-label="Change view"
            className="gap-1.5"
          >
            {CurrentIcon && <CurrentIcon className="size-3.5" />}
            {!compact && (
              <>
                {current?.label}
                <ChevronsUpDown className="size-3.5 text-muted-foreground" />
              </>
            )}
          </Button>
        </PopoverTrigger>
      </ToolbarTooltip>
      <PopoverContent align="start" className="w-48 p-0">
        <Command>
          <CommandInput placeholder="Search view..." />
          <CommandList>
            <CommandEmpty>No view found.</CommandEmpty>
            <CommandGroup>
              {views?.map((option) => {
                const Icon = option?.icon;
                return (
                  <CommandItem
                    key={option?.value}
                    value={option?.label}
                    data-checked={option?.value === draft}
                    onSelect={() => setDraft(option?.value)}
                  >
                    {Icon && <Icon />}
                    {option?.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="flex justify-end border-t p-2">
          <Button
            size="xs"
            onClick={apply}
            disabled={!draft || draft === current?.value}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterDropdown({
  inputOptions,
  value,
  onChange,
  compact = false,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? {});
  const activeCount = useMemo(() => countActiveFilters(value), [value]);
  const draftCount = useMemo(() => countActiveFilters(draft), [draft]);
  const changed = useMemo(() => !sameFilterValue(draft, value), [draft, value]);

  const changeOpen = useCallback(
    (next: boolean) => {
      if (next) setDraft(value ?? {});
      setOpen(next);
    },
    [value],
  );
  const toggle = useCallback(
    (key: string, option: string, checked: boolean) =>
      setDraft((current) => toggleFilterValue(current, key, option, checked)),
    [],
  );
  const apply = useCallback(() => {
    onChange?.(draft);
    setOpen(false);
    toast.success("Filters applied", {
      description:
        draftCount > 0
          ? `${draftCount} ${draftCount === 1 ? "filter is" : "filters are"} on.`
          : "Showing all records.",
    });
  }, [draft, draftCount, onChange]);

  return (
    <DropdownMenu open={open} onOpenChange={changeOpen}>
      <ToolbarTooltip
        label={activeCount > 0 ? `Filter (${activeCount} on)` : "Filter"}
        enabled={compact}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={compact ? "icon-xs" : "xs"}
            aria-label="Filter"
            className="relative"
            startIcon={<ListFilter size={13} />}
          >
            {!compact && "Filter"}
            {activeCount > 0 && (
              <span
                className={cn(
                  "rounded-full bg-primary text-primary-foreground tabular-nums",
                  compact
                    ? "absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center text-[10px]"
                    : "px-1.5 text-xs leading-5",
                )}
              >
                {activeCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
      </ToolbarTooltip>
      <DropdownMenuContent align="start" className="w-56">
        {inputOptions.map((input, index) => (
          <DropdownMenuGroup key={input?.key}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{input?.label}</DropdownMenuLabel>
            {input?.options?.map((option) => (
              <DropdownMenuCheckboxItem
                key={option?.value}
                checked={draft?.[input.key]?.includes(option?.value) ?? false}
                onCheckedChange={(checked) =>
                  toggle(input.key, option?.value, checked)
                }
                onSelect={(e) => e.preventDefault()}
              >
                {option?.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        ))}
        {draftCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setDraft({});
              }}
            >
              Clear filters
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <div className="flex justify-end p-1">
          <Button size="xs" onClick={apply} disabled={!changed}>
            Apply
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const lockToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

function FieldsDropdown({
  fields,
  hidden,
  onChange,
  onReorder,
  compact = false,
}: FieldsDropdownProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const keys = useMemo(() => fields?.map((field) => field?.key), [fields]);
  const visibleCount = useMemo(
    () => fields?.filter((field) => !hidden?.includes(field?.key)).length,
    [fields, hidden],
  );
  const toggle = useCallback(
    (key: string) =>
      onChange(
        hidden?.includes(key)
          ? hidden.filter((hiddenKey) => hiddenKey !== key)
          : [...(hidden ?? []), key],
      ),
    [hidden, onChange],
  );
  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active?.id === over?.id) return;
      onReorder?.(
        arrayMove(
          keys,
          keys.indexOf(String(active.id)),
          keys.indexOf(String(over.id)),
        ),
      );
    },
    [keys, onReorder],
  );

  return (
    <DropdownMenu>
      <ToolbarTooltip label="Fields" enabled={compact}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={compact ? "icon-xs" : "xs"}
            aria-label="Fields"
            startIcon={<Columns3 size={13} />}
          >
            {!compact && "Fields"}
          </Button>
        </DropdownMenuTrigger>
      </ToolbarTooltip>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Show Fields</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <PlusIcon size={13} />
            Add Field
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[lockToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={keys} strategy={verticalListSortingStrategy}>
            {fields?.map((field) => {
              const shown = !hidden?.includes(field?.key);
              return (
                <FieldsDropdownItem
                  key={field?.key}
                  field={field}
                  shown={shown}
                  locked={shown && visibleCount <= 1}
                  sortable={!!onReorder}
                  onToggle={toggle}
                />
              );
            })}
          </SortableContext>
        </DndContext>
        {hidden?.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onChange([]);
              }}
            >
              Show all fields
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FieldsDropdownItem({
  field,
  shown,
  locked,
  sortable,
  onToggle,
}: FieldsDropdownItemProps) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field?.key, disabled: !sortable });
  const style = useMemo(
    () => ({
      transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
      transition,
    }),
    [transform, transition],
  );

  return (
    <DropdownMenuItem
      ref={setNodeRef}
      style={style}
      className={cn(
        "gap-2 pl-1",
        isDragging && "relative z-10 bg-muted shadow-sm",
      )}
      onSelect={(e) => {
        e.preventDefault();
        if (!locked) onToggle(field?.key);
      }}
    >
      {sortable && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...listeners}
          tabIndex={-1}
          aria-label={`Drag to reorder ${field?.label}`}
          onClick={(e) => e.stopPropagation()}
          className="flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-foreground/10 active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" />
        </button>
      )}
      <span className="flex-1 truncate">{field?.label}</span>
      <Switch
        size="sm"
        checked={shown}
        disabled={locked}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none"
      />
    </DropdownMenuItem>
  );
}

function ToolbarTooltip({ label, enabled, children }: ToolbarTooltipProps) {
  if (!enabled) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
