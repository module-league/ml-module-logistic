import { useCallback, useMemo, useState } from "react";
import {
  ChevronsUpDown,
  Download,
  ListFilter,
  Plus,
  Search,
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
import type {
  FilterDropdownProps,
  PageToolbarProps,
  ViewComboboxProps,
} from "./pageToolbar.types";
import {
  countActiveFilters,
  PAGE_TOOLBAR_VIEWS,
  toggleFilterValue,
} from "./pageToolbar.utils";

/**
 * Row under the page header: add record, view, filter and export on the left, search on the right.
 * @example
 * <PageToolbar onAdd={create} inputOptions={[{ key: "status", label: "Status", options }]} filterValue={filter} onFilterChange={setFilter} search={search} onSearchChange={setSearch} />
 */
export function PageToolbar({
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
  return (
    <div
      className={cn("p-4 py-1 flex flex-wrap items-center gap-2", className)}
    >
      {onAdd && (
        <Button size="xs" onClick={onAdd} startIcon={<Plus size={13} />}>
          {addLabel}
        </Button>
      )}
      {onViewChange && views?.length ? (
        <ViewCombobox views={views} value={view} onChange={onViewChange} />
      ) : null}
      {/* {inputOptions?.length ? (
        <FilterDropdown
          inputOptions={inputOptions}
          value={filterValue}
          onChange={onFilterChange}
        />
      ) : null} */}
      {onExport && (
        <Button
          variant="outline"
          size="xs"
          onClick={onExport}
          startIcon={<Download size={13} />}
        >
          {exportLabel}
        </Button>
      )}
      {onSearchChange && (
        <InputGroup className="ml-auto w-full bg-background sm:w-48">
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

function ViewCombobox({ views, value, onChange }: ViewComboboxProps) {
  const [open, setOpen] = useState(false);
  const current = useMemo(
    () => views?.find((option) => option?.value === value) ?? views?.[0],
    [views, value],
  );
  const CurrentIcon = current?.icon;

  const select = useCallback(
    (next: string) => {
      onChange(next);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="xs"
          role="combobox"
          aria-expanded={open}
          aria-label="Change view"
          className="gap-1.5"
        >
          {CurrentIcon && <CurrentIcon className="size-3.5" />}
          {current?.label}
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
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
                    data-checked={option?.value === current?.value}
                    onSelect={() => select(option?.value)}
                  >
                    {Icon && <Icon />}
                    {option?.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function FilterDropdown({ inputOptions, value, onChange }: FilterDropdownProps) {
  const activeCount = useMemo(() => countActiveFilters(value), [value]);

  const toggle = useCallback(
    (key: string, option: string, checked: boolean) =>
      onChange?.(toggleFilterValue(value, key, option, checked)),
    [value, onChange],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="xs"
          startIcon={<ListFilter size={13} />}
        >
          Filter
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-xs leading-5 text-primary-foreground tabular-nums">
              {activeCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {inputOptions.map((input, index) => (
          <DropdownMenuGroup key={input?.key}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{input?.label}</DropdownMenuLabel>
            {input?.options?.map((option) => (
              <DropdownMenuCheckboxItem
                key={option?.value}
                checked={value?.[input.key]?.includes(option?.value) ?? false}
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
        {activeCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange?.({})}>
              Clear filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
