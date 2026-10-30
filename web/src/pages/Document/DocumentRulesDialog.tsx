import { useCallback, useMemo, useRef, useState } from "react";
import { RotateCcwClock } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "@moduleleague/ui";
import { errorParser } from "@/hooks/useErrorParser";
import { SettingsField } from "@/module/dashboard/settings/DashboardControls";
import { tableFields } from "@/module/dashboard/moduleDashboard.utils";
import { RoleSelect } from "../Exception/ExceptionRulesDialog";
import { typeIdFor } from "./document.utils";
import { DocumentRulesPreview } from "./DocumentRulesPreview";
import { DocumentTypesEditor } from "./DocumentTypesEditor";
import {
  DocumentRequirementsEditor,
  type RequirementDraft,
} from "./DocumentRequirementsEditor";
import type { DocumentData } from "./useDocumentData";

/** The papers and requirements as the dialog edits them. */
interface RulesDraft {
  types: IDocumentType[];
  requirements: RequirementDraft[];
}

const toRulesDraft = (rules?: IDocumentRules): RulesDraft => ({
  types: rules?.types ?? [],
  requirements:
    rules?.requirements?.map(
      ({ when: _when, ...requirement }) => requirement,
    ) ?? [],
});

/** The fields the checklist reads, the kinds of paper it knows, and when each is needed. */
export function DocumentRulesDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DocumentData;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-dialog flex-col gap-0 p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-10 pb-3">
          <DialogTitle>Document rules</DialogTitle>
          <DialogDescription>
            Which papers a shipment needs, when, and what waits for them.
          </DialogDescription>
        </DialogHeader>
        <RulesForm data={data} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

function RulesForm({
  data,
  onOpenChange,
}: {
  data: DocumentData;
  onOpenChange: (open: boolean) => void;
}) {
  const { lookups, sources, rules, documentSettings, onSaveSettings } = data;
  const [draft, setDraft] = useState<Partial<IDocumentSettingsInput>>(() => ({
    incotermFieldId: documentSettings?.incotermFieldId,
    attachmentFieldId: documentSettings?.attachmentFieldId,
  }));
  const savedRules = useMemo(() => toRulesDraft(rules), [rules]);
  const [rulesDraft, setRulesDraft] = useState(savedRules);
  // Types added here get a placeholder id until saved, when their title gives them a real one
  const newTypeIds = useRef(new Set<string>());
  const [saving, setSaving] = useState(false);
  const fields = useMemo(
    () =>
      tableFields(lookups[sources?.shipmentSidebarId ?? ""]).filter(
        (field) => !field.isSystemField,
      ),
    [lookups, sources?.shipmentSidebarId],
  );
  const fieldOf = useCallback(
    (id?: string) => fields.find((field) => field.objId === id),
    [fields],
  );
  const mode = fieldOf(documentSettings?.modeFieldId);
  const incoterm = fieldOf(draft.incotermFieldId);
  const steps = useMemo<IDocumentStep[]>(
    () => rules?.steps ?? ["booked"],
    [rules?.steps],
  );
  const isRulesDirty =
    JSON.stringify(rulesDraft) !== JSON.stringify(savedRules);
  const isDirty =
    isRulesDirty ||
    (draft.incotermFieldId ?? "") !==
      (documentSettings?.incotermFieldId ?? "") ||
    (draft.attachmentFieldId ?? "") !==
      (documentSettings?.attachmentFieldId ?? "");
  const hasUntitled = rulesDraft.types.some((type) => type.title.trim() === "");

  const addType = useCallback(() => {
    const docType = `new_${crypto.randomUUID().slice(0, 8)}`;
    newTypeIds.current.add(docType);
    setRulesDraft((current) => ({
      ...current,
      types: [
        ...current.types,
        { docType, title: "", keywords: [], expires: false },
      ],
    }));
  }, []);
  const removeType = useCallback(
    (docType: string) =>
      setRulesDraft((current) => ({
        types: current.types.filter((type) => type.docType !== docType),
        requirements: current.requirements.filter(
          (requirement) => requirement.docType !== docType,
        ),
      })),
    [],
  );
  const addRequirement = useCallback(
    () =>
      setRulesDraft((current) => ({
        ...current,
        requirements: [
          ...current.requirements,
          {
            key: crypto.randomUUID(),
            docType: current.types[0]?.docType ?? "",
            condition: {},
            requiredAtStep: steps[0] ?? "booked",
          },
        ],
      })),
    [steps],
  );

  /** The draft as the API takes it: new types get ids from their titles, and their requirements follow. */
  const toRulesInput = useCallback((): IDocumentRulesInput => {
    const taken = new Set(
      rulesDraft.types
        .map((type) => type.docType)
        .filter((docType) => !newTypeIds.current.has(docType)),
    );
    const idOf = new Map<string, string>();
    const types = rulesDraft.types.map((type) => {
      const title = type.title.trim();
      if (!newTypeIds.current.has(type.docType)) return { ...type, title };
      const docType = typeIdFor(title, taken);
      taken.add(docType);
      idOf.set(type.docType, docType);
      return { ...type, docType, title };
    });
    return {
      types,
      requirements: rulesDraft.requirements.map((requirement) => ({
        ...requirement,
        docType: idOf.get(requirement.docType) ?? requirement.docType,
      })),
    };
  }, [rulesDraft]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await onSaveSettings({
        ...draft,
        rules: isRulesDirty ? toRulesInput() : undefined,
        versionNo: documentSettings?.versionNo ?? 0,
      });
      toast.success("Document rules saved");
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error("Couldn't save the document rules", {
        description: errorParser(error)?.message,
      });
    } finally {
      setSaving(false);
    }
  }, [
    draft,
    isRulesDirty,
    toRulesInput,
    documentSettings,
    onSaveSettings,
    onOpenChange,
  ]);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
        <section className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">
              Fields the checklist reads
            </h3>
            <SettingsField label="Mode" hint="Picks the transport papers">
              <span className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                {mode?.name ?? "Pick it in Exceptions › Rules"}
              </span>
            </SettingsField>
            <RoleSelect
              label="Incoterm"
              hint="e.g. certificate of origin"
              fields={fields}
              accepts={(field) => field.type === "single_select"}
              value={draft.incotermFieldId}
              onChange={(incotermFieldId) =>
                setDraft((current) => ({ ...current, incotermFieldId }))
              }
            />
            <RoleSelect
              label="Attachments"
              hint="Files waiting to be classified"
              fields={fields}
              accepts={(field) => field.type === "attachment"}
              value={draft.attachmentFieldId}
              onChange={(attachmentFieldId) =>
                setDraft((current) => ({ ...current, attachmentFieldId }))
              }
            />
          </div>
          <DocumentRulesPreview
            mode={mode}
            incoterm={incoterm}
            attachment={fieldOf(draft.attachmentFieldId)}
            requirements={rulesDraft.requirements}
          />
        </section>

        <RulesSection
          title="Document types"
          hint="The papers a shipment can need. Removing one also removes its requirements."
        >
          <DocumentTypesEditor
            types={rulesDraft.types}
            onChange={(types) =>
              setRulesDraft((current) => ({ ...current, types }))
            }
            onAdd={addType}
            onRemove={removeType}
          />
        </RulesSection>

        <RulesSection
          title="Requirements"
          hint="When each paper goes on a shipment's checklist, and which step waits until it's verified."
        >
          <DocumentRequirementsEditor
            requirements={rulesDraft.requirements}
            types={rulesDraft.types}
            steps={steps}
            modeField={mode}
            incotermField={incoterm}
            onChange={(requirements) =>
              setRulesDraft((current) => ({ ...current, requirements }))
            }
            onAdd={addRequirement}
          />
          <p className="text-xs text-muted-foreground">
            Only verified papers count. A missing pickup paper opens a Missing
            document exception; an unverified proof of delivery opens POD not
            verified.
          </p>
        </RulesSection>
      </div>
      <DialogFooter className="m-0 shrink-0 items-center border-t p-4">
        {hasUntitled ? (
          <span className="text-xs text-destructive sm:mr-auto">
            Give every document type a title.
          </span>
        ) : (
          isDirty && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground sm:mr-auto">
              <RotateCcwClock className="size-3.5" />
              Unsaved changes
            </span>
          )
        )}
        <Button
          variant="outline"
          size="xs"
          disabled={saving}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          size="xs"
          disabled={!isDirty || hasUntitled}
          isLoading={saving}
          onClick={() => void save()}
        >
          Save rules
        </Button>
      </DialogFooter>
    </>
  );
}

function RulesSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  );
}
