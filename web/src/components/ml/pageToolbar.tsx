import { useCallback, useMemo, useState } from "react";
import {
  Columns3,
  Search,
  Trash2,
  X,
  PlusIcon,
  SquarePenIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleAddNewFieldDialog } from "./moduleAddNewFieldDialog";
import { SortableHandle, SortableList } from "@/components/custom/SortableList";
import { useSortableRow } from "@/hooks/useSortableRow";
import { FieldTypeIcon } from "../custom/fieldTypeIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
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
  PageToolbarProps,
  ToolbarTooltipProps,
} from "./pageToolbar.types";
import { PAGE_TOOLBAR_COMPACT_WIDTH } from "./pageToolbar.utils";

/**
 * Row under the page header: add record and fields on the left, search on the right.
 * @example
 * <ModulePageToolbar onAdd={create} search={search} onSearchChange={setSearch} />
 */
export function ModulePageToolbar({
  onAdd,
  addLabel = "Add record",
  columnOptions,
  hiddenColumns,
  onHiddenColumnsChange,
  onColumnOrderChange,
  onAddField,
  onEditField,
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
          "flex min-h-[41px] items-center gap-2 border-b p-4 py-1",
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
      {(columnOptions?.length || onAddField) && onHiddenColumnsChange ? (
        <FieldsDropdown
          columnOptions={columnOptions ?? []}
          hiddenColumns={hiddenColumns ?? []}
          onHiddenColumnsChange={onHiddenColumnsChange}
          onColumnOrderChange={onColumnOrderChange}
          onAddField={onAddField}
          onEditField={onEditField}
          compact={compact}
        />
      ) : null}
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

function FieldsDropdown({
  columnOptions: fields,
  hiddenColumns: hidden,
  onHiddenColumnsChange: onChange,
  onColumnOrderChange: onReorder,
  onAddField,
  onEditField,
  compact = false,
}: FieldsDropdownProps) {
  const [addingField, setAddingField] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fieldNames = useMemo(
    () =>
      fields?.filter((field) => !field?.system).map((field) => field?.label) ??
      [],
    [fields],
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
  const reorder = useCallback(
    (ordered: string[]) => onReorder?.(ordered),
    [onReorder],
  );
  const editField = useCallback(
    (key: string) => {
      setMenuOpen(false);
      onEditField?.(key);
    },
    [onEditField],
  );

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <ToolbarTooltip label="Fields" enabled={compact}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size={compact ? "icon-xs" : "xs"}
              aria-label="Fields"
              startIcon={<Columns3 size={13} />}
            >
              {!compact && "Edit Fields"}
            </Button>
          </DropdownMenuTrigger>
        </ToolbarTooltip>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Show Fields</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {onAddField && (
            <>
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => setAddingField(true)}>
                  <PlusIcon size={11} />
                  <span className="text-xs">Add Field</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}
          <SortableList ids={keys} onReorder={reorder}>
            <DropdownMenuGroup>
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
                    onEdit={
                      field?.system || !onEditField ? undefined : editField
                    }
                  />
                );
              })}
            </DropdownMenuGroup>
          </SortableList>
          {!fields?.length && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No fields yet.
            </p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {onAddField && (
        <ModuleAddNewFieldDialog
          open={addingField}
          onOpenChange={setAddingField}
          onAdd={onAddField}
          takenNames={fieldNames}
        />
      )}
    </>
  );
}

function FieldsDropdownItem({
  field,
  shown,
  locked,
  sortable,
  onToggle,
  onEdit,
}: FieldsDropdownItemProps) {
  const { ref, style, isDragging, handle } = useSortableRow(
    field?.key,
    !sortable,
  );

  return (
    <DropdownMenuItem
      ref={ref}
      style={style}
      className={cn(
        "group/field gap-2 pl-1",
        isDragging && "relative z-10 bg-muted shadow-sm",
      )}
      onSelect={(e) => {
        e.preventDefault();
        if (!locked) onToggle(field?.key);
      }}
    >
      {sortable && (
        <SortableHandle
          handle={handle}
          label={field?.label}
          tabIndex={-1}
          className="size-5"
        />
      )}

      <FieldTypeIcon type={field?.type} size={11} />
      <span className="flex-1 truncate">{field?.label}</span>
      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          // size="xs"
          tabIndex={-1}
          aria-label={`Edit ${field?.label}`}
          title="Edit field"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(field?.key);
          }}
          startIcon={<SquarePenIcon className="size-4" />}
          className="hidden size-5 p-2 text-muted-foreground group-hover/field:inline-flex group-data-highlighted/field:inline-flex"
        />
      )}
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
