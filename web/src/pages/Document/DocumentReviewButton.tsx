import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
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
    <Sparkles size={14} />
  );

  return (
    <>
      <Button
        size="sm"
        variant={review ? "outline" : "default"}
        startIcon={busyIcon}
        disabled={isPending}
        title="The AI reads the file and compares it with the shipment"
        onClick={() => (review ? setIsOpen(true) : void run())}
      >
        {isPending ? "Checking…" : review ? "View AI check" : "Check with AI"}
      </Button>
      <Dialog open={isOpen && !!review} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">
              AI check · {file.name}
            </DialogTitle>
            <DialogDescription>
              Read by AI and compared with the shipment&apos;s record. Verify or
              reject it yourself.
            </DialogDescription>
          </DialogHeader>
          {review && <DocumentReviewResult review={review} />}
          <DialogFooter>
            <Button
              variant="outline"
              startIcon={busyIcon}
              disabled={isPending}
              onClick={() => void run()}
            >
              {isPending ? "Checking…" : "Check again"}
            </Button>
            <Button onClick={() => setIsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
