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
  createField: (
    sidebarId: string,
    body: ISidebarFieldCreate,
  ) => Promise<ISidebarField>;
  updateField: (
    objId: string,
    body: ISidebarFieldUpdate,
  ) => Promise<ISidebarField>;
  deleteField: (objId: string) => Promise<unknown>;
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
  /** objId of the record open in ModuleOpenRecord. */
  openedRecordId?: string;
  /** The open record; the row from the list shows while the fresh copy loads. */
  openedRecord?: ISidebarRecord;
  openedRecordState: ModuleQueryState;
  onOpenRecord: (objId: string) => void;
  onCloseRecord: () => void;
  /** Saves the open record with its latest versionNo, so back-to-back auto-saves don't conflict. */
  onUpdateRecord: (values: ISidebarRecordValues) => Promise<unknown>;
  onAddField: (field: IField) => Promise<unknown>;
  /** Saves a field edited in ModuleEditFieldDialog with its latest versionNo. */
  onUpdateField: (objId: string, field: IField) => Promise<unknown>;
  onDeleteField: (objId: string) => Promise<unknown>;
  /** Uploads one file for an attachment field of this sidebar. */
  onUploadAttachment: (file: File) => Promise<IAttachment>;
  /** The module's sidebars that have a field a lookup can show; a new lookup field links to one of them. */
  lookupSources: LookupSource[];
  /** Fields and records of the sidebars this sidebar's lookup fields link to. */
  lookups: RecordLookups;
}

/** The field the header menu is editing or deleting; kept after open turns false so its dialog can animate out. */
export interface ModuleFieldAction {
  kind: "edit" | "delete";
  fieldId: string;
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
