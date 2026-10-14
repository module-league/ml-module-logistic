import { cn } from "@/lib/utils";
import {
  AutosizeTextarea,
  Button,
  Checkbox,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
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
import { RecordMemberInput } from "./RecordMemberInput";
import { RecordAttachmentInput } from "./RecordAttachmentInput";
import { RecordMultiSelectInput } from "./RecordMultiSelectInput";
import { RecordLookupInput } from "./RecordLookupInput";
import type { AttachmentUploadHandler } from "./RecordAttachmentInput.types";
import { DateTimePicker } from "../ui/date-time-picker";
import { parseFieldDate, toFieldDateValue } from "@/lib/dateHelper";

export type RecordInputControlProps = {
  /** Set by FormControl so a label points at the input. */
  id?: string;
  members?: IUserInfo[];
  /** Uploads files for attachment fields; without it attachments can only be opened or removed. */
  onUploadAttachment?: AttachmentUploadHandler;
  /** Lookup fields only: shows a preview button right of the picker. */
  onPreview?: () => void;
  /** Lookup fields only: the preview of this field is showing. */
  previewActive?: boolean;
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
    onUploadAttachment,
    onPreview,
    previewActive,
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

  if (field.isDateField) {
    return (
      <div className={cn("relative", props.className)}>
        <DateTimePicker
          defaultOpen={defaultOpen}
          value={parseFieldDate(value)}
          onChange={(date) => onChange?.(toFieldDateValue(field, date))}
          granularity={field.displayTime ? "minute" : "day"}
          hourCycle={field.timeFormat === "HH:mm" ? 24 : 12}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            clearable === true && "**:aria-[label=date-picker-button]:right-9",
            props.className,
          )}
          inputClassName={props.className}
          style={props.style}
          clearable={clearable === "inline"}
        />

        {clearable === true && (
          <Button
            size="xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              props.onChange?.("");
            }}
            className="absolute top-1/2 -translate-y-1/2 right-2 text-black"
            disabled={disabled}
          >
            <XIcon size={14} />
          </Button>
        )}
      </div>
    );
  }

  if (field.type === "member") {
    return (
      <RecordMemberInput
        id={id}
        field={field}
        value={value}
        members={members}
        disabled={disabled}
        placeholder={placeholder}
        className={props.className}
        style={props.style}
        onChange={onChange}
        onBlur={onBlur}
      />
    );
  }

  if (field.type === "multi_select") {
    return (
      <RecordMultiSelectInput
        id={id}
        field={field}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className={props.className}
        style={props.style}
        onChange={onChange}
        onBlur={onBlur}
      />
    );
  }

  if (field.type === "lookup") {
    return (
      <RecordLookupInput
        id={id}
        field={field}
        onPreview={onPreview}
        previewActive={previewActive}
        value={value}
        members={members}
        disabled={disabled}
        placeholder={placeholder}
        className={props.className}
        style={props.style}
        onChange={onChange}
        onBlur={onBlur}
      />
    );
  }

  if (field.type === "attachment") {
    return (
      <RecordAttachmentInput
        id={id}
        value={value}
        disabled={disabled}
        className={props.className}
        style={props.style}
        onChange={onChange}
        onBlur={onBlur}
        onUpload={onUploadAttachment}
      />
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
          onCheckedChange={(checked) =>
            onChange?.(checked === true ? "true" : "")
          }
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
          <SelectContent searchable searchPlaceholder="Find an option">
            <SelectGroup>
              {clearable === "inline" && (
                <SelectItem value="___" textValue="None">
                  <em>-None-</em>
                </SelectItem>
              )}
              {field.dropDownValues.map((ddv) => (
                <SelectItem key={ddv.id} value={ddv.id} textValue={ddv.value}>
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

  if (field.type === "number" || field.type === "currency") {
    const symbol = field.type === "currency" && field.numberSettings?.symbol;
    return (
      <InputGroup className={props.className} style={props.style}>
        {!!symbol && (
          <InputGroupAddon>
            <InputGroupText>{symbol}</InputGroupText>
          </InputGroupAddon>
        )}
        <InputGroupInput
          id={id}
          value={value}
          onChange={(ev) => onChange?.(ev.target.value)}
          name={name}
          onBlur={onBlur}
          type="number"
          inputMode="decimal"
          step="any"
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="tabular-nums"
        />
      </InputGroup>
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
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={props.className}
      style={props.style}
    />
  );
}
