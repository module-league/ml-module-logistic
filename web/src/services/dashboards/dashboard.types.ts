declare global {
  /** The range the page header switches between; it filters the widgets that follow it. */
  type IDashboardDateRange = "today" | "next_7_days" | "next_30_days";

  type IDashboardWidgetType =
    "metric" | "board" | "list" | "breakdown" | "trend" | "map" | "attention";

  /** s is a quarter of the row, m a third, l two thirds. */
  type IDashboardWidgetWidth = "s" | "m" | "l" | "full";

  /** A span of days a date condition compares with, counted from today. */
  type IDashboardPeriod =
    | "today"
    | "yesterday"
    | "tomorrow"
    | "this_week"
    | "this_month"
    | "this_year"
    | "last_7_days"
    | "next_7_days"
    | "last_30_days"
    | "next_30_days";

  type IDashboardOperator =
    | "contains"
    | "not_contains"
    | "is"
    | "is_not"
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "any_of"
    | "none_of"
    | "all_of"
    | "within"
    | "before"
    | "after"
    | "checked"
    | "unchecked"
    | "empty"
    | "not_empty";

  type IDashboardCondition = {
    fieldId: string;
    operator: IDashboardOperator;
    /** Text or a number as typed, a JSON array of option or member ids, or an IDashboardPeriod. */
    value?: string;
  };

  type IDashboardFilter = {
    match: "all" | "any";
    conditions: IDashboardCondition[];
  };

  type IDashboardCalculation = "count" | "sum" | "average" | "min" | "max";

  /** Counts the records, or works out a number field across them. */
  type IDashboardMeasure = {
    calculation: IDashboardCalculation;
    /** The number field; left out when counting. */
    fieldId?: string;
  };

  type IDashboardMetric = IDashboardMeasure & {
    /** Shown after the number, e.g. "kg". */
    unit?: string;
    /** auto describes the calculation, count says how many records, split counts by a select, next names the next record by a date. */
    caption: "auto" | "count" | "split" | "next" | "custom";
    captionText?: string;
    splitFieldId?: string;
    nextFieldId?: string;
    /** Colours the card while the number is above zero. */
    tone: "none" | "red" | "amber" | "green";
  };

  type IDashboardBoard = {
    /** The single select whose options are the columns; dragging a card sets it. */
    groupFieldId?: string;
    /** Left out, the primary field. */
    titleFieldId?: string;
    /** Up to two fields under the title, joined by an arrow, e.g. origin → destination. */
    subtitleFieldIds: string[];
    badgeFieldId?: string;
    dateFieldId?: string;
    /** Marks cards whose date has passed, except in doneOptionIds. */
    showLate: boolean;
    doneOptionIds: string[];
    cardsPerColumn: number;
    draggable: boolean;
  };

  type IDashboardListColumn = {
    fieldId: string;
    /** Shown after an arrow in the same column, e.g. origin → destination. */
    toFieldId?: string;
  };

  type IDashboardList = {
    columns: IDashboardListColumn[];
    sortFieldId?: string;
    sortDirection: "asc" | "desc";
    rows: number;
  };

  type IDashboardBreakdown = IDashboardMeasure & {
    /** A select, member, checkbox or link field; each value or linked record is one bar. */
    groupFieldId?: string;
    style: "bars" | "stacked";
    limit: number;
  };

  type IDashboardTrend = IDashboardMeasure & {
    dateFieldId?: string;
    bucket: "day" | "week" | "month";
    /** How many buckets, ending with the current one. */
    span: number;
    chart: "bar" | "line";
  };

  /** Where a record sits: its own latitude and longitude fields, or those of the record a link field links to. */
  type IDashboardMapPoint = {
    linkFieldId?: string;
    latFieldId?: string;
    lngFieldId?: string;
  };

  type IDashboardMap = {
    from: IDashboardMapPoint;
    /** Draws a route from each record's from point to this one. */
    to?: IDashboardMapPoint;
    titleFieldId?: string;
  };

  type IDashboardAttentionRule = {
    id: string;
    /** Shown next to each matching record, e.g. "ETA passed". */
    name: string;
    tone: "red" | "amber";
    filter: IDashboardFilter;
    /** The row's button; left out, "Open". */
    actionLabel?: string;
  };

  type IDashboardAttention = {
    titleFieldId?: string;
    rules: IDashboardAttentionRule[];
  };

  type IDashboardWidget = {
    id: string;
    type: IDashboardWidgetType;
    width: IDashboardWidgetWidth;
    /** The table the widget reads. */
    sidebarId: string;
    label: string;
    /** Shown on the right of the widget's title; left out, the widget describes itself. Metrics use metric.caption. */
    caption?: string;
    filter: IDashboardFilter;
    /** Also keeps records inside the page date range; only for the table the range applies to. */
    followsRange?: boolean;
    metric?: IDashboardMetric;
    board?: IDashboardBoard;
    list?: IDashboardList;
    breakdown?: IDashboardBreakdown;
    trend?: IDashboardTrend;
    map?: IDashboardMap;
    attention?: IDashboardAttention;
  };

  /** A sidebar page's widget overview as the API returns it (lg_sidebar_dashboard). */
  type ISidebarDashboard = {
    /** Left out until the overview is first saved. */
    objId?: string;
    sidebarId: string;
    title?: string;
    description?: string;
    dateRange: IDashboardDateRange;
    /** The table and date field the page date range filters. */
    rangeSidebarId?: string;
    rangeFieldId?: string;
    /** The table the header's New button adds to; left out hides the button. */
    newRecordSidebarId?: string;
    newRecordLabel?: string;
    /** The form of newRecordSidebarId the New button opens; left out opens every field. */
    newRecordFormId?: string;
    widgets: IDashboardWidget[];
    /** 0 until the overview is first saved. */
    versionNo: number;
    updateTime?: string;
  };

  type ISidebarDashboardInput = Omit<
    ISidebarDashboard,
    "objId" | "sidebarId" | "updateTime"
  >;
}
