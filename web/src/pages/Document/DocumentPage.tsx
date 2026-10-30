import { useMemo, useState } from "react";
import { FileText, SearchX } from "lucide-react";
import { Button, ModulePageToolbar, Skeleton } from "@/ui-kit";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { QueryWrapper } from "@/components/custom/QueryWrapper";
import { PageHeader } from "@/components/ml/pageHeader";
import { tableFields } from "@/module/dashboard/moduleDashboard.utils";
import { buildDispatchBoard } from "../Dispatch/dispatchBoard.utils";
import { DocumentList } from "./DocumentList";
import { DocumentChecklist } from "./DocumentChecklist";
import { DocumentInbox } from "./DocumentInbox";
import { DocumentRulesDialog } from "./DocumentRulesDialog";
import { DocumentFilterMenu } from "./DocumentFilterMenu";
import {
  basisTags,
  buildDocumentRows,
  filterDocumentRows,
  NO_DOCUMENT_FILTER,
} from "./document.utils";
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
  const [filter, setFilter] = useState(NO_DOCUMENT_FILTER);
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
  // Each shipment's mode and Incoterm as its fields' coloured options, read from the record's stored option ids
  const tagsById = useMemo(() => {
    const source = lookups[sources?.shipmentSidebarId ?? ""];
    const fields = tableFields(source);
    const fieldOf = (id?: string) => fields.find((field) => field.objId === id);
    const modeField = fieldOf(data.documentSettings?.modeFieldId);
    const incotermField = fieldOf(data.documentSettings?.incotermFieldId);
    const recordById = new Map(
      source?.records?.map((record) => [record.objId, record]),
    );
    return new Map(
      rows.map(({ shipment, checklist }) => {
        const values = recordById.get(shipment.id)?.values;
        return [
          shipment.id,
          basisTags([
            {
              label: "Mode",
              value: checklist.mode,
              field: modeField,
              recordValue: values?.[modeField?.objId ?? ""],
            },
            {
              label: "Incoterm",
              value: checklist.incoterm,
              field: incotermField,
              recordValue: values?.[incotermField?.objId ?? ""],
            },
          ]),
        ];
      }),
    );
  }, [lookups, sources?.shipmentSidebarId, data.documentSettings, rows]);
  const visible = useMemo(
    () => filterDocumentRows(rows, filter, tagsById),
    [rows, filter, tagsById],
  );
  // A shipment the filter hides gives way to the first one still shown
  const selected = useMemo(
    () => visible.find((row) => row.shipment.id === selectedId) ?? visible[0],
    [visible, selectedId],
  );
  const steps = useMemo<IDocumentStep[]>(
    () => data.rules?.steps ?? [],
    [data.rules?.steps],
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
      <ModulePageToolbar
        filter={
          <DocumentFilterMenu
            rows={rows}
            steps={steps}
            filter={filter}
            onChange={setFilter}
          />
        }
        search={filter.search}
        onSearchChange={(search) =>
          setFilter((current) => ({ ...current, search }))
        }
        searchPlaceholder="Search shipments"
      />
      <div className="flex flex-col gap-4 p-4">
        <QueryWrapper
          isLoading={data.isLoading}
          error={data.error}
          onRetry={data.onRetry}
          renderLoader={<DocumentPageSkeleton />}
        >
          {selected ? (
            <div className="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
              <DocumentList
                rows={visible}
                selectedId={selected.shipment.id}
                tagsById={tagsById}
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
          ) : rows.length > 0 ? (
            <Empty className="rounded-xl border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>No shipments match</EmptyTitle>
                <EmptyDescription>
                  Try other words, or clear the filters to see all {rows.length}{" "}
                  shipments.
                </EmptyDescription>
              </EmptyHeader>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setFilter(NO_DOCUMENT_FILTER)}
              >
                Clear filters
              </Button>
            </Empty>
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
      className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]"
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
