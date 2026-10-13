import type { ModuleRecordField, ModuleRecordValues } from "./moduleRecord.types";

export interface ModuleNewRecordFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: ModuleRecordField[];
  /** The page is fetching the fields; the body shows the loader. */
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Return a promise to keep the dialog open until it settles; a rejection shows its message and keeps the input. */
  onSave: (values: ModuleRecordValues) => void | Promise<unknown>;
}

export interface ModuleNewRecordFieldsProps {
  fields: ModuleRecordField[];
  saving: boolean;
  onCancel: () => void;
  onSave: (values: ModuleRecordValues) => void;
}
