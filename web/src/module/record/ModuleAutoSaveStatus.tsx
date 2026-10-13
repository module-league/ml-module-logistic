import { memo } from "react";
import { Check, CircleAlert } from "lucide-react";
import { cn, Spinner } from "@moduleleague/ui";
import type { ModuleAutoSaveStatusProps } from "./moduleRecord.types";

export const ModuleAutoSaveStatus = memo(function ModuleAutoSaveStatus({
  status,
}: ModuleAutoSaveStatusProps) {
  if (status === "idle") return null;

  const failed = status === "error";
  const busy = status === "pending" || status === "saving";

  return (
    <span
      role="status"
      className={cn(
        "flex shrink-0 items-center gap-1 text-xs font-normal text-muted-foreground",
        failed && "text-destructive",
      )}
    >
      {busy && <Spinner className="size-3" aria-hidden />}
      {status === "saved" && <Check className="size-3" />}
      {failed && <CircleAlert className="size-3" />}
      {busy ? "Saving…" : failed ? "Couldn't save" : "Saved"}
    </span>
  );
});
