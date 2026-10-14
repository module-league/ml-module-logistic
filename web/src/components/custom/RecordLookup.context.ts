import { createContext, useContext } from "react";
import type { LookupSource, RecordLookups } from "@/lib/lookupHelper";

export interface RecordLookupContextValue {
  /** Sidebars a new lookup field can link to; the Add field dialog lists them. */
  sources: LookupSource[];
  /** The looked-up sidebars' fields and records, for showing and picking linked records. */
  lookups: RecordLookups;
}

const NO_LOOKUPS: RecordLookupContextValue = { sources: [], lookups: {} };

/** Set by ModulePage from useModuleData; outside a page there is nothing to look up. */
export const RecordLookupContext =
  createContext<RecordLookupContextValue>(NO_LOOKUPS);

export function useRecordLookups() {
  return useContext(RecordLookupContext);
}
