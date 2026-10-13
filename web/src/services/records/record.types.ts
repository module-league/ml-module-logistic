declare global {
  /** Field values of one record, keyed by field objId. A select stores the option id. */
  type ISidebarRecordValues = Record<string, string | null>;

  /** Replaces every value of a record; send the versionNo you last read. */
  type ISidebarRecordUpdate = {
    values: ISidebarRecordValues;
    versionNo: number;
  };

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
