import { useCallback, useMemo, useState } from "react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  type PageToolbarFilterValue,
  type PageToolbarInputOption,
  type PageToolbarProps,
} from "@moduleleague/ui";
import { ModulePage } from "@/components/app/ModulePage";
import { useSampleLogistics } from "@/services/sample-data";
import {
  LOGISTIC_STATUSES,
  STATUS_LABELS,
  type Logistic,
} from "@/services/types";
import { formatDocNo } from "@/lib/formatDocNo";
import { dateToFriendlyLongString } from "@/lib/dateHelper";

const COLUMN_COUNT = 6;

export default function LogisticList() {
  const logistics = useSampleLogistics();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PageToolbarFilterValue>({});
  const [view, setView] = useState("list");

  const inputOptions = useMemo<PageToolbarInputOption[]>(
    () => [
      {
        key: "status",
        label: "Status",
        options: LOGISTIC_STATUSES.map((status) => ({
          value: status,
          label: STATUS_LABELS[status],
        })),
      },
      {
        key: "origin",
        label: "Origin",
        options: [...new Set(logistics?.map((l) => l?.origin))]
          .sort()
          .map((origin) => ({ value: origin, label: origin })),
      },
    ],
    [logistics],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logistics.filter((l) => {
      if (filter?.status?.length && !filter.status.includes(l?.status)) return false;
      if (filter?.origin?.length && !filter.origin.includes(l?.origin)) return false;
      if (!term) return true;
      return [l.trackingNo, l.origin, l.destination, formatDocNo(l.docId)].some(
        (v) => v.toLowerCase().includes(term),
      );
    });
  }, [logistics, search, filter]);

  // Create/edit dialogs arrive with the API step
  const notYet = useCallback(
    () => toast.info("Create and edit come with the API step."),
    [],
  );

  const toolbar = useMemo<PageToolbarProps>(
    () => ({
      onAdd: notYet,
      addLabel: "New record",
      view,
      onViewChange: setView,
      inputOptions,
      filterValue: filter,
      onFilterChange: setFilter,
      onExport: notYet,
      search,
      onSearchChange: setSearch,
      searchPlaceholder: "Tracking no., origin, destination",
    }),
    [notYet, view, inputOptions, filter, search],
  );

  return (
    <ModulePage toolbar={toolbar}>
      {view === "grid" ? (
        <LogisticGrid records={filtered} onEdit={notYet} />
      ) : (
        <LogisticTable records={filtered} onEdit={notYet} />
      )}

      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filtered.length} of {logistics.length}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>
    </ModulePage>
  );
}

interface LogisticViewProps {
  records: Logistic[];
  onEdit: () => void;
}

function LogisticTable({ records, onEdit }: LogisticViewProps) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Doc no.</TableHead>
            <TableHead>Tracking no.</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records?.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={COLUMN_COUNT}
                className="py-10 text-center text-muted-foreground"
              >
                No records match your search.
              </TableCell>
            </TableRow>
          )}
          {records?.map((l) => (
            <TableRow key={l.objId}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {formatDocNo(l.docId)}
              </TableCell>
              <TableCell className="font-medium">{l.trackingNo}</TableCell>
              <TableCell>
                {l.origin} <span className="text-muted-foreground">→</span>{" "}
                {l.destination}
              </TableCell>
              <TableCell>{STATUS_LABELS[l?.status]}</TableCell>
              <TableCell className="text-muted-foreground">
                {dateToFriendlyLongString(l.createTime)}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={onEdit}>
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LogisticGrid({ records, onEdit }: LogisticViewProps) {
  if (!records?.length) {
    return (
      <div className="rounded-lg border bg-background py-10 text-center text-sm text-muted-foreground">
        No records match your search.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {records.map((l) => (
        <div
          key={l?.objId}
          className="flex flex-col gap-3 rounded-lg border bg-background p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col">
              <span className="font-medium">{l?.trackingNo}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {formatDocNo(l?.docId)}
              </span>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {STATUS_LABELS[l?.status]}
            </span>
          </div>
          <div className="text-sm">
            {l?.origin} <span className="text-muted-foreground">→</span>{" "}
            {l?.destination}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {dateToFriendlyLongString(l?.createTime)}
            </span>
            <Button variant="outline" size="xs" onClick={onEdit}>
              Edit
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
