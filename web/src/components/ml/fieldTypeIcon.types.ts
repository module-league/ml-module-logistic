import type { LucideProps } from "lucide-react";

export interface FieldTypeIconProps extends Omit<LucideProps, "ref"> {
  /** Without a type a dashed circle is shown. */
  type?: IField["type"];
}
