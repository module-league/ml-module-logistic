import type { ReactNode } from "react";
import type { ModuleQueryState } from "@/module/shell/module.types";

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
}

/** What every page passes into ModulePage, whichever API it came from. */
export interface ModuleData {
  fields: ISidebarField[];
  /** Fetching state of the fields; refetched each time the New record dialog opens. */
  fieldsState: ModuleQueryState;
  records: ISidebarRecord[];
  recordsState: ModuleQueryState;
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
