/** LG-000123 style running number from ds_doc_id. */
export function formatDocNo(docId: number): string {
  return `LG-${String(docId).padStart(6, "0")}`;
}
 
