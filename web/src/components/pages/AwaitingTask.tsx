import { useMemo } from "react";
import { Clock } from "lucide-react";
import { Button, toast } from "@moduleleague/ui";
import { ModulePage } from "@/components/app/ModulePage";
import { sampleStore, useSampleLogistics } from "@/services/sample-data";
import type { Logistic } from "@/services/types";
import { formatDocNo } from "@/lib/formatDocNo";
import { dateToFriendlyLongString } from "@/lib/dateHelper";

export default function AwaitingTask() {
  const logistics = useSampleLogistics();

  // Oldest first: the record that has waited longest is dispatched first
  const pending = useMemo(
    () =>
      logistics
        .filter((l) => l.status === "Pending")
        .sort((a, b) => a.docId - b.docId),
    [logistics],
  );

  function dispatch(logistic: Logistic) {
    sampleStore.dispatch(logistic.objId);
    toast.success(`${logistic.trackingNo} is now in transit`);
  }

  return (
    <ModulePage>
      {pending.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-background py-16 text-center text-muted-foreground">
          Nothing is waiting. All shipments are dispatched.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {pending.map((l) => (
            <div
              key={l.objId}
              className="flex items-center gap-4 rounded-lg border bg-background p-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Clock className="size-5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold">{l.trackingNo}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatDocNo(l.docId)}
                  </span>
                </div>
                <span className="truncate text-sm text-muted-foreground">
                  {l.origin} → {l.destination}
                </span>
                <span className="text-xs text-amber-700">
                  Waiting since {dateToFriendlyLongString(l.createTime)}
                </span>
              </div>
              <Button size="sm" onClick={() => dispatch(l)}>
                Dispatch
              </Button>
            </div>
          ))}
        </div>
      )}
    </ModulePage>
  );
}
