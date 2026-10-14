import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp, SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import { InputGroup, InputGroupAddon } from "./input-group";
import { XIcon } from "../custom/XIcon";

/** The lower-cased search of a searchable SelectContent; empty shows every item. */
const SelectSearchContext = React.createContext("");

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    /** Style the component as error */
    error?: boolean;
  }
>(({ className, children, error, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex relative h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-2 outline-primary disabled:cursor-not-allowed disabled:opacity-50",
      error && "border-red-700",
      className,
    )}
    {...props}
  >
    {props.asChild ? (
      children
    ) : (
      <>
        {children}
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </SelectPrimitive.Icon>
      </>
    )}
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

type SelectContentProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Content
> & {
  /**
   * `true` to force select content to be same width as trigger element.
   * Good when select item text is expected to be long
   */
  fitTriggerWidth?: boolean;
  /**
   * `true` to show a search box above the items. An item is matched by its `textValue`,
   * or by its children when they are plain text.
   */
  searchable?: boolean;
  /** @default "Search..." */
  searchPlaceholder?: string;
  /** @default "No results found." */
  searchEmpty?: React.ReactNode;
};

const SEARCH_INPUT_KEYS = ["Home", "End", "ArrowLeft", "ArrowRight"];

/**
 * Radix moves focus onto the items and jumps between them as you type. While searchable, typed
 * characters go to the search box instead, ArrowDown still walks the items, and Enter in the box
 * picks the first match.
 */
function routeSearchKeys(event: React.KeyboardEvent<HTMLDivElement>) {
  const input = event.currentTarget.querySelector<HTMLInputElement>(
    "[data-slot=select-search]",
  );
  if (!input) return;
  const fromInput = event.target === input;
  const typing =
    (event.key.length === 1 || event.key === "Backspace" || event.key === "Delete") &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey;

  if (fromInput && event.key === "Enter") {
    event.preventDefault();
    event.stopPropagation();
    const first = event.currentTarget.querySelector<HTMLElement>(
      "[role=option]:not([hidden]):not([data-disabled])",
    );
    first?.focus();
    first?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    return;
  }
  if (fromInput) {
    if (typing || SEARCH_INPUT_KEYS.includes(event.key)) event.stopPropagation();
    return;
  }
  if (typing && event.key !== " ") {
    event.stopPropagation();
    input.focus();
  }
}

/** The search box and the filtered items; it remounts on every open, so each open starts with an empty search. */
function SelectSearch({
  placeholder = "Search...",
  empty = "No results found.",
  viewportClassName,
  children,
}: {
  placeholder?: string;
  empty?: React.ReactNode;
  viewportClassName?: string;
  children?: React.ReactNode;
}) {
  const [search, setSearch] = React.useState("");
  const term = React.useMemo(() => search.trim().toLowerCase(), [search]);
  return (
    <SelectSearchContext.Provider value={term}>
      <div className="p-1 pb-0">
        <InputGroup className="h-8! rounded-lg! border-input/30 bg-input/30 shadow-none! *:data-[slot=input-group-addon]:pl-2!">
          <input
            data-slot="select-search"
            aria-label={placeholder}
            placeholder={placeholder}
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
          />
          <InputGroupAddon>
            <SearchIcon className="size-4 shrink-0 opacity-50" />
          </InputGroupAddon>
        </InputGroup>
      </div>
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        data-select-search-viewport=""
        className={viewportClassName}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
      <div className="hidden py-6 text-center text-sm text-muted-foreground [[data-select-search-viewport]:not(:has([role=option]:not([hidden])))~&]:block">
        {empty}
      </div>
    </SelectSearchContext.Provider>
  );
}

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(
  (
    {
      className,
      children,
      position = "popper",
      fitTriggerWidth = false,
      searchable = false,
      searchPlaceholder,
      searchEmpty,
      onKeyDownCapture,
      ...props
    },
    ref,
  ) => {
    const viewportClassName = cn(
      "p-1 w-full",
      fitTriggerWidth && "w-(--radix-select-trigger-width)",
      position === "popper" &&
        "min-w-[max(var(--radix-select-trigger-width),10rem)]",
    );
    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={ref}
          className={cn(
            "relative z-50 max-h-96 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            position === "popper" &&
              "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
            searchable && "flex flex-col",
            className,
          )}
          position={position}
          onKeyDownCapture={(event) => {
            onKeyDownCapture?.(event);
            if (searchable) routeSearchKeys(event);
          }}
          {...props}
        >
          {searchable ? (
            <SelectSearch
              placeholder={searchPlaceholder}
              empty={searchEmpty}
              viewportClassName={viewportClassName}
            >
              {children}
            </SelectSearch>
          ) : (
            <>
              <SelectScrollUpButton />
              <SelectPrimitive.Viewport className={viewportClassName}>
                {children}
              </SelectPrimitive.Viewport>
              <SelectScrollDownButton />
            </>
          )}
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    );
  },
);
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
    indicator?: React.ReactNode;
    /** true to apply truncate CSS class to inner component */
    truncate?: boolean;
  }
>(({ className, indicator, children, ...props }, ref) => {
  const search = React.useContext(SelectSearchContext);
  const text =
    props.textValue ??
    (typeof children === "string" || typeof children === "number"
      ? String(children)
      : props.value);
  const filteredOut = !!search && !text?.toLowerCase().includes(search);
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "max-w-full max-h-(--radix-popover-available-height) overflow-hidden",
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-primary-10 focus:bg-primary-10 data-highlighted:bg-primary-10 focus:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 *:flex-1",
        className,
        "*:data-[role='item-text']:truncate",
      )}
      {...props}
      disabled={filteredOut || props.disabled}
      hidden={filteredOut || undefined}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          {indicator ?? <Check className="h-4 w-4" />}
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText data-role="item-text">
        <div className="flex items-center gap-2">{children}</div>
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};

type Select2Props = Omit<SelectPrimitive.SelectProps, "children"> & {
  children: React.ReactNode | React.ReactNode[];
  onBlur?(): void;
  name?: string;
  placeholder?: React.ReactNode;
  className?: string;
  clearable?: boolean;
  contentClassName?: string;
  wrapperClassName?: string;
  renderValue?: React.ReactNode;
} & Pick<
    SelectContentProps,
    "fitTriggerWidth" | "searchable" | "searchPlaceholder" | "searchEmpty"
  >;
/** Custom component to simplify shadcn long ass `<Select/>` boilerplate. */
const Select2 = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  Select2Props
>(function Select2(props, ref) {
  const {
    className,
    children,
    onBlur,
    placeholder,
    clearable,
    contentClassName,
    wrapperClassName,
    renderValue,
    fitTriggerWidth,
    searchable,
    searchPlaceholder,
    searchEmpty,
    ...others
  } = props;
  return (
    <div className={cn("relative", wrapperClassName ?? className)}>
      <Select {...others}>
        <SelectTrigger
          ref={ref}
          className={cn(clearable && "pr-10", className)}
          onBlur={onBlur}
        >
          <SelectValue placeholder={placeholder}>{renderValue}</SelectValue>
        </SelectTrigger>
        <SelectContent
          className={contentClassName}
          fitTriggerWidth={fitTriggerWidth}
          searchable={searchable}
          searchPlaceholder={searchPlaceholder}
          searchEmpty={searchEmpty}
        >
          {Array.isArray(children) && !children.length ? (
            <div className="emptyContent">No items</div>
          ) : (
            children
          )}
        </SelectContent>
      </Select>

      {clearable && (
        <Button
          size="icon-sm"
          variant="ghost"
          title="Clear"
          className="absolute top-1/2 -translate-y-1/2 right-2"
          onClick={(ev) => {
            ev.stopPropagation();
            props.onValueChange?.("");
          }}
          onPointerDown={(ev) => ev.stopPropagation()}
        >
          <XIcon className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
});
export { Select2 };
