import type { LucideIcon } from "lucide-react";
import type { NumberSettings } from "@/lib/numberHelper";
import type { LookupSource } from "@/lib/lookupHelper";

export interface ModuleFieldTypeOption {
  fieldType: IField["type"];
  label: string;
  description: string;
  icon: LucideIcon;
}

/** Called with the field the Add field dialog built. Return a promise to keep the dialog open until it settles. */
export type ModuleAddFieldHandler = (field: IField) => void | Promise<unknown>;

export interface ModuleAddNewFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A rejection shows its message and keeps the input. */
  onAdd: ModuleAddFieldHandler;
  /** Names already used by other fields; a field name must be unique. */
  takenNames?: string[];
}

export interface ModuleEditFieldDialogProps extends Omit<
  ModuleAddNewFieldDialogProps,
  "onAdd"
> {
  /** The field to edit; its type can't change. Nothing renders without it. */
  field?: IField;
  /** Called with the edited field. A rejection shows its message and keeps the input. */
  onSave: ModuleAddFieldHandler;
}

/** The date field settings picked in the Add field dialog. */
export type ModuleFieldDateSettings = Pick<
  IField,
  "dateFormat" | "displayTime" | "timeFormat"
>;

export interface ModuleFieldDateSettingsProps {
  value: ModuleFieldDateSettings;
  onChange: (value: ModuleFieldDateSettings) => void;
  /** A time field: only the 12- or 24-hour format. */
  timeOnly?: boolean;
}

export interface ModuleFieldNumberSettingsProps {
  value: NumberSettings;
  onChange: (value: NumberSettings) => void;
  /** Currency fields also pick the symbol shown before the number. */
  withSymbol?: boolean;
}

/** A link field's sidebar and whether it takes several records; a lookup's link field, its sidebar and the field it shows. */
export type ModuleFieldLookupSettings = Pick<
  NonNullable<IField["lookupSettings"]>,
  | "categoryId"
  | "multiple"
  | "linkFieldId"
  | "lookupFieldId"
  | "previewEnabled"
  | "previewFieldIds"
>;

export interface ModuleFieldLinkSettingsProps {
  value: ModuleFieldLookupSettings;
  onChange: (value: ModuleFieldLookupSettings) => void;
  sources: LookupSource[];
  /** The page's own sidebar, marked in the list. */
  sidebarId?: string;
  /** An existing link field keeps its sidebar: its linked record ids belong to it. */
  sourceLocked?: boolean;
  /** The saved field's setting; turning it off then warns that extra links are dropped. */
  savedMultiple?: boolean;
}

export interface ModuleFieldLookupSettingsProps {
  value: ModuleFieldLookupSettings;
  onChange: (value: ModuleFieldLookupSettings) => void;
  sources: LookupSource[];
  /** This sidebar's link fields; the lookup reads through one of them. */
  linkFields: ISidebarField[];
}

export interface ModuleFieldFormulaSettingsProps {
  /** The formula as the editor shows it, fields written {Field name}. */
  value: string;
  onChange: (value: string) => void;
  /** This table's number and currency fields; the formula reads them. */
  fields: ISidebarField[];
  error?: string;
}

export interface ModuleDeleteFieldDialogProps extends Pick<
  ModuleAddNewFieldDialogProps,
  "open" | "onOpenChange"
> {
  /** Nothing renders without it. */
  field?: Pick<IField, "name">;
  /** A rejection shows its message and keeps the dialog open. */
  onDelete: () => Promise<unknown>;
}

export interface ModuleAddFieldStepsProps extends Pick<
  ModuleEditFieldDialogProps,
  "takenNames" | "field"
> {
  onAdd: (field: IField) => void;
  onCancel: () => void;
  /** The field is being saved; Add is disabled. */
  saving?: boolean;
}

export interface ModuleFieldOptionsEditorProps {
  /** In display order; displayOrder is set from the position when the field is built. */
  options: IFieldDropDownValue[];
  onChange: (options: IFieldDropDownValue[]) => void;
}

export interface ModuleFieldOptionRowProps {
  option: IFieldDropDownValue;
  index: number;
  removable: boolean;
  autoFocus: boolean;
  onChange: (option: IFieldDropDownValue) => void;
  onRemove: (id: string) => void;
  /** Enter in the option's input adds the next option. */
  onEnter: () => void;
}

export interface ModuleFieldOptionColorPickerProps {
  value?: string;
  label: string;
  onChange: (colorCode: string) => void;
}
