import { useCallback, useState, type SyntheticEvent } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { errorParser } from "@/hooks/useErrorParser";

/**
 * Asks before deleting something. Stays open with the error when onConfirm rejects, and shows successMessage once it resolves.
 * @example
 * <ConfirmDeleteDialog open={open} onOpenChange={setOpen} title="Delete “Carrier”?" description="…" confirmLabel="Delete field" successMessage="Field deleted" onConfirm={remove} />
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  successMessage,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** @default "Delete" */
  confirmLabel?: string;
  /** The toast after a successful delete. */
  successMessage: string;
  onConfirm: () => Promise<unknown>;
}) {
  const [deleting, setDeleting] = useState(false);
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
        await onConfirm();
        onOpenChange(false);
        toast.success(successMessage);
      } catch (error: unknown) {
        toast.error("Couldn't delete", {
          description: errorParser(error)?.message,
        });
      } finally {
        setDeleting(false);
      }
    },
    [onConfirm, onOpenChange, successMessage],
  );

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
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
            onClick={(event) => void confirm(event)}
          >
            {deleting ? "Deleting…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
