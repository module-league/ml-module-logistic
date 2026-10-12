import { useCallback, useMemo, useState } from "react";
import { ChevronsUpDown, Download, ListFilter, Search } from "lucide-react";
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
import type {
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
  onExport,
  exportLabel = "Export",
  search,
  onSearchChange,
  searchPlaceholder = "Search",
  className,
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

  return (
    <div
      ref={measureRef}
      className={cn("flex items-center gap-2 border-b p-4 py-1", className)}
    >
      {onAdd && <ModuleAddNewButton label={addLabel} onClick={onAdd} />}
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
      {onExport && (
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
      )}
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

function ToolbarTooltip({ label, enabled, children }: ToolbarTooltipProps) {
  if (!enabled) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
