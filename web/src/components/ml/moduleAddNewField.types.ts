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

export interface ModuleEditFieldDialogProps
  extends Omit<ModuleAddNewFieldDialogProps, "onAdd"> {
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
}

export interface ModuleFieldNumberSettingsProps {
  value: NumberSettings;
  onChange: (value: NumberSettings) => void;
  /** Currency fields also pick the symbol shown before the number. */
  withSymbol?: boolean;
}

/** The sidebar a lookup field links to and the field it shows for each record. */
export type ModuleFieldLookupSettings = Pick<
  NonNullable<IField["lookupSettings"]>,
  "categoryId" | "lookupFieldId"
>;

export interface ModuleFieldLookupSettingsProps {
  value: ModuleFieldLookupSettings;
  onChange: (value: ModuleFieldLookupSettings) => void;
  sources: LookupSource[];
  /** An existing lookup field keeps its sidebar: its linked record ids belong to it. */
  sourceLocked?: boolean;
}

export interface ModuleDeleteFieldDialogProps
  extends Pick<ModuleAddNewFieldDialogProps, "open" | "onOpenChange"> {
  /** Nothing renders without it. */
  field?: Pick<IField, "name">;
  /** A rejection shows its message and keeps the dialog open. */
  onDelete: () => Promise<unknown>;
}

export interface ModuleAddFieldStepsProps
  extends Pick<ModuleEditFieldDialogProps, "takenNames" | "field"> {
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
