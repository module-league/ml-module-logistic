import { cn } from "@/lib/utils";
import {
  AutosizeTextarea,
  Button,
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui-kit";
import type { CSSProperties } from "react";
import { XIcon } from "@/components/custom/XIcon";
import { SelectionNode } from "./RecordValueNode";

export type RecordInputControlProps = {
  /** Set by FormControl so a label points at the input. */
  id?: string;
  members?: IUserInfo[];
  //lookupRecords?: ITransformedRecord[];
  /** Default pickers where applicable (Single-select, date picker etc) */
  defaultOpen?: boolean;
  /** Custom placeholder text where applicable */
  placeholder?: string;
  forceRender?: boolean;
  onBlur?(): void;
  field: IField;
  required?: boolean;
  name?: string;
  value?: string;
  disabled?: boolean;
  onChange?(value: string): void;
  autoFocus?: boolean;
  /** For text field only. True to render as `<textarea/>`. @default false */
  multiline?: boolean;
  className?: string;
  style?: CSSProperties;
  /** @default true */
  clearable?: boolean | "inline";
  /**
   * By default this would reflect the mirror field's actual input.
   * Set this to false to disable it, and render a disabled text instead
   */
  disableMirrorField?: boolean;
  /** For multi select field only. Adjust max display count of selected item */
  multiSelectDisplayCount?: number;
  /** For multi select field only. True to wrap input tags to one line only */
  multiSelectSingleLine?: boolean;
};

export function RecordInputControl(props: RecordInputControlProps) {
  const {
    id,
    members,
    field,
    value,
    onChange,
    name,
    required,
    disabled,
    onBlur,
    autoFocus,
    forceRender = false,
    defaultOpen = false,
    multiline,
    placeholder,
    clearable = true,
    disableMirrorField = false,
  } = props;

  if (field.isSystemField && !forceRender) {
    return (
      <span className={props.className} style={props.style}>
        <em>-System field is not editable-</em>
      </span>
    );
  }
  if (!field.isEditable && !forceRender) {
    return (
      <span className={props.className} style={props.style}>
        <em>-Field is not editable-</em>
      </span>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div
        className={cn("flex h-9 items-center", props.className)}
        style={props.style}
      >
        <Checkbox
          id={id}
          name={name}
          checked={value === "true"}
          disabled={disabled}
          autoFocus={autoFocus}
          onCheckedChange={(checked) => onChange?.(checked === true ? "true" : "")}
          onBlur={onBlur}
        />
      </div>
    );
  }

  if (field.type === "single_select") {
    const selectedDdv = field.dropDownValues.find((ddv) => ddv.id === value);
    return (
      <div className={cn("relative", props.className)}>
        <Select
          required={required}
          disabled={disabled}
          defaultOpen={defaultOpen}
          value={value}
          onValueChange={(val) => {
            if (val === "___") onChange?.("");
            else onChange?.(val);
          }}
          name={name}
        >
          <SelectTrigger
            id={id}
            className={cn(
              "py-1 leading-normal",
              clearable === true && "pr-10",
              props.className,
            )}
            style={props.style}
            onBlur={onBlur}
          >
            <SelectValue
              placeholder={
                <span className="text-muted-foreground">
                  {placeholder ?? "Select an option"}
                </span>
              }
            >
              {!!selectedDdv && (
                <SelectionNode dropDownValue={selectedDdv}>
                  {selectedDdv.value}
                </SelectionNode>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {clearable === "inline" && (
                <SelectItem value="___">
                  <em>-None-</em>
                </SelectItem>
              )}
              {field.dropDownValues.map((ddv) => (
                <SelectItem key={ddv.id} value={ddv.id}>
                  <SelectionNode dropDownValue={ddv}>{ddv.value}</SelectionNode>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {clearable === true && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              props.onChange?.("");
            }}
            className="absolute top-1/2 -translate-y-1/2 right-2"
            disabled={disabled}
          >
            <XIcon size={13} />
          </Button>
        )}
      </div>
    );
  }

  if (field.type === "text" && multiline) {
    return (
      <AutosizeTextarea
        id={id}
        value={value}
        onChange={(ev) => onChange?.(ev.target.value)}
        name={name}
        onBlur={onBlur}
        maxLength={250}
        maxHeight={150}
        autoFocus={autoFocus}
        disabled={disabled}
        className={cn("py-2.5 min-h-full resize-none", props.className)}
        style={props.style}
        onFocus={(e) =>
          e.target.setSelectionRange(
            e.target.value.length,
            e.target.value.length,
          )
        }
      />
    );
  }

  return (
    <Input
      id={id}
      value={value}
      onChange={(ev) => onChange?.(ev.target.value)}
      name={name}
      onBlur={onBlur}
      maxLength={250}
      type={field.type === "number" ? "number" : "text"}
      min={field.type === "number" ? Number.MIN_SAFE_INTEGER : undefined}
      max={field.type === "number" ? Number.MAX_SAFE_INTEGER : undefined}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={props.className}
      style={props.style}
    />
  );
}
