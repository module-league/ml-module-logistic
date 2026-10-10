import { Badge, cn } from "@moduleleague/ui";
import { STATUS_LABELS, type LogisticStatus } from "./types";
 
// Tinted pills from the design. Each pair passes 4.5:1 contrast.
const STATUS_STYLES: Record<LogisticStatus, string> = {
  Pending: "bg-stone-100 text-stone-700",
  InTransit: "bg-blue-50 text-blue-800",
  Delivered: "bg-green-50 text-green-800",
  Cancelled: "bg-red-50 text-red-800",
};
 
export function StatusBadge({ status }: { status: LogisticStatus }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 rounded-full border-transparent font-medium", STATUS_STYLES[status])}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
