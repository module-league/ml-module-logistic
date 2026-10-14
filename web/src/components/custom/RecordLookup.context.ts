import { createContext, useContext } from "react";
import type { LookupSource, RecordLookups } from "@/lib/lookupHelper";

export interface RecordLookupContextValue {
  /** The sidebar of the page; a link field can link to it too. */
  sidebarId?: string;
  /** Sidebars a new link field can link to, this one included; the Add field dialog lists them. */
  sources: LookupSource[];
  /** This sidebar's link fields; a lookup looks up through one of them. */
  linkFields: ISidebarField[];
  /** The linked sidebars' fields and records, for showing and picking linked records. */
  lookups: RecordLookups;
}

const NO_LOOKUPS: RecordLookupContextValue = {
  sources: [],
  linkFields: [],
  lookups: {},
};

/** Set by ModulePage from useModuleData; outside a page there is nothing to look up. */
export const RecordLookupContext =
  createContext<RecordLookupContextValue>(NO_LOOKUPS);

export function useRecordLookups() {
  return useContext(RecordLookupContext);
}
