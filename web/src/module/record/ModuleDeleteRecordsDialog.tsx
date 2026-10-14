import { useCallback, useState, type SyntheticEvent } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  toast,
} from "@moduleleague/ui";
import { errorParser } from "@/hooks/useErrorParser";
import type { ModuleDeleteRecordsDialogProps } from "./moduleRecord.types";

/**
 * Asks before deleting records, since links to them are removed too.
 * @example
 * <ModuleDeleteRecordsDialog count={keys.length} open={open} onOpenChange={setOpen} onDelete={() => onDeleteRecords(keys)} />
 */
export function ModuleDeleteRecordsDialog({
  open,
  onOpenChange,
  count,
  onDelete,
}: ModuleDeleteRecordsDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const what = count === 1 ? "this record" : `${count} records`;
  const changeOpen = useCallback(
    (next: boolean) => {
      if (!deleting) onOpenChange(next);
    },
    [deleting, onOpenChange],
  );
  const confirm = useCallback(
    async (event: SyntheticEvent) => {
      event.preventDefault();
      setDeleting(true);
      try {
        await onDelete();
        onOpenChange(false);
        toast.success(
          count === 1 ? "Record deleted" : `${count} records deleted`,
        );
      } catch (error) {
        toast.error("Couldn't delete", {
          description: errorParser(error)?.message,
        });
      } finally {
        setDeleting(false);
      }
    },
    [count, onDelete, onOpenChange],
  );

  if (!count) return null;

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {what}?</AlertDialogTitle>
          <AlertDialogDescription>
            {count === 1 ? "It is" : "They are"} also removed from every link to
            another record field that links to {count === 1 ? "it" : "them"}.
            This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            size="xs"
            disabled={deleting}
            onClick={() => changeOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="xs"
            disabled={deleting}
            onClick={confirm}
          >
            {deleting
              ? "Deleting…"
              : count === 1
                ? "Delete record"
                : `Delete ${count} records`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
