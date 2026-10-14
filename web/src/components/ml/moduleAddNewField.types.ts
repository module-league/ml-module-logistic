import type { LucideIcon } from "lucide-react";
import type { NumberSettings } from "@/lib/numberHelper";

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

export interface ModuleAddFieldStepsProps
  extends Pick<ModuleAddNewFieldDialogProps, "takenNames"> {
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
