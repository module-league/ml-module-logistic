import { toast } from "@moduleleague/ui";
import { ATTACHMENT_MAX_BYTES } from "@/services/attachments/attachment.api";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import {
  statusLabel,
  type DispatchShipment,
} from "../Dispatch/dispatchBoard.utils";
import { nonEmpty } from "@/lib/stringHelper";
import { selectedOptions, toOptionsValue } from "@/lib/selectHelper";

/** What each status chip says. */
export const DOCUMENT_STATUSES: { value: IDocumentStatus; label: string }[] = [
  { value: "missing", label: "Missing" },
  { value: "uploaded", label: "Uploaded" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

/**
 * The page's three colours: green is done, orange needs someone (missing, rejected, expired), blue is filed and waiting on a check.
 * chip: a status chip; card: the tinted frame around a paper that needs attention; strip: the note's text in that frame; bar: a progress fill.
 */
export const DOCUMENT_TONE = {
  green: {
    chip: TONE_CLASS.green,
    bar: "bg-emerald-600",
  },
  orange: {
    chip: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300",
    card: "border-orange-200 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/30",
    strip: "text-orange-700 dark:text-orange-300",
  },
  blue: {
    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    card: "border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30",
    strip: "text-blue-700 dark:text-blue-300",
    bar: "bg-blue-600",
  },
} as const;

export const STATUS_CLASS: Record<IDocumentStatus, string> = {
  missing: DOCUMENT_TONE.orange.chip,
  uploaded: DOCUMENT_TONE.blue.chip,
  verified: DOCUMENT_TONE.green.chip,
  rejected: DOCUMENT_TONE.orange.chip,
};

export const SOURCE_LABEL: Record<IDocumentSource, string> = {
  upload: "Uploaded",
  generated: "Generated",
  driver_app: "Driver app",
  dispatcher: "From checkpoint log",
};

const GATE_NAME: Partial<Record<IDocumentStep, string>> = {
  picked_up: "pickup",
  in_transit: "transit",
  arrived: "arrival",
  delivered: "delivery",
  billed: "billing",
};

/** "Booked", "Picked up", "Billed"; empty for a step this build doesn't know. */
export const stepLabel = (step?: IDocumentStep): string =>
  step === undefined
    ? ""
    : step === "booked"
      ? "Booked"
      : step === "billed"
        ? "Billed"
        : (statusLabel(step) ?? "");

/** "pickup", "billing": the step a document gates, as a noun. */
export const gateName = (step?: IDocumentStep): string =>
  GATE_NAME[step ?? "booked"] ??
  nonEmpty(stepLabel(step).toLowerCase()) ??
  "the next step";

/** A rule's condition as people say it: "Shipment Mode = Air" reads "Shipment Mode is Air"; "Always" stays. */
export const conditionText = (when?: string) =>
  when?.replaceAll(" = ", " is ") ?? "";

/** A shipment with its checklist, as the list and the detail show it. */
export interface DocumentRow {
  shipment: DispatchShipment;
  checklist: IShipmentChecklist;
}

/** Each shipment that has a checklist, in the board's order. */
export const buildDocumentRows = (
  shipments: DispatchShipment[],
  checklists: IShipmentChecklist[],
): DocumentRow[] => {
  const byShipment = new Map(
    checklists.map((entry) => [entry.shipmentId, entry]),
  );
  return shipments.flatMap((shipment) => {
    const checklist = byShipment.get(shipment.id);
    return checklist ? [{ shipment, checklist }] : [];
  });
};

/** "FCA" from "FCA (Free Carrier)": the leading code, as the API compares conditions. */
const codeOf = (label: string) => /^[A-Za-z0-9]+/.exec(label)?.[0] ?? label;

/** Whether a condition value picks an option, as the API matches: the same text, or the option's leading code, ignoring case. */
export const conditionPicks = (value: string, option: string) => {
  const wanted = value.toLowerCase();
  return (
    option.toLowerCase() === wanted || codeOf(option).toLowerCase() === wanted
  );
};

/** A condition's values as a multi select's value: the ids of the options they pick. Values no option picks drop out. */
export const conditionOptionIds = (field: ISidebarField, values: string[]) =>
  toOptionsValue(
    field.dropDownValues
      ?.filter((option) =>
        values.some((value) => conditionPicks(value, option.value)),
      )
      .map((option) => option.id) ?? [],
  );

/** A multi select's value back as a condition's values: the picked options' labels, e.g. "DAP (Delivered at Place)". */
export const conditionOptionValues = (field: ISidebarField, value: string) =>
  selectedOptions(field, value).map((option) => option.value);

/** Whether a requirement's condition holds for a shipment's mode and Incoterm; a role with no value can't hold. */
export function conditionHolds(
  condition: IDocumentRequirement["condition"],
  values: Partial<Record<IDocumentRole, string>>,
) {
  return Object.entries(condition).every(([role, wanted]) => {
    if (wanted === undefined || wanted.length === 0) return true;
    const value = values[role as IDocumentRole];
    return (
      value !== undefined &&
      wanted.some((entry) => conditionPicks(entry, value))
    );
  });
}

/** A new type's id from its title, e.g. "Dangerous goods note" → dangerous_goods_note; never "other" or one already taken. */
export function typeIdFor(title: string, taken: ReadonlySet<string>) {
  const base =
    nonEmpty(
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 36),
    ) ?? "document";
  let id = base === "other" ? "other_document" : base;
  for (let n = 2; taken.has(id); n++) id = `${base}_${n}`;
  return id;
}

/** A mode or Incoterm on a shipment card, with the field's option for its colour when there is one. */
export interface BasisTag {
  /** "Mode", "Incoterm". */
  label: string;
  value: string;
  option?: IFieldDropDownValue;
}

/**
 * The set ones of a shipment's mode and Incoterm as tags, each with its field's option for the colour.
 * The record stores the option's id, so that's read first; the checklist's text is matched only when the record isn't at hand.
 */
export function basisTags(
  entries: {
    label: string;
    /** The checklist's text, e.g. "Air". */
    value?: string;
    field?: ISidebarField;
    /** The shipment record's stored value: the option id. */
    recordValue?: string | null;
  }[],
): BasisTag[] {
  return entries.flatMap(({ label, value, field, recordValue }) => {
    const text = nonEmpty(value)?.toLowerCase();
    const option =
      selectedOptions(field, recordValue)[0] ??
      field?.dropDownValues?.find(
        (entry) => entry.id === value || entry.value.toLowerCase() === text,
      );
    const shown = option?.value ?? nonEmpty(value);
    return shown === undefined ? [] : [{ label, value: shown, option }];
  });
}

/** "Air · FCA", leaving out what isn't set. */
export const basisText = (checklist: IShipmentChecklist) =>
  nonEmpty([checklist.mode, checklist.incoterm].filter(Boolean).join(" · ")) ??
  "No mode or Incoterm";

/** "Needed because Shipment Mode is Air, Incoterm is FCA and the shipment is In transit." */
export function reasonText(
  checklist: IShipmentChecklist,
  modeName = "Mode",
  incotermName = "Incoterm",
) {
  const stage = nonEmpty(stepLabel(checklist.stage));
  const parts = [
    nonEmpty(checklist.mode) !== undefined &&
      `${modeName} is ${checklist.mode}`,
    nonEmpty(checklist.incoterm) !== undefined &&
      `${incotermName} is ${checklist.incoterm}`,
    stage !== undefined && `the shipment is ${stage}`,
  ].filter((part) => part !== false);
  const last = parts.pop();
  if (last === undefined) return "Needed for every shipment.";
  return parts.length > 0
    ? `Needed because ${parts.join(", ")} and ${last}.`
    : `Needed because ${last}.`;
}

/** Which shipments the list shows, by how far along their papers are. */
export type DocumentShow = "all" | "missing" | "to_verify" | "complete";

export const DOCUMENT_SHOW: { value: DocumentShow; label: string }[] = [
  { value: "all", label: "All shipments" },
  { value: "missing", label: "Missing papers" },
  { value: "to_verify", label: "Waiting to be verified" },
  { value: "complete", label: "All papers verified" },
];

/** What the Documents page narrows its list by. */
export interface DocumentFilter {
  show: DocumentShow;
  /** None means every stage. */
  stages: IDocumentStep[];
  search: string;
}

export const NO_DOCUMENT_FILTER: DocumentFilter = {
  show: "all",
  stages: [],
  search: "",
};

/** Whether a shipment's papers are in the state a Show option asks for. */
export function showsRow(checklist: IShipmentChecklist, show: DocumentShow) {
  const required = checklist.documents?.filter((entry) => entry.required) ?? [];
  if (show === "missing")
    return required.some(
      (entry) =>
        entry.status === "missing" ||
        entry.status === "rejected" ||
        entry.expired,
    );
  if (show === "to_verify")
    return required.some((entry) => entry.status === "uploaded");
  if (show === "complete") return checklist.verified >= checklist.required;
  return true;
}

/** The rows the filter keeps; search matches the shipment's title, stage, mode or Incoterm, ignoring case. */
export function filterDocumentRows(
  rows: DocumentRow[],
  filter: DocumentFilter,
  tagsById: Map<string, BasisTag[]>,
) {
  const words = filter.search.trim().toLowerCase();
  return rows.filter(({ shipment, checklist }) => {
    if (!showsRow(checklist, filter.show)) return false;
    if (filter.stages.length > 0 && !filter.stages.includes(checklist.stage))
      return false;
    if (words === "") return true;
    return [
      shipment.title,
      stepLabel(checklist.stage),
      checklist.mode,
      checklist.incoterm,
      ...(tagsById.get(shipment.id)?.map((tag) => tag.value) ?? []),
    ].some((text) => text?.toLowerCase().includes(words) === true);
  });
}

/** The checklist's documents split into on the checklist now, needed later, and filed besides. */
export const groupDocuments = (checklist: IShipmentChecklist) => ({
  required: checklist.documents?.filter((entry) => entry.required) ?? [],
  upcoming: checklist.documents?.filter((entry) => entry.upcoming) ?? [],
  extra:
    checklist.documents?.filter(
      (entry) => !entry.required && !entry.upcoming,
    ) ?? [],
});

/** "Packing list" for packing_list, "Other" for other. */
export const typeTitle = (
  rules: IDocumentRules | undefined,
  docType?: string,
) =>
  docType === "other"
    ? "Other"
    : (rules?.types?.find((type) => type.docType === docType)?.title ??
      docType ??
      "");

const REVIEWABLE_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png"]);

/** Whether the AI check can read the file: PDFs and JPG or PNG images, as DocumentReviewService takes. */
export const canReview = (file?: IAttachment): boolean =>
  REVIEWABLE_EXTENSIONS.has(file?.fileExtension?.toLowerCase() ?? "");

/** Uploads stop here when the file is over the API's limit, before sending it. */
export function checkSize(file: File) {
  if (file.size <= ATTACHMENT_MAX_BYTES) return true;
  toast.error(`${file.name} is too large`, {
    description: `Files can be up to ${ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB.`,
  });
  return false;
}
