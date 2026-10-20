import { useCallback, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "@moduleleague/ui";
import { SortableHandle, SortableList } from "@/components/custom/SortableList";
import { useSortableRow } from "@/hooks/useSortableRow";
import { errorParser } from "@/hooks/useErrorParser";
import { canShowInLookup } from "@/lib/lookupHelper";
import { isShowableField } from "@/module/dashboard/moduleDashboard.utils";
import {
  DashboardFieldSelect,
  SettingsField,
  SettingsSection,
} from "@/module/dashboard/settings/DashboardControls";
import { DispatchShipmentCard } from "./DispatchBoard";
import {
  locationLinks,
  toCardPicks,
  type DispatchCardPicks,
  type DispatchShipment,
} from "./dispatchBoard.utils";

const MAX_DETAILS = 4;

type DispatchCardSettingsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The shipment table's fields, in display order. */
  fields: ISidebarField[];
  locationSidebarId?: string;
  /** The saved picks; left out before the first save, so nothing is picked. */
  saved?: DispatchCardPicks;
  /** The versionNo of the saved settings, 0 before the first save. */
  versionNo: number;
  /** A shipment as the card would show it with these picks. */
  previewOf: (picks: DispatchCardPicks) => DispatchShipment | undefined;
  onSave: (body: IDispatchSettingsInput) => Promise<IDispatchSettings>;
};

/**
 * Picks which shipment fields the Dispatch board reads: the route a dispatch takes, what each shipment card shows,
 * and the weight checked against vehicle capacity. The preview follows each change.
 */
export function DispatchCardSettings(props: DispatchCardSettingsProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-10 pb-3">
          <DialogTitle>Customize shipment card</DialogTitle>
          <DialogDescription>
            Pick the shipment fields the board reads. Everyone on this page sees
            the same card.
          </DialogDescription>
        </DialogHeader>
        <DispatchCardSettingsForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

function DispatchCardSettingsForm({
  onOpenChange,
  fields,
  locationSidebarId,
  saved,
  versionNo,
  previewOf,
  onSave,
}: DispatchCardSettingsProps) {
  const [draft, setDraft] = useState<DispatchCardPicks>(() =>
    toCardPicks(saved),
  );
  const [saving, setSaving] = useState(false);
  const preview = useMemo(() => previewOf(draft), [previewOf, draft]);
  const links = useMemo(
    () => locationLinks(fields, locationSidebarId),
    [fields, locationSidebarId],
  );
  const set = useCallback(
    (patch: Partial<DispatchCardPicks>) =>
      setDraft((current) => ({ ...current, ...patch })),
    [],
  );

  const routeError = !draft?.originFieldId
    ? "Pick the origin field."
    : !draft?.destinationFieldId
      ? "Pick the destination field."
      : draft.originFieldId === draft.destinationFieldId
        ? "Pick a different field for the destination."
        : undefined;

  const save = useCallback(async () => {
    if (routeError) return;
    setSaving(true);
    try {
      await onSave({ ...draft, versionNo });
      toast.success("Shipment card saved");
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't save the shipment card", {
        description: errorParser(error)?.message,
      });
    } finally {
      setSaving(false);
    }
  }, [routeError, onSave, draft, versionNo, onOpenChange]);

  return (
    <>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto p-4 md:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex flex-col gap-6">
          <SettingsSection title="Route">
            {links.length < 2 && (
              <p className="text-xs text-destructive">
                The shipment table needs two link fields to the location table,
                one for the origin and one for the destination.
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SettingsField label="Origin" hint="link to locations">
                <DashboardFieldSelect
                  fields={links}
                  value={draft?.originFieldId}
                  onChange={(originFieldId) => set({ originFieldId })}
                />
              </SettingsField>
              <SettingsField label="Destination" hint="link to locations">
                <DashboardFieldSelect
                  fields={links}
                  value={draft?.destinationFieldId}
                  onChange={(destinationFieldId) => set({ destinationFieldId })}
                />
              </SettingsField>
            </div>
          </SettingsSection>

          <SettingsSection title="Card">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SettingsField label="Title">
                <DashboardFieldSelect
                  fields={fields}
                  accepts={canShowInLookup}
                  value={draft?.titleFieldId}
                  onChange={(titleFieldId) => set({ titleFieldId })}
                  noneLabel="Primary field"
                />
              </SettingsField>
              <SettingsField label="Badge" hint="e.g. mode">
                <DashboardFieldSelect
                  fields={fields}
                  accepts={canShowInLookup}
                  value={draft?.badgeFieldId}
                  onChange={(badgeFieldId) => set({ badgeFieldId })}
                  noneLabel="No badge"
                />
              </SettingsField>
            </div>
            <SettingsField label="Details" hint={`up to ${MAX_DETAILS}`}>
              <DetailFieldList
                fields={fields}
                value={draft?.detailFieldIds ?? []}
                onChange={(detailFieldIds) => set({ detailFieldIds })}
              />
            </SettingsField>
          </SettingsSection>

          <SettingsSection title="Capacity">
            <SettingsField label="Weight" hint="number field in kg">
              <DashboardFieldSelect
                fields={fields}
                accepts={(field) => !!field?.isNumeric}
                value={draft?.weightFieldId}
                onChange={(weightFieldId) => set({ weightFieldId })}
                noneLabel="Don't check capacity"
              />
            </SettingsField>
            <p className="text-xs text-muted-foreground">
              Drivers whose vehicle can't carry the weight show as over
              capacity.
            </p>
          </SettingsSection>
        </div>

        <aside className="flex flex-col gap-2 md:sticky md:top-0 md:self-start">
          <span className="text-xs font-medium text-muted-foreground">
            Preview
          </span>
          {preview ? (
            <DispatchShipmentCard
              shipment={preview}
              showRoute={!!draft?.originFieldId && !!draft?.destinationFieldId}
              selected={false}
              onSelect={() => {}}
            />
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              Add a shipment to see the card.
            </p>
          )}
        </aside>
      </div>
      <DialogFooter className="m-0 shrink-0 items-center border-t p-4">
        {routeError && (
          <span className="mr-auto text-xs text-destructive">{routeError}</span>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={saving}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button size="sm" disabled={!!routeError || saving} onClick={save}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}

function DetailFieldList({
  fields,
  value,
  onChange,
}: {
  fields: ISidebarField[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const nextField = useMemo(
    () =>
      fields.find(
        (field) => isShowableField(field) && !value.includes(field.objId),
      ),
    [fields, value],
  );
  return (
    <div className="flex flex-col gap-1.5">
      <SortableList ids={value} onReorder={onChange}>
        {value.map((fieldId, index) => (
          <DetailFieldRow
            key={fieldId}
            fieldId={fieldId}
            index={index}
            fields={fields}
            takenIds={value}
            onChange={(next) =>
              onChange(value.map((id, at) => (at === index ? next : id)))
            }
            onRemove={() => onChange(value.filter((_, at) => at !== index))}
          />
        ))}
      </SortableList>
      <Button
        variant="ghost"
        size="xs"
        className="w-fit text-primary"
        startIcon={<Plus size={13} />}
        disabled={!nextField || value.length >= MAX_DETAILS}
        onClick={() => nextField && onChange([...value, nextField.objId])}
      >
        Add detail
      </Button>
    </div>
  );
}

function DetailFieldRow({
  fieldId,
  index,
  fields,
  takenIds,
  onChange,
  onRemove,
}: {
  fieldId: string;
  index: number;
  fields: ISidebarField[];
  takenIds: string[];
  onChange: (fieldId: string) => void;
  onRemove: () => void;
}) {
  const { ref, style, isDragging, handle } = useSortableRow(fieldId);
  const field = fields.find((entry) => entry?.objId === fieldId);
  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 rounded-lg bg-background",
        isDragging && "relative z-10 shadow-md",
      )}
    >
      <SortableHandle
        handle={handle}
        label={field?.name ?? `detail ${index + 1}`}
      />
      <DashboardFieldSelect
        fields={fields}
        accepts={(entry) =>
          isShowableField(entry) &&
          (entry.objId === fieldId || !takenIds.includes(entry.objId))
        }
        value={fieldId}
        onChange={(next) => next && onChange(next)}
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove ${field?.name ?? `detail ${index + 1}`}`}
        className="text-muted-foreground hover:text-foreground"
        startIcon={<X size={14} />}
        onClick={onRemove}
      />
    </div>
  );
}
