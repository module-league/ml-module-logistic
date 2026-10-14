import React from "react";
import { CheckIcon, ChevronDown, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { multiSelectNodeVariants } from "./multi-select.variants";

type MultiSelectOption = {
  /** The text to display for the option. */
  label: string;
  /** The unique value associated with the option. */
  value: string;
  /** Optional icon component to display alongside the option. */
  icon?: React.ReactNode;
  /** Background color of the option's tag in the list; slate when left out. */
  color?: string;
  /** Extra classes for the option's tag, e.g. "text-black" over the default white text. */
  className?: string;
};

/**
 * Props for MultiSelect component
 */
type MultiSelectProps<TOption extends MultiSelectOption = MultiSelectOption> =
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> & {
    /**
     * An array of option objects to be displayed in the multi-select component.
     * Each option object has a label, value, and an optional icon.
     */
    options: TOption[];

    /**
     * Callback function triggered when the selected values change.
     * Receives an array of the new selected values.
     */
    onValueChange: (value: string[]) => void;

    value: string[];

    /** The default selected values when the component mounts. */
    defaultValue?: string[];

    /**
     * Placeholder text to be displayed when no values are selected.
     * Optional, defaults to "Select options".
     */
    placeholder?: string;

    /**
     * Maximum number of items to display. Extra selected items will be summarized.
     * Optional, defaults to 3.
     */
    maxCount?: number;

    /**
     * The modality of the popover. When set to true, interaction with outside elements
     * will be disabled and only popover content will be visible to screen readers.
     * Optional, defaults to false.
     */
    modalPopover?: boolean;

    /**
     * Additional class names to apply custom styles to the multi-select component.
     * Optional, can be used to add custom styles.
     */
    className?: string;

    /**
     * Helper text to be displayed when search values not found.
     * Optional, default to `No results found.`
     */
    renderSearchEmpty?: string;

    /**
     * Helper text to be displayed when no options provided.
     * Optional, default to `No option available.`
     */
    renderOptionEmpty?: string;

    renderValue?(values: TOption[]): React.ReactNode;

    disableAllSelection?: boolean;

    /** Closes the list after an option is picked, for a picker that keeps one value. */
    closeOnSelect?: boolean;
  };

type MultiSelectPropsWithForwardRef = React.FC<
  MultiSelectProps<MultiSelectOption>
> & {
  <T extends MultiSelectOption>(
    props: MultiSelectProps<T>,
  ): ReturnType<React.FC<MultiSelectProps<T>>>;
};

export const MultiSelect: MultiSelectPropsWithForwardRef = React.forwardRef<
  HTMLButtonElement,
  MultiSelectProps
>(
  (
    {
      options,
      onValueChange,
      renderValue,
      value,
      defaultValue = [],
      placeholder = "Select options",
      maxCount = 3,
      modalPopover = false,
      renderSearchEmpty = "No results found.",
      renderOptionEmpty = "No option available.",
      disableAllSelection = false,
      closeOnSelect = false,
      className,
      ...props
    },
    ref,
  ) => {
    value = value ?? defaultValue ?? [];

    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

    const handleInputKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
      if (event.key === "Enter") {
        setIsPopoverOpen(true);
      } else if (event.key === "Backspace" && !event.currentTarget.value) {
        const newSelectedValues = [...value];
        newSelectedValues.pop();
        onValueChange(newSelectedValues);
      }
    };

    const toggleOption = (nextVal: string) => {
      const newSelectedValues = value.includes(nextVal)
        ? value.filter((v) => v !== nextVal)
        : [...value, nextVal];
      onValueChange(newSelectedValues);
      if (closeOnSelect) setIsPopoverOpen(false);
    };

    const handleTogglePopover = () => {
      setIsPopoverOpen((prev) => !prev);
    };

    const toggleAll = () => {
      if (value.length === options.length) {
        onValueChange([]);
      } else {
        const allValues = options.map((option) => option.value);
        onValueChange(allValues);
      }
    };

    return (
      <Popover
        open={isPopoverOpen}
        onOpenChange={setIsPopoverOpen}
        modal={modalPopover}
      >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            {...props}
            onClick={handleTogglePopover}
            className={cn(
              "w-full p-1 rounded-md border min-h-10 h-auto bg-background hover:bg-background",
              "flex items-center justify-between text-start",
              className,
            )}
          >
            {value.length > 0 && renderValue ? (
              renderValue(options.filter((opt) => value.includes(opt.value)))
            ) : value.length > 0 ? (
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-wrap gap-2 items-center">
                  {value.slice(0, maxCount).map((value) => {
                    const option = options.find((o) => o.value === value);
                    const IconComponent = option?.icon;

                    if (!option) {
                      console.warn("Invalid option value: ", value);
                      return;
                    }
                    return (
                      <span key={value} className={multiSelectNodeVariants()}>
                        {IconComponent}
                        <span className="truncate">{option?.label}</span>
                        <span
                          className={buttonVariants({
                            size: "icon-sm",
                            variant: "ghost",
                          })}
                          role="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleOption(value);
                          }}
                        >
                          <XIcon size="12" />
                        </span>
                      </span>
                    );
                  })}
                  {value.length > maxCount && (
                    <span
                      className={cn(
                        multiSelectNodeVariants(),
                        "text-muted-foreground text-xs hover:bg-slate-200",
                      )}
                    >
                      {`+ ${value.length - maxCount} more`}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 text-sm text-muted-foreground mx-3">
                {placeholder}
              </div>
            )}

            <div className="px-2">
              <ChevronDown className="size-4 cursor-pointer text-muted-foreground" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0"
          align="start"
          onEscapeKeyDown={() => setIsPopoverOpen(false)}
        >
          <Command>
            <CommandInput
              placeholder="Search..."
              onKeyDown={handleInputKeyDown}
            />
            <CommandList>
              {options.length !== 0 ? (
                <>
                  <CommandEmpty>{renderSearchEmpty}</CommandEmpty>
                  <CommandGroup>
                    {!disableAllSelection && (
                      <CommandItem
                        key="all"
                        onSelect={toggleAll}
                        className="cursor-pointer data-[selected=true]:bg-primary-10"
                      >
                        <div
                          className={cn(
                            value.length === options.length
                              ? "text-black"
                              : "opacity-50 [&_svg]:invisible",
                          )}
                        >
                          <CheckIcon className="h-4 w-4" />
                        </div>
                        <span>(Select All)</span>
                      </CommandItem>
                    )}

                    {options.map((option) => {
                      const isSelected = value.includes(option.value);
                      return (
                        <CommandItem
                          key={option.value}
                          onSelect={() => toggleOption(option.value)}
                          className="cursor-pointer flex items-center gap-2 data-[selected=true]:bg-primary-10"
                        >
                          <div
                            className={cn(
                              isSelected
                                ? "text-black"
                                : "opacity-50 [&_svg]:invisible",
                            )}
                          >
                            <CheckIcon className="h-4 w-4" />
                          </div>
                          <span
                            className={cn(
                              "rounded-md overflow-hidden py-1 px-2 text-[0.8em] bg-slate-600 text-white truncate",
                              option.className,
                            )}
                            style={{ backgroundColor: option.color }}
                            title={option.label}
                          >
                            {option.label}
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              ) : (
                <CommandEmpty>{renderOptionEmpty}</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);

MultiSelect.displayName = "MultiSelect";
