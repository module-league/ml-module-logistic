import { useCallback, useMemo } from "react";
import { Clock } from "lucide-react";
import { Button, toast } from "@moduleleague/ui";
import { ModulePage } from "@/components/app/ModulePage";
import { sampleStore, useSampleLogistics } from "@/services/sample-data";
import type { Logistic } from "@/services/types";
import type { ModuleAppColumn } from "@/services/moduleAppView.types";
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

  const dispatch = useCallback((logistic: Logistic) => {
    sampleStore.dispatch(logistic?.objId);
    toast.success(`${logistic?.trackingNo} is now in transit`);
  }, []);

  const columns = useMemo<ModuleAppColumn<Logistic>[]>(
    () => [
      {
        key: "trackingNo",
        header: "Tracking no.",
        className: "font-medium",
        cell: (l) => l?.trackingNo,
      },
      {
        key: "docNo",
        header: "Doc no.",
        className: "font-mono text-xs text-muted-foreground",
        cell: (l) => formatDocNo(l?.docId),
      },
      {
        key: "route",
        header: "Route",
        cell: (l) => `${l?.origin} → ${l?.destination}`,
      },
      {
        key: "waiting",
        header: "Waiting since",
        className: "text-amber-700",
        cell: (l) => dateToFriendlyLongString(l?.createTime),
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        headerClassName: "text-right",
        cell: (l) => (
          <Button size="xs" onClick={() => dispatch(l)}>
            Dispatch
          </Button>
        ),
      },
    ],
    [dispatch],
  );

  const renderCard = useCallback(
    (l: Logistic) => (
      <div className="flex h-full items-center gap-4 rounded-lg border bg-background p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <Clock className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">{l?.trackingNo}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {formatDocNo(l?.docId)}
            </span>
          </div>
          <span className="truncate text-sm text-muted-foreground">
            {l?.origin} → {l?.destination}
          </span>
          <span className="text-xs text-amber-700">
            Waiting since {dateToFriendlyLongString(l?.createTime)}
          </span>
        </div>
        <Button size="xs" onClick={() => dispatch(l)}>
          Dispatch
        </Button>
      </div>
    ),
    [dispatch],
  );

  return (
    <ModulePage
      appView={{
        records: pending,
        getKey: (l) => l?.objId,
        columns,
        renderCard,
        empty: {
          title: "Nothing is waiting",
          description: "All shipments are dispatched.",
        },
      }}
    />
  );
}
