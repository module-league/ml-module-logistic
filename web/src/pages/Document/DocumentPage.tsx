import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { Button, Skeleton } from "@/ui-kit";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { QueryWrapper } from "@/components/custom/QueryWrapper";
import { PageHeader } from "@/components/ml/pageHeader";
import { buildDispatchBoard } from "../Dispatch/dispatchBoard.utils";
import { DocumentList } from "./DocumentList";
import { DocumentChecklist } from "./DocumentChecklist";
import { DocumentInbox } from "./DocumentInbox";
import { DocumentRulesDialog } from "./DocumentRulesDialog";
import { buildDocumentRows } from "./document.utils";
import type { DocumentApi, DocumentData } from "./useDocumentData";

export function DocumentPage({
  data,
  getActivity,
}: {
  data: DocumentData;
  getActivity: DocumentApi["getDocumentActivity"];
}) {
  const {
    sources,
    lookups,
    dispatches,
    members,
    settings,
    checklists,
    selectedId,
    onSelect,
  } = data;
  const [rulesOpen, setRulesOpen] = useState(false);
  const picks =
    settings?.versionNo != null && settings.versionNo !== 0
      ? settings
      : undefined;

  const board = useMemo(
    () => buildDispatchBoard(sources, lookups, dispatches, members, picks),
    [sources, lookups, dispatches, members, picks],
  );
  const rows = useMemo(
    () => buildDocumentRows(board.shipments, checklists),
    [board, checklists],
  );
  const selected = useMemo(
    () => rows.find((row) => row.shipment.id === selectedId) ?? rows[0],
    [rows, selectedId],
  );

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Documents"
        description="Each shipment gets a checklist built from its mode, Incoterm and stage. Missing papers block the next step."
        actions={
          <Button
            variant="outline"
            size="xs"
            onClick={() => setRulesOpen(true)}
          >
            Rules
          </Button>
        }
      />
      <div className="flex flex-col gap-4 p-4">
        <QueryWrapper
          isLoading={data.isLoading}
          error={data.error}
          onRetry={data.onRetry}
          renderLoader={<DocumentPageSkeleton />}
        >
          {selected ? (
            <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <DocumentList
                rows={rows}
                selectedId={selected.shipment.id}
                onSelect={onSelect}
              />
              <div
                key={selected.shipment.id}
                className="flex min-w-0 flex-col gap-4"
              >
                <DocumentChecklist
                  row={selected}
                  data={data}
                  getActivity={getActivity}
                  onOpenRules={() => setRulesOpen(true)}
                />
                <DocumentInbox
                  row={selected}
                  data={data}
                  onOpenRules={() => setRulesOpen(true)}
                />
              </div>
            </div>
          ) : (
            <Empty className="rounded-xl border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText />
                </EmptyMedia>
                <EmptyTitle>No shipments yet</EmptyTitle>
                <EmptyDescription>
                  Each shipment gets a document checklist once it&apos;s booked.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </QueryWrapper>
      </div>
      <DocumentRulesDialog
        open={rulesOpen}
        onOpenChange={setRulesOpen}
        data={data}
      />
    </div>
  );
}

function DocumentPageSkeleton() {
  return (
    <div
      className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]"
      aria-busy
      aria-label="Loading documents"
    >
      <div className="flex flex-col gap-2 rounded-xl border p-2">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-16 rounded-lg" />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-72 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
