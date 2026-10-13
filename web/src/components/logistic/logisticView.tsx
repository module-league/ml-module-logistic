import { useMemo } from "react";
import { Button } from "@moduleleague/ui";
import { STATUS_LABELS, type Logistic } from "@/services/types";
import type { ModuleAppColumn } from "@/services/modules/moduleAppView.types";
import { formatDocNo } from "@/lib/formatDocNo";
import { dateToFriendlyLongString } from "@/lib/dateHelper";

export const getLogisticKey = (logistic: Logistic) => logistic?.objId;

export function useLogisticColumns(
  onEdit: () => void,
): ModuleAppColumn<Logistic>[] {
  return useMemo(
    () => [
      {
        key: "docNo",
        header: "Doc no.",
        className: "font-mono text-xs text-muted-foreground",
        cell: (l) => formatDocNo(l?.docId),
      },
      {
        key: "trackingNo",
        header: "Tracking no.",
        className: "font-medium",
        cell: (l) => l?.trackingNo,
      },
      {
        key: "route",
        header: "Route",
        cell: (l) => (
          <>
            {l?.origin} <span className="text-muted-foreground">→</span>{" "}
            {l?.destination}
          </>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (l) => STATUS_LABELS[l?.status],
      },
      {
        key: "created",
        header: "Created",
        className: "text-muted-foreground",
        cell: (l) => dateToFriendlyLongString(l?.createTime),
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        headerClassName: "text-right",
        cell: () => (
          <Button variant="outline" size="xs" onClick={onEdit}>
            Edit
          </Button>
        ),
      },
    ],
    [onEdit],
  );
}

export function LogisticCard({
  logistic,
  onEdit,
}: {
  logistic: Logistic;
  onEdit: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-medium">{logistic?.trackingNo}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {formatDocNo(logistic?.docId)}
          </span>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {STATUS_LABELS[logistic?.status]}
        </span>
      </div>
      <div className="text-sm">
        {logistic?.origin} <span className="text-muted-foreground">→</span>{" "}
        {logistic?.destination}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {dateToFriendlyLongString(logistic?.createTime)}
        </span>
        <Button variant="outline" size="xs" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </div>
  );
}
