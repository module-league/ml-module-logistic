import { useCallback, useState, type ReactNode } from "react";
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

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** @default "Confirm" */
  title?: ReactNode;
  /** What happens once confirmed. */
  description?: ReactNode;
  /** Anything to fill in or read before confirming, under the description, e.g. a date. */
  children?: ReactNode;
  /** @default "Confirm" */
  confirmLabel?: ReactNode;
  confirmIcon?: ReactNode;
  /** "destructive" for something that can't be taken back. @default "default" */
  variant?: "default" | "destructive";
  /** Holds the confirm button, e.g. until a field in children is filled. */
  disabled?: boolean;
  /** The toast once onConfirm resolves; none when left out. */
  successMessage?: string;
  /** The toast's title when onConfirm rejects. @default "Couldn't finish that" */
  errorMessage?: string;
  onConfirm: () => Promise<unknown>;
}

/**
 * Asks before going ahead. Stays open with the error when onConfirm rejects, and shows successMessage once it resolves.
 * @example
 * <ConfirmDialog open={open} onOpenChange={setOpen} description="The file counts as verified." confirmLabel="Verify" successMessage="Verified" onConfirm={verify} />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Confirm",
  description,
  children,
  confirmLabel = "Confirm",
  confirmIcon,
  variant = "default",
  disabled = false,
  successMessage,
  errorMessage = "Couldn't finish that",
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const changeOpen = useCallback(
    (next: boolean) => {
      if (!busy) onOpenChange(next);
    },
    [busy, onOpenChange],
  );
  const confirm = useCallback(async () => {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
      if (successMessage !== undefined) toast.success(successMessage);
    } catch (error: unknown) {
      toast.error(errorMessage, { description: errorParser(error)?.message });
    } finally {
      setBusy(false);
    }
  }, [onConfirm, onOpenChange, successMessage, errorMessage]);

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogContent
        {...(description === undefined && { "aria-describedby": undefined })}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description !== undefined && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <Button
            variant="outline"
            size="xs"
            disabled={busy}
            onClick={() => changeOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant={variant}
            size="xs"
            startIcon={confirmIcon}
            disabled={disabled}
            isLoading={busy}
            onClick={() => void confirm()}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
