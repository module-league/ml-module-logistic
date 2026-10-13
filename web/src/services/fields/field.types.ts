declare global {
  type IField = 
  // IEntityAuditable &
  //   IPremiumEntity & 
    {
      name: string;
      description?: string;
      type:
        | "text"
        | "long_text"
        | "number"
        | "single_select"
        | "multi_select"
        | "checkbox"
        | "date"
        | "member"
        | "lookup"
        | "mirror"
        | "templating"
        | "associate"
        | "attachment"
        | "record_attachment"
        | "ds_creator_id"
        | "ds_create_time"
        | "ds_updater_id"
        | "ds_update_time"
        | "ds_running_number";
      isPrimaryField: boolean;
      isEditable: boolean;
      isSystemField: boolean;
      /** `type === "single_select"` */
      isSelectionField: boolean;
      /** `type === "multi_select"` */
      isMultiSelectField?: boolean;
      isDateField: boolean;
      isUserField: boolean;
      isNumeric?: boolean;
      /** A virtual field refers to field that compute a single or multiple value from a foreign source */
      isVirtualField?: boolean;
      /** A "foreign" field refers to field that may produce/compute multiple set of values from a foreign source */
      isForeignField?: boolean;
      isPlainField?: boolean;
      dateFormat: "dd/MM/yyyy" | "MM/dd/yyyy" | "dd MMM yyyy" | "yyyy-MM-dd";
      categoryId: string;
      displayOrder: number;
      dropDownValues: IFieldDropDownValue[];
      /**
       * Used when the field is date type.
       * Display the time value.
       * @default false
       */
      displayTime: boolean;
      /**
       * Used when the field is date type.
       * Display the time value in 12-hour or 24-hour format. The format string is follow `date-fns` standard
       * @default 'hh:mm a'
       */
      timeFormat: "hh:mm a" | "HH:mm";
      /** Color hexcode for visual difference. The usage is depend on the field type. Only some field types would utilize this value */
      color?: string;
      /** Settings for sys_running_number field only */
      autoNumberSettings?: {
        prefix?: string;
        postfix?: string;
        leadingZeros?: number;
      };
      lookupSettings?: {
        /** The category to lookup */
        categoryId?: string;
        /** Optional view to adopt the filter and sort settings */
        viewId?: string;
        // /** Color of the lookup+mirror group */
        // color?: string;
        /** For lookup field only. The field ID to display the value on the linked record node */
        lookupFieldId?: string;
        /** For mirror field only. The destined linked record field ID */
        mirrorFieldId?: string;
        /** For mirror field only. The dependant lookup field ID */
        mirrorDependantFieldId?: string;
      };
      templatingSettings?: {
        template?: string;
      };
      /** @deprecated DO NOT USE. BANISH THIS SHIT */
      associateSettings?: {
        /** The category which the associate field bind to */
        categoryId?: string;
        /**
         * The view which the associate field bind to.
         * The associate field can utilize the view field display settings and filters/sorts and such
         */
        viewId?: string;
        conditions?: ILinkMatchCondition[];
      };
      /** @deprecated DO NOT USE. BANISH THIS SHIT */
      attachmentSettings?: {
        /** The category this attachment field link to */
        categoryId?: string;
        /** The lookup field ID this attachment field link to */
        fieldId?: string;
        /**
         * The view which the associate field bind to.
         * The associate field can utilize the view field display settings and filters/sorts and such
         */
        viewId?: string;
        // maybe other settings here to control attachment upload, like file size, file extension
      };
    };

  type IFieldDropDownValue = 
  //IPremiumEntity & 
  {
    id: string;
    value: string;
    fieldId: string;
    /** Hex color string (Eg: #FF000000) */
    colorCode?: string;
    createDate: string;
    displayOrder: number;
  };

  /** For link field only. Condition to match records */
  type ILinkMatchCondition = {
    /** Field Id of source category which the link field belongs to */
    srcFieldId: string;
    /** Field Id of linked category */
    linkFieldId: string;
  };

  /** A field template of one sidebar, as the API returns it (lg_sidebar_field). */
  type ISidebarField = IField & {
    objId: string;
    sidebarId: string;
    /** Send back on update; a stale value is rejected with 409. */
    versionNo: number;
    createTime: string;
    updateTime?: string;
  };

  type ISidebarFieldOptionInput = Pick<IFieldDropDownValue, "value" | "colorCode" | "displayOrder"> & {
    /** An existing option's id; omit for a new option. */
    id?: string;
  };

  type ISidebarFieldCreate = Pick<IField, "name" | "type" | "description"> &
    Partial<Pick<IField, "dateFormat" | "displayTime" | "timeFormat">> & {
    isPrimaryField?: boolean;
    dropDownValues?: ISidebarFieldOptionInput[];
  };

  /** The type can't change once a field exists. Options left out of dropDownValues are deleted. */
  type ISidebarFieldUpdate = Pick<IField, "name" | "description"> & {
    versionNo: number;
    isPrimaryField?: boolean;
    dropDownValues?: ISidebarFieldOptionInput[];
  };
}
