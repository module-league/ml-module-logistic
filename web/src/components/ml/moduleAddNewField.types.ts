import type { LucideIcon } from "lucide-react";

export interface ModuleFieldTypeOption {
  value: IField["type"];
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface ModuleAddNewFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (field: IField) => void;
  /** Names already used by other fields; a field name must be unique. */
  takenNames?: string[];
}

export interface ModuleAddFieldStepsProps {
  onAdd: (field: IField) => void;
  onCancel: () => void;
  takenNames?: string[];
}

export interface ModuleFieldTypeCardProps {
  option: ModuleFieldTypeOption;
  onChoose: (type: IField["type"]) => void;
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

export interface ModuleFieldPreviewProps {
  field: IField;
}
