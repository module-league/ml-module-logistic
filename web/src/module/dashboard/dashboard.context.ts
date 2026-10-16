import { createContext, useContext } from "react";
import type { DashboardContextValue } from "./moduleDashboard.types";

/** Set by ModuleDashboard; every widget reads its records, members and actions from it. */
export const DashboardContext = createContext<DashboardContextValue | null>(
  null,
);

export function useDashboard(): DashboardContextValue {
  const value = useContext(DashboardContext);
  if (!value)
    throw new Error("useDashboard must be used inside ModuleDashboard.");
  return value;
}
