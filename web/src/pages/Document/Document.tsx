import { useSearchParams } from "react-router-dom";
import { getFields } from "@/services/fields/field.api";
import { getRecords, updateRecord } from "@/services/records/record.api";
import { getMembers } from "@/services/user/user.api";
import { uploadAttachment } from "@/services/attachments/attachment.api";
import {
  getDispatches,
  getDispatchSettings,
  getDispatchSources,
} from "@/services/dispatches/dispatch.api";
import {
  fileDocument,
  generateDocument,
  getDocumentActivity,
  getDocumentRules,
  getDocuments,
  getDocumentSettings,
  rejectDocument,
  saveDocumentSettings,
  verifyDocument,
} from "@/services/documents/document.api";
import { useDocumentData, type DocumentApi } from "./useDocumentData";
import DocumentPage from "./DocumentPage";

const documentApi: DocumentApi = {
  getFields,
  getRecords,
  getMembers,
  getDispatches,
  getDispatchSources,
  getDispatchSettings,
  getDocuments,
  getDocumentRules,
  getDocumentSettings,
  saveDocumentSettings,
  fileDocument,
  generateDocument,
  verifyDocument,
  rejectDocument,
  getDocumentActivity,
  uploadAttachment,
  updateRecord,
};

export default function Document() {
  const [searchParams] = useSearchParams();
  const data = useDocumentData(
    documentApi,
    searchParams.get("shipment") ?? undefined,
  );
  return (
    <DocumentPage data={data} getActivity={documentApi.getDocumentActivity} />
  );
}
