declare global {
  /** One field on a form and how the form shows it. */
  type ISidebarFormField = {
    fieldId: string;
    /** The empty answer box's hint; the field type's hint when left out. */
    placeholder?: string;
    /** The answer the form starts with, stored like the field's record value. Link and attachment fields have none. */
    defaultValue?: string;
  };

  /** A form of one sidebar, as the API returns it (lg_sidebar_form): the fields people fill in, in order. */
  type ISidebarForm = {
    objId: string;
    sidebarId: string;
    formTitle: string;
    formDescription?: string;
    /** Not offered to people; a hidden form can't be the default. */
    isHidden: boolean;
    /** The sidebar's main form; only one form of a sidebar is. */
    isDefault: boolean;
    displayOrder: number;
    /** An image attachment of the sidebar shown across the top of the form. */
    coverImageId?: string;
    /** An image attachment of the sidebar shown under the cover. */
    logoId?: string;
    /** The submit button's text; "Submit" unless renamed. */
    submitLabel: string;
    /** The clear form button's text; "Clear form" unless renamed. */
    clearLabel: string;
    /** The sidebar's fields on the form, in the order they show. */
    fields: ISidebarFormField[];
    /** Send back on update; a stale value is rejected with 409. */
    versionNo: number;
    createTime: string;
    updateTime?: string;
  };

  /** What a form is saved with; an update also sends the versionNo it last read. */
  type ISidebarFormInput = Pick<
    ISidebarForm,
    | "formTitle"
    | "formDescription"
    | "isHidden"
    | "isDefault"
    | "fields"
    | "coverImageId"
    | "logoId"
  > &
    Partial<Pick<ISidebarForm, "submitLabel" | "clearLabel">> & {
      versionNo?: number;
    };
}
