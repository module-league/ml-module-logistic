declare global {
  type IView =
    // IEntityAuditable &
    //   IPremiumEntity &
    {
      name: string;
      description?: string;
      categoryId: string;
      displayOrder: number;
      filter: IViewFilterGroup;
      sorts: IViewSortDescriptor[];
      fieldOverriders: IViewFieldOverrider[];
      viewType:
        | "grid"
        | "kanban"
        | "feed"
        | "centric"
        | "file"
        | "reminder"
        | "folder"
        | "calendar";
      gridView?: IGridView;
      kanbanView?: IKanbanView;
      feedView?: IFeedView;
      centricView?: ICentricView;
      fileView?: IFileView;
      reminderView?: IReminderView;
      calendarView?: ICalendarView;
    };

  type IViewFieldOverrider = {
    viewId: string;
    fieldId: string;
    show: boolean;
    displayOrder: number;
    width: number;
    required?: boolean;
    helperText?: string;
  };

  /** Extended type to {@link IField} after applying {@link IViewFieldOverrider} settings */
  type IViewField = IField & {
    overrider: IViewFieldOverrider;
  };

  type IViewFilterGroup = {
    logic: "and" | "or";
    groups: IViewFilterGroup[];
    conditions: IViewFilterCondition[];
  };

  type IViewFilterCondition = {
    fieldId: string;
    value: string;
    operator:
      | "equal"
      | "not_equal"
      | "empty"
      | "not_empty"
      | "contains"
      | "not_contains"
      | "starts_with"
      | "not_starts_with"
      | "ends_with"
      | "not_ends_with"
      | "greater"
      | "greater_equal"
      | "lesser"
      | "lesser_equal";
  };

  type IViewSortDescriptor = {
    fieldId: string;
    direction: "asc" | "desc";
  };

  type IGridView = {
    grouping?: IViewSortDescriptor[];
    rowHeight?: number;
  };

  type IKanbanView = {
    /** Target field ID which used to dynamically generate kanban columns */
    stackingFieldId: string;
    /** Target field for the kanban card. Default to primary field if not set */
    titleFieldId?: string;
    /** kanban assignee */
    assigneeFieldId?: string;
    /** kanban description */
    descriptionFieldId?: string;
    /** kanban date */
    dateFieldId?: string;
    markExpiredDate: boolean;
    showThumbnails: boolean;
  };

  type IFeedView = {
    /** Target field for the display card. Default to primary field if not set */
    titleFieldId?: string;
    dateFieldId?: string;
    descriptionFieldId?: string;
    showThumbnails: boolean;
    /** CSS `object-fit` value */
    thumbnailFitMode: "cover" | "contain";
    /** Any valid CSS value (300px, 100%) */
    width: string;
  };

  type ICentricView = {
    groupKeys: ICentricViewGroupKey[];
    optionListTitle: string;
    /**
     * The mask template to display option header value
     * @example
     * ```js
     * '\@(field1_ID) - \@(field2_ID) (\@(field3_ID))'
     * ```
     */
    headerMacroMask: string;
    /** Serialized JSON string for the content output by Lexical */
    headerMacroContent?: string;
    /** True to wrap header to max 2 lines. False to no wrap at all */
    wrapHeader: boolean;
  };

  type ICentricViewGroupKey = {
    fieldId: string;
    show: boolean;
    isNested: boolean;
  };

  type ILinkView = {
    linkedFieldId: string;
  };

  type IFileView = {
    titleFieldId?: string;
    dateFieldId?: string;
    descriptionFieldId?: string;
  };

  type ITaskView = {
    titleFieldId?: string;
    dateFieldId?: string;
    statusFieldId?: string;
  };

  /** This is the tracking between each individual task view and records */
  type ITaskViewRecord = {
    id: number;
    recordId: string;
    taskViewId: string;
    isSubTask: boolean;
    isCompleted: boolean;
    displayOrder: number;
    priority?: "low" | "medium" | "high";
    title?: string;
    /** Keycloak user ID */
    assignee?: string;
    startDate: string;
    endDate?: string;
    /**
     * ID of the status field option. This use to achieve task flow in the task view.
     * Empty denotes the task never started
     */
    stepId?: string;
  };

  type IReminderView = {
    titleFieldId?: string;
    assigneeFieldId?: string;
    descriptionFieldId?: string;
    dateFieldId?: string;
    enableThreshold: boolean;
    thresholdDuration: number;
    statusFieldId?: string;
  };

  type IFolderView_Folder = {
    id: number;
    name: string;
    parentFolderId?: number;
    viewId: string;
    creatorId: string;
    updaterId: string;
    createDate: string;
    updateDate: string;
    folderRecords: IFolderView_FolderRecord[];
  };

  type IFolderView_FolderRecord = {
    folderId: string;
    recordId: string;
  };

  type ICalendarView = {
    /** Required setting for calendar view */
    dateFieldId: string;
    /** Optional. Set end date field to enable range settings */
    endDateFieldId?: string;
    titleFieldId?: string;
    descriptionFieldId?: string;
    userFieldId?: string;
    showThumbnail: boolean;
  };
}
