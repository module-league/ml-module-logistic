import type { ReactNode } from "react";
import type { ModuleQueryState } from "@/module/shell/module.types";
import type { LookupSource, RecordLookups } from "@/lib/lookupHelper";

/** The API functions a page hands to useModuleData; each page picks its own, all return the same shapes. */
export interface ModuleDataApi {
  getFields: (sidebarId: string) => Promise<ISidebarField[]>;
  getRecords: (sidebarId: string) => Promise<ISidebarRecord[]>;
  getRecord: (sidebarId: string, objId: string) => Promise<ISidebarRecord>;
  createRecord: (
    sidebarId: string,
    values: ISidebarRecordValues,
  ) => Promise<ISidebarRecord>;
  updateRecord: (
    sidebarId: string,
    objId: string,
    body: ISidebarRecordUpdate,
  ) => Promise<ISidebarRecord>;
  deleteRecords: (sidebarId: string, ids: string[]) => Promise<unknown>;
  createField: (
    sidebarId: string,
    body: ISidebarFieldCreate,
  ) => Promise<ISidebarField>;
  updateField: (
    objId: string,
    body: ISidebarFieldUpdate,
  ) => Promise<ISidebarField>;
  deleteField: (objId: string) => Promise<unknown>;
  getForms: (sidebarId: string) => Promise<ISidebarForm[]>;
  createForm: (
    sidebarId: string,
    body: ISidebarFormInput,
  ) => Promise<ISidebarForm>;
  updateForm: (objId: string, body: ISidebarFormInput) => Promise<ISidebarForm>;
  deleteForm: (objId: string) => Promise<unknown>;
  reorderForms: (
    sidebarId: string,
    formIds: string[],
  ) => Promise<ISidebarForm[]>;
  /** People member fields can pick from. */
  getMembers: () => Promise<IUserInfo[]>;
  /** useModuleData passes the sidebar id as refId. */
  uploadAttachment: (refId: string, file: File) => Promise<IAttachment>;
}

/** What every page passes into ModulePage, whichever API it came from. */
export interface ModuleData {
  fields: ISidebarField[];
  /** Fetching state of the fields; refetched each time the New record dialog opens. */
  fieldsState: ModuleQueryState;
  records: ISidebarRecord[];
  recordsState: ModuleQueryState;
  members: IUserInfo[];
  onRefreshFields: () => void;
  onAddRecord: (values: ISidebarRecordValues) => Promise<unknown>;
  /** Adds a record to a sidebar a link field links to, so it can be linked at once. */
  onAddLinkedRecord: (
    sidebarId: string,
    values: ISidebarRecordValues,
  ) => Promise<ISidebarRecord>;
  /** objId of the record open in ModuleOpenRecord. */
  openedRecordId?: string;
  /** The open record; the row from the list shows while the fresh copy loads. */
  openedRecord?: ISidebarRecord;
  openedRecordState: ModuleQueryState;
  onOpenRecord: (objId: string) => void;
  onCloseRecord: () => void;
  /** Saves the open record with its latest versionNo, so back-to-back auto-saves don't conflict. */
  onUpdateRecord: (values: ISidebarRecordValues) => Promise<unknown>;
  /** Deletes the records by objId; links to them are removed and every record list is fetched again. */
  onDeleteRecords: (ids: string[]) => Promise<unknown>;
  onAddField: (field: IField) => Promise<unknown>;
  /** Saves a field edited in ModuleEditFieldDialog with its latest versionNo. */
  onUpdateField: (objId: string, field: IField) => Promise<unknown>;
  onDeleteField: (objId: string) => Promise<unknown>;
  /** The sidebar's forms in display order. */
  forms: ISidebarForm[];
  formsState: ModuleQueryState;
  onAddForm: (form: ISidebarFormInput) => Promise<ISidebarForm>;
  /** Saves with the form's latest versionNo; a new default clears the old one. */
  onUpdateForm: (
    objId: string,
    form: ISidebarFormInput,
  ) => Promise<ISidebarForm>;
  onDeleteForm: (objId: string) => Promise<unknown>;
  /** Every form's objId in the new order; the list moves at once and settles when the API answers. */
  onReorderForms: (formIds: string[]) => Promise<unknown>;
  /** Uploads one file for an attachment field of this sidebar. */
  onUploadAttachment: (file: File) => Promise<IAttachment>;
  /** Every sidebar of the module, this one included; a new link field links to one of them. */
  lookupSources: LookupSource[];
  /** Fields and records of the sidebars this sidebar's link and lookup fields point at. */
  lookups: RecordLookups;
}

/** The field the header menu is editing or deleting; kept after open turns false so its dialog can animate out. */
export interface ModuleFieldAction {
  kind: "edit" | "delete";
  fieldId: string;
  open: boolean;
}

/** The linked sidebar the New record dialog adds to; kept after open turns false so the dialog can animate out. */
export interface ModuleLinkedRecordDraft {
  sidebarId: string;
  /** Links the added record in the input that asked for it. */
  onAdded: (record: ISidebarRecord) => void;
  open: boolean;
}

/** The records the Delete dialog asks about; kept after open turns false so the dialog can animate out. */
export interface ModuleRecordDeletion {
  keys: string[];
  open: boolean;
}

export interface ModulePageProps {
  data: ModuleData;
  /** Buttons shown on the right of the page header. */
  actions?: ReactNode;
  /** @default 20 */
  pageSize?: number;
}

export interface ModulePageFooterProps {
  total: number;
  /** 1-based. */
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** How many records are ticked; shown with a Clear button when above 0. */
  selectedCount?: number;
  onClearSelection?: () => void;
  /** Rows pinned to the top; they sit above every page, so paging skips them. */
  pinnedCount?: number;
}
