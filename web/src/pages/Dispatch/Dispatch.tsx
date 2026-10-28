import { getFields } from "@/services/fields/field.api";
import { getRecords } from "@/services/records/record.api";
import { getMembers } from "@/services/user/user.api";
import {
  createDispatch,
  getDispatches,
  getDispatchSettings,
  getDispatchSources,
  moveDispatch,
  saveDispatchSettings,
} from "@/services/dispatches/dispatch.api";
import { uploadAttachment } from "@/services/attachments/attachment.api";
import {
  createException,
  getExceptionRules,
} from "@/services/exceptions/exception.api";
import {
  createCheckpoint,
  getCheckpoints,
  updateCheckpointLabel,
} from "@/services/checkpoints/checkpoint.api";
import { useDispatchData, type DispatchApi } from "./useDispatchData";
import { useDispatchDetail, type DispatchDetailApi } from "./useDispatchDetail";
import { DispatchPage } from "./DispatchPage";
import { useSearchParams } from "react-router-dom";

const dispatchApi: DispatchApi = {
  getFields,
  getRecords,
  getMembers,
  getDispatches,
  getDispatchSources,
  getDispatchSettings,
  saveDispatchSettings,
  createDispatch,
};

const detailApi: DispatchDetailApi = {
  getCheckpoints,
  createCheckpoint,
  updateCheckpointLabel,
  uploadAttachment,
  moveDispatch,
  createException,
  getExceptionRules,
};

export default function Dispatch() {
  const data = useDispatchData(dispatchApi);
  // ?dispatch=<id> opens that dispatch, e.g. from an exception's Open timeline
  const [searchParams] = useSearchParams();
  const detail = useDispatchDetail(
    detailApi,
    searchParams.get("dispatch") ?? undefined,
  );
  return <DispatchPage data={data} detail={detail} />;
}
