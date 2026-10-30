import { toast } from "@moduleleague/ui";
import { ATTACHMENT_MAX_BYTES } from "@/services/attachments/attachment.api";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import {
  statusLabel,
  type DispatchShipment,
} from "../Dispatch/dispatchBoard.utils";
import { nonEmpty } from "@/lib/stringHelper";

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
