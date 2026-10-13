declare global {
  /** Field values of one record, keyed by field objId. A select stores the option id. */
  type ISidebarRecordValues = Record<string, string | null>;

  /** One record as the API returns it. Every sidebar page uses this same shape. */
  type ISidebarRecord = {
    objId: string;
    docId: number;
    sidebarId: string;
    values: ISidebarRecordValues;
    versionNo: number;
    createTime: string;
  };
}
