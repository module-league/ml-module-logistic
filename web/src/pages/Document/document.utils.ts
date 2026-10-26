import { toast } from "@moduleleague/ui";
import { errorParser } from "@/hooks/useErrorParser";
import { ATTACHMENT_MAX_BYTES } from "@/services/attachments/attachment.api";
import { TONE_CLASS } from "@/module/dashboard/moduleDashboard.utils";
import {
  statusLabel,
  type DispatchShipment,
} from "../Dispatch/dispatchBoard.utils";

/** What each status chip says. */
export const DOCUMENT_STATUSES: { value: IDocumentStatus; label: string }[] = [
  { value: "missing", label: "Missing" },
  { value: "uploaded", label: "Uploaded" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

export const STATUS_CLASS: Record<IDocumentStatus, string> = {
  missing: TONE_CLASS.red,
  uploaded: TONE_CLASS.amber,
  verified: TONE_CLASS.green,
  rejected: TONE_CLASS.red,
};

/** The icon tile of each status. */
export const TILE_CLASS: Record<IDocumentStatus, string> = {
  missing: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300",
  uploaded:
    "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
  verified:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
  rejected: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300",
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

/** "Booked", "Picked up", "Billed". */
export const stepLabel = (step?: IDocumentStep) =>
  !step
    ? ""
    : step === "booked"
      ? "Booked"
      : step === "billed"
        ? "Billed"
        : statusLabel(step);

/** "pickup", "billing": the step a document gates, as a noun. */
export const gateName = (step?: IDocumentStep) =>
  GATE_NAME[step ?? "booked"] ?? stepLabel(step).toLowerCase();

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
  [checklist.mode, checklist.incoterm].filter(Boolean).join(" · ") ||
  "No mode or Incoterm";

/** "Required because Shipment Mode = Air, Incoterm = FCA, stage = In transit." */
export function reasonText(
  checklist: IShipmentChecklist,
  modeName = "Mode",
  incotermName = "Incoterm",
) {
  const parts = [
    checklist.mode && `${modeName} = ${checklist.mode}`,
    checklist.incoterm && `${incotermName} = ${checklist.incoterm}`,
    `stage = ${stepLabel(checklist.stage)}`,
  ].filter(Boolean);
  return `Required because ${parts.join(", ")}.`;
}

/** The checklist's documents split into on the checklist now, needed later, and filed besides. */
export const groupDocuments = (checklist: IShipmentChecklist) => ({
  required: checklist.documents.filter((entry) => entry.required),
  upcoming: checklist.documents.filter((entry) => entry.upcoming),
  extra: checklist.documents.filter(
    (entry) => !entry.required && !entry.upcoming,
  ),
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

/** Runs a change and says when it fails; true when it worked. */
export async function attempt(failure: string, task: () => Promise<unknown>) {
  try {
    await task();
    return true;
  } catch (error) {
    toast.error(failure, { description: errorParser(error)?.message });
    return false;
  }
}

/** Uploads stop here when the file is over the API's limit, before sending it. */
export function checkSize(file: File) {
  if (file.size <= ATTACHMENT_MAX_BYTES) return true;
  toast.error(`${file.name} is too large`, {
    description: `Files can be up to ${ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB.`,
  });
  return false;
}
