export interface FormulaEditorProps {
  id?: string;
  /** The formula as shown, fields written {Field name}. */
  defaultValue?: string;
  /** The fields the formula can read; the editor suggests them as you type. */
  fields: ISidebarField[];
  onChange: (text: string) => void;
  invalid?: boolean;
  className?: string;
}
