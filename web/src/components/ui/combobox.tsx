import * as React from "react";
import { CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";

type ComboboxContextValue = {
  listId: string;
  multiple: boolean;
  disabled: boolean;
  autoHighlight: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  highlighted: number;
  setHighlighted: (index: number) => void;
  selected: readonly unknown[];
  filtered: readonly unknown[];
  toKey: (item: unknown) => string;
  isSelected: (item: unknown) => boolean;
  toggle: (item: unknown) => void;
  remove: (item: unknown) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  anchorRef: React.RefObject<HTMLDivElement | null>;
};

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null);

function useCombobox() {
  const context = React.useContext(ComboboxContext);
  if (!context) throw new Error("Combobox parts must be used inside <Combobox>.");
  return context;
}

type ComboboxProps<T> = {
  items: readonly T[];
  /** Several items can be picked; otherwise picking one replaces it and closes the list. */
  multiple?: boolean;
  /** Highlights the first match while typing, so Enter picks it. */
  autoHighlight?: boolean;
  value?: T[];
  defaultValue?: T[];
  onValueChange?: (value: T[]) => void;
  /** A unique key per item. @default String(item) */
  itemToStringValue?: (item: T) => string;
  /** The text the search matches against. @default itemToStringValue */
  itemToStringLabel?: (item: T) => string;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

function Combobox<T>({
  items,
  multiple = false,
  autoHighlight = false,
  value,
  defaultValue,
  onValueChange,
  itemToStringValue,
  itemToStringLabel,
  disabled = false,
  onOpenChange,
  children,
}: ComboboxProps<T>) {
  const listId = React.useId();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpenState] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlighted, setHighlighted] = React.useState(autoHighlight ? 0 : -1);
  const [innerValue, setInnerValue] = React.useState<T[]>(defaultValue ?? []);
  const selected = value ?? innerValue;

  const toKey = React.useCallback(
    (item: unknown) => itemToStringValue?.(item as T) ?? String(item),
    [itemToStringValue],
  );
  const toLabel = React.useCallback(
    (item: unknown) => itemToStringLabel?.(item as T) ?? toKey(item),
    [itemToStringLabel, toKey],
  );
  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => toLabel(item).toLowerCase().includes(term));
  }, [items, query, toLabel]);
  const selectedKeys = React.useMemo(
    () => new Set(selected.map((item) => toKey(item))),
    [selected, toKey],
  );

  const setOpen = React.useCallback(
    (next: boolean) => {
      setOpenState(next);
      onOpenChange?.(next);
      if (!next) setQuery("");
    },
    [onOpenChange],
  );
  const commit = React.useCallback(
    (next: T[]) => {
      if (value === undefined) setInnerValue(next);
      onValueChange?.(next);
    },
    [value, onValueChange],
  );
  const isSelected = React.useCallback(
    (item: unknown) => selectedKeys.has(toKey(item)),
    [selectedKeys, toKey],
  );
  const remove = React.useCallback(
    (item: unknown) =>
      commit(selected.filter((current) => toKey(current) !== toKey(item))),
    [commit, selected, toKey],
  );
  const toggle = React.useCallback(
    (item: unknown) => {
      setQuery("");
      if (!multiple) {
        commit([item as T]);
        setOpen(false);
        return;
      }
      if (isSelected(item)) remove(item);
      else commit([...selected, item as T]);
    },
    [multiple, commit, setOpen, isSelected, remove, selected],
  );

  const context = React.useMemo<ComboboxContextValue>(
    () => ({
      listId,
      multiple,
      disabled,
      autoHighlight,
      open,
      setOpen,
      query,
      setQuery,
      highlighted,
      setHighlighted,
      selected,
      filtered,
      toKey,
      isSelected,
      toggle,
      remove,
      inputRef,
      anchorRef,
    }),
    [
      listId,
      multiple,
      disabled,
      autoHighlight,
      open,
      setOpen,
      query,
      highlighted,
      selected,
      filtered,
      toKey,
      isSelected,
      toggle,
      remove,
    ],
  );

  return (
    <ComboboxContext.Provider value={context}>
      <Popover open={open} onOpenChange={setOpen}>
        {children}
      </Popover>
    </ComboboxContext.Provider>
  );
}

function ComboboxValue<T = string>({
  children,
}: {
  children: (values: T[]) => React.ReactNode;
}) {
  const { selected } = useCombobox();
  return <>{children(selected as T[])}</>;
}

function ComboboxChips({
  className,
  ref,
  onClick,
  ...props
}: React.ComponentProps<"div">) {
  const { inputRef, anchorRef, disabled } = useCombobox();
  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      anchorRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [anchorRef, ref],
  );

  return (
    <div
      ref={setRefs}
      data-slot="combobox-chips"
      data-disabled={disabled || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!disabled) inputRef.current?.focus();
      }}
      className={cn(
        "flex min-h-8 cursor-text flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent bg-clip-padding px-2.5 py-1 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-data-[slot=combobox-chip]:px-1 data-disabled:cursor-not-allowed data-disabled:opacity-50 dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxChip({
  value,
  className,
  children,
  showRemove = true,
}: {
  /** The item this chip shows; needed for its remove button. */
  value?: unknown;
  className?: string;
  children: React.ReactNode;
  showRemove?: boolean;
}) {
  const { remove, disabled } = useCombobox();
  const removable = showRemove && value !== undefined && !disabled;

  return (
    <span
      data-slot="combobox-chip"
      className={cn(
        "flex h-[calc(--spacing(5.25))] w-fit max-w-full items-center justify-center gap-1 rounded-sm bg-muted px-1.5 text-xs font-medium whitespace-nowrap text-foreground",
        removable && "pr-0",
        className,
      )}
    >
      {children}
      {removable && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Remove"
          data-slot="combobox-chip-remove"
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.stopPropagation();
            remove(value);
          }}
          className="-ml-1 size-5 text-current opacity-50 hover:opacity-100"
        >
          <XIcon className="pointer-events-none size-3" />
        </Button>
      )}
    </span>
  );
}

function ComboboxChipsInput({
  className,
  placeholder,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange">) {
  const {
    listId,
    open,
    setOpen,
    query,
    setQuery,
    highlighted,
    setHighlighted,
    autoHighlight,
    filtered,
    selected,
    toggle,
    remove,
    disabled,
    inputRef,
  } = useCombobox();

  const move = (step: number) => {
    if (!filtered.length) return;
    setOpen(true);
    setHighlighted((highlighted + step + filtered.length) % filtered.length);
  };

  return (
    <input
      ref={inputRef}
      role="combobox"
      aria-expanded={open}
      aria-controls={listId}
      aria-autocomplete="list"
      data-slot="combobox-chip-input"
      disabled={disabled}
      value={query}
      placeholder={selected.length ? undefined : placeholder}
      onFocus={() => setOpen(true)}
      onChange={(event) => {
        setQuery(event.target.value);
        setOpen(true);
        setHighlighted(autoHighlight ? 0 : -1);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          move(1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          move(-1);
        } else if (event.key === "Enter" && open && filtered[highlighted] !== undefined) {
          event.preventDefault();
          toggle(filtered[highlighted]);
        } else if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
        } else if (event.key === "Backspace" && !query && selected.length) {
          remove(selected[selected.length - 1]);
        }
      }}
      className={cn(
        "min-w-16 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxContent({
  anchor,
  className,
  children,
}: {
  /** The element the list opens under, from useComboboxAnchor(). */
  anchor?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  children: React.ReactNode;
}) {
  const { anchorRef, inputRef } = useCombobox();
  const target = anchor ?? anchorRef;

  return (
    <>
      <PopoverAnchor
        virtualRef={target as React.ComponentProps<typeof PopoverAnchor>["virtualRef"]}
      />
      <PopoverContent
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          const node = event.target as Node | null;
          if (target.current?.contains(node) || inputRef.current?.contains(node)) {
            event.preventDefault();
          }
        }}
        className={cn(
          "w-(--radix-popover-trigger-width) min-w-48 gap-0 p-1",
          className,
        )}
      >
        {children}
      </PopoverContent>
    </>
  );
}

function ComboboxList<T = string>({
  className,
  children,
}: {
  className?: string;
  children: (item: T, index: number) => React.ReactNode;
}) {
  const { listId, filtered, multiple } = useCombobox();
  if (!filtered.length) return null;

  return (
    <div
      id={listId}
      role="listbox"
      aria-multiselectable={multiple || undefined}
      data-slot="combobox-list"
      className={cn("max-h-64 overflow-y-auto", className)}
    >
      {filtered.map((item, index) => children(item as T, index))}
    </div>
  );
}

function ComboboxItem({
  value,
  className,
  children,
}: {
  value: unknown;
  className?: string;
  children: React.ReactNode;
}) {
  const { filtered, highlighted, setHighlighted, isSelected, toggle, toKey } =
    useCombobox();
  const index = React.useMemo(
    () => filtered.findIndex((item) => toKey(item) === toKey(value)),
    [filtered, toKey, value],
  );
  const selected = isSelected(value);

  return (
    <div
      role="option"
      aria-selected={selected}
      data-highlighted={index === highlighted || undefined}
      data-slot="combobox-item"
      onMouseEnter={() => setHighlighted(index)}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => toggle(value)}
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        className,
      )}
    >
      {children}
      {selected && (
        <CheckIcon className="pointer-events-none absolute right-2 size-4 text-primary" />
      )}
    </div>
  );
}

function ComboboxEmpty({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { filtered } = useCombobox();
  if (filtered.length) return null;
  return (
    <div
      data-slot="combobox-empty"
      className={cn("py-6 text-center text-sm text-muted-foreground", className)}
    >
      {children}
    </div>
  );
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}

export {
  Combobox,
  ComboboxValue,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  useComboboxAnchor,
};
