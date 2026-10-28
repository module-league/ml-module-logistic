import { useCallback, useMemo, useState } from "react";
import { toast } from "@moduleleague/ui";
import {
  previewableLookupFields,
  type LookupSource,
  type RecordLookups,
} from "@/lib/lookupHelper";
import type { ModuleLinkedRecordDraft } from "@/module/page/modulePage.types";

/**
 * Backs RecordLookupContext's onNewLinkedRecord: a link input asks for a new record of a linked table,
 * the returned dialog props open a New record form for it, and the saved record is handed back to be linked.
 * @example
 * const linked = useNewLinkedRecord(lookupSources, lookups, onAddLinkedRecord);
 * <ModuleNewRecord {...linked.dialog} members={members} />
 */
export function useNewLinkedRecord(
  sources: LookupSource[],
  lookups: RecordLookups,
  onAdd: (
    sidebarId: string,
    values: ISidebarRecordValues,
  ) => Promise<ISidebarRecord>,
) {
  const [draft, setDraft] = useState<ModuleLinkedRecordDraft>();
  const onNewLinkedRecord = useCallback(
    (sidebarId: string, onAdded: (record: ISidebarRecord) => void) =>
      setDraft({ sidebarId, onAdded, open: true }),
    [],
  );
  const onOpenChange = useCallback(
    (open: boolean) =>
      setDraft((current) => (current ? { ...current, open } : current)),
    [],
  );
  const sourceText = useMemo(
    () =>
      sources.find((source) => source.sidebarId === draft?.sidebarId)
        ?.sidebarText ?? "linked",
    [sources, draft?.sidebarId],
  );
  const allFields = lookups[draft?.sidebarId ?? ""]?.fields;
  const fields = useMemo(() => previewableLookupFields(allFields), [allFields]);
  const description = useMemo(
    () =>
      fields.length < (allFields?.length ?? 0)
        ? `It's linked once added. Its link and lookup fields are filled in on the ${sourceText} page.`
        : "It's linked once added.",
    [fields.length, allFields?.length, sourceText],
  );
  const onSave = useCallback(
    async (values: ISidebarRecordValues) => {
      if (!draft) return;
      const added = await onAdd(draft.sidebarId, values);
      draft.onAdded(added);
      toast.success(`Added to ${sourceText} and linked`);
    },
    [draft, onAdd, sourceText],
  );

  const dialog = useMemo(
    () => ({
      open: draft?.open === true,
      onOpenChange,
      title: `New ${sourceText} record`,
      description,
      fields,
      onSave,
    }),
    [draft?.open, onOpenChange, sourceText, description, fields, onSave],
  );
  return { onNewLinkedRecord, dialog };
}
