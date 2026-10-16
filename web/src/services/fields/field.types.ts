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
        | "time"
        | "member"
        | "link_table"
        | "lookup"
        | "mirror"
        | "templating"
        | "currency"
        | "associate"
        | "attachment"
        | "record_attachment"
        | "formula"
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
       * Used when the field is date type with time displayed, or time type (stored as "HH:mm").
       * Display the time value in 12-hour or 24-hour format. The format string is follow `date-fns` standard
       * @default 'hh:mm a'
       */
      timeFormat: "hh:mm a" | "HH:mm";
      /** Color hexcode for visual difference. The usage is depend on the field type. Only some field types would utilize this value */
      color?: string;
      /** Settings for member field only */
      memberSettings?: {
        /** Several people can be picked; the value is then a JSON array of user ids. */
        multiple?: boolean;
      };
      /** Settings for number, currency and formula fields. The value is stored as a plain number; these only change how it shows. */
      numberSettings?: {
        /** Currency field only. Shown before the number, e.g. "$" or "RM". */
        symbol?: string;
        /** 0 to 8. Left out, the decimals show as typed. */
        decimalPlaces?: number;
        /** Shows 34000000 as 34.0M when "million". */
        abbreviation: "none" | "thousand" | "million" | "billion";
      };
      /** Settings for sys_running_number field only */
      autoNumberSettings?: {
        prefix?: string;
        postfix?: string;
        leadingZeros?: number;
      };
      lookupSettings?: {
        /** link_table: the sidebarId whose records it links to, its own included; fixed once the field exists. lookup: the sidebar of its link field. */
        categoryId?: string;
        /** For link_table field only. Each record can link to several records. @default true */
        multiple?: boolean;
        /** For lookup field only. The link_table field of the same sidebar whose linked records it looks up */
        linkFieldId?: string;
        /** Optional view to adopt the filter and sort settings */
        viewId?: string;
        // /** Color of the lookup+mirror group */
        // color?: string;
        /** For link_table and lookup fields. The field of the linked sidebar shown for each linked record; a link left without one shows the primary or first field */
        lookupFieldId?: string;
        /** For lookup field only. Linked records can be previewed from an open record. @default true */
        previewEnabled?: boolean;
        /** lookup: the looked-up fields the preview shows, kept while the preview is off; left out, every field shows. link_table: the up to three fields on each linked record's card; left out, the first ones show. */
        previewFieldIds?: string[];
        /** For mirror field only. The destined linked record field ID */
        mirrorFieldId?: string;
        /** For mirror field only. The dependant lookup field ID */
        mirrorDependantFieldId?: string;
      };
      /** Settings for formula field only. It stores nothing; its value is worked out from the record's number and currency fields. */
      formulaSettings?: {
        /** A math.js expression with each field written {fieldObjId}, e.g. "{a} * {b} + 10". */
        expression: string;
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

  type ISidebarFieldOptionInput = Pick<
    IFieldDropDownValue,
    "value" | "colorCode" | "displayOrder"
  > & {
    /** An existing option's id; omit for a new option. */
    id?: string;
  };

  type ISidebarFieldCreate = Pick<IField, "name" | "type" | "description"> &
    Partial<
      Pick<
        IField,
        | "dateFormat"
        | "displayTime"
        | "timeFormat"
        | "memberSettings"
        | "numberSettings"
        | "lookupSettings"
        | "formulaSettings"
      >
    > & {
      isPrimaryField?: boolean;
      dropDownValues?: ISidebarFieldOptionInput[];
    };

  /** The type can't change once a field exists. Options left out of dropDownValues are deleted. */
  type ISidebarFieldUpdate = Pick<IField, "name" | "description"> &
    Partial<
      Pick<
        IField,
        | "dateFormat"
        | "displayTime"
        | "timeFormat"
        | "memberSettings"
        | "numberSettings"
        | "lookupSettings"
        | "formulaSettings"
      >
    > & {
      versionNo: number;
      isPrimaryField?: boolean;
      dropDownValues?: ISidebarFieldOptionInput[];
    };
}
