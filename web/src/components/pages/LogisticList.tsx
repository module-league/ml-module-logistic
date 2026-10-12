import { useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
import {
  Button,
  cn,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@moduleleague/ui";
import { ModulePage } from "@/components/app/ModulePage";
import { useSampleLogistics } from "@/services/sample-data";
import {
  LOGISTIC_STATUSES,
  STATUS_LABELS,
  type LogisticStatus,
} from "@/services/types";
import { formatDocNo } from "@/lib/formatDocNo";
import { dateToFriendlyLongString } from "@/lib/dateHelper";

type StatusFilter = LogisticStatus | "All";
const FILTERS: StatusFilter[] = ["All", ...LOGISTIC_STATUSES];
const COLUMN_COUNT = 6;

export default function LogisticList() {
  const logistics = useSampleLogistics();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logistics.filter((l) => {
      if (statusFilter !== "All" && l.status !== statusFilter) return false;
      if (!term) return true;
      return [l.trackingNo, l.origin, l.destination, formatDocNo(l.docId)].some(
        (v) => v.toLowerCase().includes(term),
      );
    });
  }, [logistics, search, statusFilter]);

  // Create/edit dialogs arrive with the API step
  const notYet = () => toast.info("Create and edit come with the API step.");

  return (
    <ModulePage
      actions={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={notYet} size="xs">
            <Download size={13} />
            Export
          </Button>
          <Button onClick={notYet} size="xs">
            <Plus size={13} />
            New record
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tracking no., origin, destination"
            aria-label="Search records"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background pl-8"
          />
        </div>
        {FILTERS.map((filter) => {
          const isOn = statusFilter === filter;
          return (
            <Button
              key={filter}
              variant="outline"
              size="sm"
              aria-pressed={isOn}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "rounded-full",
                isOn &&
                  "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background",
              )}
            >
              {filter === "All" ? "All" : STATUS_LABELS[filter]}
            </Button>
          );
        })}
      </div>

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
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={COLUMN_COUNT}
                  className="py-10 text-center text-muted-foreground"
                >
                  No records match your search.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((l) => (
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
                  <Button variant="outline" size="sm" onClick={notYet}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
