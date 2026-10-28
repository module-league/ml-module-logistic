import { useCallback, useMemo, useState } from "react";
import { LayoutDashboard, Plus, SlidersHorizontal } from "lucide-react";
import {
  Button,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Skeleton,
  toast,
} from "@moduleleague/ui";
import { errorParser } from "@/hooks/useErrorParser";
import { QueryWrapper } from "@/components/custom/QueryWrapper";
import { RecordLookupContext } from "@/components/custom/RecordLookup.context";
import { useCurrentNavItem } from "@/module/shell/navItem.context";
import { useWorkspaceContext } from "@/module/workspace/workspace.context";
import { ModuleNewRecord } from "@/module/record/ModuleNewRecord";
import { ModuleNewRecordWithForm } from "@/module/record/ModuleNewRecordWithForm";
import { ModuleOpenRecord } from "@/module/record/ModuleOpenRecord";
import { useNewLinkedRecord } from "@/module/record/useNewLinkedRecord";
import { DashboardContext } from "./dashboard.context";
import { DashboardCustomize } from "./DashboardCustomize";
import { DashboardWidget } from "./widgets/DashboardWidget";
import { DashboardWidgetSettings } from "./settings/DashboardWidgetSettings";
import { DashboardSegmented } from "./settings/DashboardControls";
import {
  DATE_RANGES,
  singular,
  suggestedLayout,
  tableFields,
  WIDTH_CLASS,
} from "./moduleDashboard.utils";
import type {
  DashboardContextValue,
  ModuleDashboardEmptyStateProps,
  ModuleDashboardProps,
} from "./moduleDashboard.types";
import { nonEmpty } from "@/lib/stringHelper";
import "./moduleDashboard.css";

/** A record opened from a widget, by its table. */
interface OpenedRecord {
  sidebarId: string;
  objId: string;
}

/**
 * A page of widgets that read any table of the module: metrics, boards, lists, breakdowns, trends, maps and attention lists.
 * The header switches the date range; Customize edits the layout, saved with Save layout.
 */
export function ModuleDashboard({ data }: ModuleDashboardProps) {
  const item = useCurrentNavItem();
  const { goTo } = useWorkspaceContext();
  const { layout, sources, lookups, members } = data;
  const [now] = useState(() => new Date());
  const [range, setRange] = useState<IDashboardDateRange>();
  const [settingsId, setSettingsId] = useState<string>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [opened, setOpened] = useState<OpenedRecord>();
  const [newRecordOpen, setNewRecordOpen] = useState(false);
  const activeRange = range ?? layout.dateRange;

  const rangeSource = sources.find(
    (source) => source.sidebarId === layout.rangeSidebarId,
  );
  const rangeField = tableFields(rangeSource).find(
    (field) => field.objId === layout.rangeFieldId,
  );
  const newSource = sources.find(
    (source) => source.sidebarId === layout.newRecordSidebarId,
  );
  const newForm = data.forms.find(
    (form) =>
      form.objId === layout.newRecordFormId &&
      form.sidebarId === layout.newRecordSidebarId,
  );

  const onUpdateRecord = data.onUpdateRecord;
  const onMoveRecord = useCallback(
    (
      sidebarId: string,
      record: ISidebarRecord,
      fieldId: string,
      value: string,
    ) => {
      onUpdateRecord(sidebarId, record.objId, {
        ...record.values,
        [fieldId]: value,
      }).catch((error: unknown) =>
        toast.error("Couldn't move the record", {
          description: errorParser(error)?.message,
        }),
      );
    },
    [onUpdateRecord],
  );
  const openRecord = useCallback(
    (sidebarId: string, objId: string) => setOpened({ sidebarId, objId }),
    [],
  );
  const context = useMemo<DashboardContextValue>(
    () => ({
      layout,
      sources,
      lookups,
      lookupErrors: data.lookupErrors,
      onRetryLookup: data.onRetryLookup,
      members,
      now,
      range: activeRange,
      onOpenRecord: openRecord,
      onMoveRecord,
      onOpenTable: goTo,
    }),
    [
      layout,
      sources,
      lookups,
      data.lookupErrors,
      data.onRetryLookup,
      members,
      now,
      activeRange,
      openRecord,
      onMoveRecord,
      goTo,
    ],
  );

  const linkedRecord = useNewLinkedRecord(sources, lookups, data.onAddRecord);
  const onNewLinkedRecord = linkedRecord.onNewLinkedRecord;
  // Lookup inputs of an opened record find their link field among every loaded table's fields
  const linkFields = useMemo(
    () =>
      Object.values(lookups).flatMap((lookup) =>
        lookup.fields.filter((field) => field.type === "link_table"),
      ),
    [lookups],
  );
  const lookupContext = useMemo(
    () => ({
      sidebarId: opened?.sidebarId,
      sources,
      linkFields,
      lookups,
      onNewLinkedRecord,
    }),
    [opened?.sidebarId, sources, linkFields, lookups, onNewLinkedRecord],
  );

  const openedFields = lookups[opened?.sidebarId ?? ""]?.fields ?? [];
  const openedRecord = lookups[opened?.sidebarId ?? ""]?.records.find(
    (record) => record.objId === opened?.objId,
  );
  const onUploadAttachment = data.onUploadAttachment;
  const saveOpenedRecord = useCallback(
    (values: ISidebarRecordValues) =>
      opened
        ? onUpdateRecord(opened.sidebarId, opened.objId, values)
        : Promise.reject(new Error("No record is open.")),
    [opened, onUpdateRecord],
  );
  const uploadForOpened = useCallback(
    (file: File) =>
      onUploadAttachment(opened?.sidebarId ?? data.sidebarId, file),
    [onUploadAttachment, opened?.sidebarId, data.sidebarId],
  );
  const uploadForNew = useCallback(
    (file: File) =>
      onUploadAttachment(layout.newRecordSidebarId ?? data.sidebarId, file),
    [onUploadAttachment, layout.newRecordSidebarId, data.sidebarId],
  );
  const onAddRecord = data.onAddRecord;
  const addNewRecord = useCallback(
    async (values: ISidebarRecordValues) => {
      if (layout.newRecordSidebarId == null || layout.newRecordSidebarId === "")
        return;
      await onAddRecord(layout.newRecordSidebarId, values);
      toast.success(`Added to ${newSource?.sidebarText ?? "the table"}`);
    },
    [layout.newRecordSidebarId, onAddRecord, newSource?.sidebarText],
  );

  // A picked form opens as itself; one that was deleted falls back to every field
  const opensForm =
    layout.newRecordFormId != null &&
    layout.newRecordFormId !== "" &&
    (newForm !== undefined ||
      data.formsState.isLoading === true ||
      data.formsState.error != null);
  const newRecordProps = {
    open: newRecordOpen,
    onOpenChange: setNewRecordOpen,
    title:
      nonEmpty(layout.newRecordLabel) ??
      `New ${newSource ? singular(newSource.sidebarText) : "record"}`,
    fields: newSource?.fields ?? [],
    members,
    onUploadAttachment: uploadForNew,
    onSave: addNewRecord,
  };

  const selectWidget = useCallback((widgetId: string) => {
    setSettingsId(widgetId);
    setSettingsOpen(true);
  }, []);
  const settingsWidget = layout.widgets?.find(
    (widget) => widget.id === settingsId,
  );
  const onLayoutChange = data.onLayoutChange;
  const changeWidget = useCallback(
    (next: IDashboardWidget) =>
      onLayoutChange((current) => ({
        ...current,
        widgets:
          current.widgets?.map((widget) =>
            widget.id === next.id ? next : widget,
          ) ?? [],
      })),
    [onLayoutChange],
  );
  const onCustomize = data.onCustomize;
  const startSuggested = useCallback(
    () => onCustomize(suggestedLayout(layout, sources)),
    [onCustomize, layout, sources],
  );
  const startEmpty = useCallback(() => onCustomize(), [onCustomize]);

  const title = nonEmpty(layout.title) ?? item.sidebarText;
  const description = nonEmpty(layout.description) ?? item.sidebarDesc;

  return (
    <DashboardContext.Provider value={context}>
      <RecordLookupContext.Provider value={lookupContext}>
        <div className="flex min-h-0 flex-1 flex-col">
          <QueryWrapper
            {...data.dashboardState}
            isLoading={data.dashboardState.isLoading === true}
            error={data.dashboardState.error}
            renderLoader={<DashboardSkeleton />}
          >
            {data.customizing ? (
              <DashboardCustomize
                data={data}
                selectedId={settingsOpen ? settingsId : undefined}
                onSelect={selectWidget}
              />
            ) : (
              <>
                <header className="flex shrink-0 flex-col gap-3 border-b p-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-semibold tracking-tight">
                      {title}
                    </h1>
                    {description !== "" && (
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {rangeField && (
                      <div
                        title={`Filters the widgets that follow it by ${rangeSource?.sidebarText} · ${rangeField.name}`}
                      >
                        <DashboardSegmented
                          label="Date range"
                          value={activeRange}
                          options={DATE_RANGES}
                          onChange={setRange}
                        />
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      startIcon={<SlidersHorizontal size={14} />}
                      onClick={() => onCustomize()}
                    >
                      Customize
                    </Button>
                    {newSource && (
                      <Button
                        size="sm"
                        startIcon={<Plus size={14} />}
                        onClick={() => setNewRecordOpen(true)}
                      >
                        {nonEmpty(layout.newRecordLabel) ??
                          `New ${singular(newSource.sidebarText)}`}
                      </Button>
                    )}
                  </div>
                </header>
                <main className="min-h-0 flex-1 overflow-y-auto p-4">
                  {layout.widgets?.length > 0 ? (
                    <div className="grid grid-cols-12 gap-4">
                      {layout.widgets?.map((widget) => (
                        <div
                          key={widget.id}
                          className={
                            // Saved dashboards may hold a width this build doesn't know
                            WIDTH_CLASS[widget.width] ?? WIDTH_CLASS.m
                          }
                        >
                          <DashboardWidget widget={widget} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ModuleDashboardEmptyState
                      title={title}
                      canSuggest={sources.length > 0}
                      onStartSuggested={startSuggested}
                      onStartEmpty={startEmpty}
                    />
                  )}
                </main>
              </>
            )}
          </QueryWrapper>
        </div>

        <DashboardWidgetSettings
          widget={settingsWidget}
          open={settingsOpen && !!settingsWidget && data.customizing}
          onOpenChange={setSettingsOpen}
          sources={sources}
          members={members}
          rangeSidebarId={
            layout.rangeFieldId != null && layout.rangeFieldId !== ""
              ? layout.rangeSidebarId
              : undefined
          }
          onChange={changeWidget}
        />
        <ModuleOpenRecord
          recordKey={openedRecord ? opened?.objId : undefined}
          onClose={() => setOpened(undefined)}
          fields={openedFields}
          members={members}
          onUploadAttachment={uploadForOpened}
          record={openedRecord}
          onSave={saveOpenedRecord}
        />
        {opensForm ? (
          <ModuleNewRecordWithForm
            {...newRecordProps}
            {...data.formsState}
            form={newForm}
          />
        ) : (
          <ModuleNewRecord {...newRecordProps} />
        )}
        <ModuleNewRecord
          {...linkedRecord.dialog}
          members={members}
          onUploadAttachment={uploadForNew}
        />
      </RecordLookupContext.Provider>
    </DashboardContext.Provider>
  );
}

/** The page's shape while its overview loads. */
function DashboardSkeleton() {
  return (
    <div
      className="grid grid-cols-12 gap-4 p-4"
      aria-label="Loading the overview"
    >
      <Skeleton className="col-span-12 h-12 sm:col-span-6" />
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className={`${WIDTH_CLASS.s} h-28`} />
      ))}
      <Skeleton className={`${WIDTH_CLASS.full} h-56`} />
      <Skeleton className={`${WIDTH_CLASS.l} h-64`} />
      <Skeleton className={`${WIDTH_CLASS.m} h-64`} />
    </div>
  );
}

/** Shown while the overview has no widgets: start from a suggested layout or from nothing. */
function ModuleDashboardEmptyState({
  title,
  canSuggest,
  onStartSuggested,
  onStartEmpty,
}: ModuleDashboardEmptyStateProps) {
  return (
    <Empty className="h-full border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LayoutDashboard />
        </EmptyMedia>
        <EmptyTitle>Build your {title} overview</EmptyTitle>
        <EmptyDescription>
          Widgets read any table in this module: headline numbers, boards you
          can drag cards across, lists, breakdowns, trends and maps.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Button size="sm" onClick={onStartSuggested} disabled={!canSuggest}>
          Start from a suggested layout
        </Button>
        <Button variant="outline" size="sm" onClick={onStartEmpty}>
          Start empty
        </Button>
      </EmptyContent>
    </Empty>
  );
}
