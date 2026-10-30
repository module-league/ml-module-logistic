import { ConfirmDialog } from "./ConfirmDialog";

/**
 * Asks before deleting something. Stays open with the error when onConfirm rejects, and shows successMessage once it resolves.
 * @example
 * <ConfirmDeleteDialog open={open} onOpenChange={setOpen} title="Delete “Carrier”?" description="…" confirmLabel="Delete field" successMessage="Field deleted" onConfirm={remove} />
 */
export function ConfirmDeleteDialog({
  confirmLabel = "Delete",
  ...props
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
  return (
    <ConfirmDialog
      {...props}
      confirmLabel={confirmLabel}
      variant="destructive"
      errorMessage="Couldn't delete"
    />
  );
}
