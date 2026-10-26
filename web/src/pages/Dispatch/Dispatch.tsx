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
  createCheckpoint,
  getCheckpoints,
  updateCheckpointLabel,
} from "@/services/checkpoints/checkpoint.api";
import { useDispatchData, type DispatchApi } from "./useDispatchData";
import { useDispatchDetail, type DispatchDetailApi } from "./useDispatchDetail";
import DispatchPage from "./DispatchPage";

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
};

export default function Dispatch() {
  const data = useDispatchData(dispatchApi);
  const detail = useDispatchDetail(detailApi);
  return <DispatchPage data={data} detail={detail} />;
}
