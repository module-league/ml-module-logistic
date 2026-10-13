declare global {
  /** One record as the API returns it; values are keyed by field objId. */
  type ISidebarRecord = {
    objId: string;
    docId: number;
    sidebarId: string;
    values: Record<string, string | null>;
    versionNo: number;
    createTime: string;
  };
}
