import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ModuleAddNewButtonProps } from "./moduleAddNewButton.types";

/**
 * Primary button that starts creating a record.
 * @example
 * <ModuleAddNewButton label="New record" onClick={create} />
 */
export function ModuleAddNewButton({
  onClick,
  label = "Add record",
  className,
}: ModuleAddNewButtonProps) {
  return (
    <Button
      size="xs"
      onClick={onClick}
      className={className}
      startIcon={<Plus size={13} />}
    >
      {label}
    </Button>
  );
}
