import { useCallback, useState } from "react";
import { toast } from "@moduleleague/ui";
import { errorParser } from "@/hooks/useErrorParser";

/**
 * Saving a new record from a dialog: the dialog closes once onSave settles, stays open while it runs,
 * and a failure shows its message and keeps the input.
 * @example
 * const { saving, save, changeOpen } = useNewRecordSave(onSave, onOpenChange);
 */
export function useNewRecordSave(
  onSave: (values: ISidebarRecordValues) => void | Promise<unknown>,
  onOpenChange: (open: boolean) => void,
) {
  const [saving, setSaving] = useState(false);
  const changeOpen = useCallback(
    (next: boolean) => {
      if (!saving) onOpenChange(next);
    },
    [saving, onOpenChange],
  );
  const save = useCallback(
    async (values: ISidebarRecordValues) => {
      setSaving(true);
      try {
        await onSave(values);
        onOpenChange(false);
      } catch (err) {
        toast.error("Couldn't add record", {
          description: errorParser(err)?.message,
        });
      } finally {
        setSaving(false);
      }
    },
    [onSave, onOpenChange],
  );
  return { saving, save, changeOpen };
}
