import type { ComponentType, ReactNode } from "react";
import type { ModuleQueryState } from "@/module/shell/module.types";
import type { ModuleDataApi } from "@/module/page/modulePage.types";
import type { LookupSource, RecordLookups } from "@/lib/lookupHelper";

/** The API functions a dashboard page hands to useDashboardData. */
export interface ModuleDashboardApi extends Pick<
  ModuleDataApi,
  | "getFields"
  | "getRecords"
  | "createRecord"
  | "updateRecord"
  | "getMembers"
  | "uploadAttachment"
> {
  getDashboard: (sidebarId: string) => Promise<ISidebarDashboard>;
  saveDashboard: (
    sidebarId: string,
    body: ISidebarDashboardInput,
  ) => Promise<ISidebarDashboard>;
}

/** What useDashboardData returns and ModuleDashboard shows. */
export interface ModuleDashboardData {
  sidebarId: string;
  /** Loading the saved overview. */
  dashboardState: ModuleQueryState;
  /** The overview being shown: the unsaved draft while customizing, the saved one otherwise. */
  layout: ISidebarDashboard;
  /** The overview has never been saved. */
  isNew: boolean;
  customizing: boolean;
  /** Starts customizing from the saved overview, or from the given one, e.g. a suggested layout. */
  onCustomize: (start?: ISidebarDashboard) => void;
  onCancelCustomize: () => void;
  onLayoutChange: (
    update: (layout: ISidebarDashboard) => ISidebarDashboard,
  ) => void;
  /** Saves the draft and stops customizing; a rejection keeps the draft. */
  onSaveLayout: () => Promise<unknown>;
  saving: boolean;
  /** Every table of the module with its fields, this page left out. */
  sources: LookupSource[];
  /** Fields and records of the tables the widgets read and link to. */
  lookups: RecordLookups;
  /** Why a table's records couldn't load, by sidebarId. */
  lookupErrors: Record<string, unknown>;
  onRetryLookup: (sidebarId: string) => void;
  members: IUserInfo[];
  /** Saves new values for a record with its latest versionNo; the list changes at once and rolls back on failure. */
  onUpdateRecord: (
    sidebarId: string,
    objId: string,
    values: ISidebarRecordValues,
  ) => Promise<ISidebarRecord>;
  onAddRecord: (
    sidebarId: string,
    values: ISidebarRecordValues,
  ) => Promise<ISidebarRecord>;
  onUploadAttachment: (sidebarId: string, file: File) => Promise<IAttachment>;
}

export interface ModuleDashboardProps {
  data: ModuleDashboardData;
}

export interface ModuleDashboardEmptyStateProps {
  /** The page title, as in "Build your Logistic overview". */
  title?: string;
  /** Some table has fields to build a suggested layout from. */
  canSuggest: boolean;
  /** Starts customizing from a layout built from the module's tables. */
  onStartSuggested: () => void;
  /** Starts customizing with no widgets. */
  onStartEmpty: () => void;
}

/** One entry of the Add widget panel. */
export interface DashboardWidgetType {
  type: IDashboardWidgetType;
  label: string;
  description: string;
  /** What a table needs for this widget, shown in the panel. */
  requirement: string;
  icon: ComponentType<{ className?: string }>;
  width: IDashboardWidgetWidth;
  accepts: (source: LookupSource, sources?: LookupSource[]) => boolean;
}

/** Records sharing one value of a field: an option, a person, a linked record or a tick. */
export interface DashboardRecordGroup {
  /** The option, user or record id; "" for records without a value. */
  key: string;
  label: string;
  color?: string;
  /** A linked record's card fields, e.g. "Warehouse · MY-SHA-01". */
  caption?: string;
  records: ISidebarRecord[];
}

/** Shared by every widget on the page (see ModuleDashboard). */
export interface DashboardContextValue {
  layout: ISidebarDashboard;
  sources: LookupSource[];
  lookups: RecordLookups;
  lookupErrors: Record<string, unknown>;
  onRetryLookup: (sidebarId: string) => void;
  members: IUserInfo[];
  /** When the page opened; dates are compared with it. */
  now: Date;
  range: IDashboardDateRange;
  onOpenRecord: (sidebarId: string, objId: string) => void;
  /** Sets one field of a record, e.g. when a board card is dropped in another column. */
  onMoveRecord: (
    sidebarId: string,
    record: ISidebarRecord,
    fieldId: string,
    value: string,
  ) => void;
  onOpenTable: (sidebarId: string) => void;
}

/** A widget's table and the records it shows, worked out once for its body. */
export interface DashboardWidgetView {
  source?: LookupSource;
  fields: ISidebarField[];
  fieldById: Map<string, ISidebarField>;
  /** After the widget filter and the page range. */
  records: ISidebarRecord[];
  isLoading: boolean;
  error?: unknown;
  /** Why the widget can't show anything yet, e.g. its table was removed. */
  problem?: string;
}

export interface DashboardWidgetBodyProps {
  widget: IDashboardWidget;
  view: DashboardWidgetView;
  /** Inert, for the live preview in widget settings: records don't open and cards don't drag. */
  preview?: boolean;
}

export interface DashboardWidgetCardProps {
  widget: IDashboardWidget;
}

export interface DashboardWidgetFrameProps {
  title: ReactNode;
  /** Shown on the right of the title. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

export interface DashboardCustomizeProps {
  data: ModuleDashboardData;
  /** The widget whose settings are open. */
  selectedId?: string;
  onSelect: (widgetId: string) => void;
}

export interface DashboardWidgetSettingsProps {
  widget?: IDashboardWidget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: LookupSource[];
  members: IUserInfo[];
  /** The table the page date range applies to; a widget on it can follow the range. */
  rangeSidebarId?: string;
  onChange: (widget: IDashboardWidget) => void;
}

/** The settings of one widget type, inside DashboardWidgetSettings. */
export interface DashboardTypeSettingsProps {
  widget: IDashboardWidget;
  fields: ISidebarField[];
  sources: LookupSource[];
  members: IUserInfo[];
  onChange: (patch: Partial<IDashboardWidget>) => void;
}

export interface DashboardFilterEditorProps {
  fields: ISidebarField[];
  filter: IDashboardFilter;
  members: IUserInfo[];
  onChange: (filter: IDashboardFilter) => void;
}

export interface DashboardFieldListProps {
  fields: ISidebarField[];
  value?: string;
  onChange: (fieldId: string) => void;
  /** Why a field can't be picked, e.g. "not a number"; undefined when it can. */
  reasonOf: (field: ISidebarField) => string | undefined;
  label: string;
}

export interface DashboardFieldSelectProps {
  fields: ISidebarField[];
  value?: string;
  onChange: (fieldId: string | undefined) => void;
  /** Which fields are offered; every field when left out. */
  accepts?: (field: ISidebarField) => boolean;
  placeholder?: string;
  /** Offers a "None" choice that clears the pick. */
  noneLabel?: string;
  id?: string;
  className?: string;
}

export interface DashboardSegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}
