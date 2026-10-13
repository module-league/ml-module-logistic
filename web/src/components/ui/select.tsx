import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import { XIcon } from "../custom/XIcon";

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
      "flex relative h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-2 outline-primary disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
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
};
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
      ...props
    },
    ref,
  ) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1 w-full",
            fitTriggerWidth && "w-(--radix-select-trigger-width)",
            position === "popper" &&
              "min-w-[max(var(--radix-select-trigger-width),10rem)]",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  ),
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
>(({ className, indicator, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "max-w-full max-h-(--radix-popover-available-height) overflow-hidden",
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 *:flex-1",
      className,
      "*:data-[role='item-text']:truncate",
    )}
    {...props}
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
));
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
} & Pick<SelectContentProps, "fitTriggerWidth">;
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
