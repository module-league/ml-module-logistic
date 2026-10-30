import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@moduleleague/ui";
import { Spinner } from "@/components/ui/spinner";
import { attempt } from "@/lib/toastHelper";
import { DocumentReviewResult } from "./DocumentReviewResult";
import type { DocumentData } from "./useDocumentData";

interface DocumentReviewButtonProps {
  shipmentId: string;
  file: IAttachment;
  onReview: DocumentData["onReview"];
}

/**
 * Has the AI read a file and check it against the shipment, then shows the result. Each check is a paid call, so once done the
 * button reopens the last result; "Check again" in the dialog runs a new one.
 */
export function DocumentReviewButton({
  shipmentId,
  file,
  onReview,
}: DocumentReviewButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    mutateAsync,
    data: review,
    isPending,
  } = useMutation({
    mutationFn: () => onReview({ shipmentId, attachmentId: file.id }),
  });
  const run = () =>
    attempt("Couldn't check the file", async () => {
      await mutateAsync();
      setIsOpen(true);
    });
  const busyIcon = isPending ? (
    <Spinner className="size-3.5" />
  ) : (
    <Sparkles size={13} />
  );

  return (
    <>
      {/* Outline, so the paper's own next step (upload, verify) stays the one solid button in its row */}
      <Button
        size="xs"
        variant="outline"
        startIcon={busyIcon}
        disabled={isPending}
        title="The AI reads the file and compares it with the shipment"
        onClick={() => (review ? setIsOpen(true) : void run())}
      >
        {isPending ? "Checking…" : review ? "View AI check" : "Check with AI"}
      </Button>
      <Dialog open={isOpen && !!review} onOpenChange={setIsOpen}>
        {/* Header and footer stay put; only the result between them scrolls */}
        <DialogContent className="flex max-h-dialog flex-col gap-0 p-0 sm:max-w-5xl md:max-w-5xl">
          <DialogHeader className="shrink-0 border-b p-4 pr-10 pb-3">
            <DialogTitle className="truncate">
              AI check · {file.name}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {review && <DocumentReviewResult review={review} />}
          </div>
          <DialogFooter className="m-0 shrink-0 border-t p-4">
            <Button
              variant="outline"
              size="xs"
              startIcon={busyIcon}
              disabled={isPending}
              onClick={() => void run()}
            >
              {isPending ? "Checking…" : "Check again"}
            </Button>
            <Button size="xs" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
