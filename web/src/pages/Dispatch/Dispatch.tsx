import { getFields } from "@/services/fields/field.api";
import { getRecords } from "@/services/records/record.api";
import { getMembers } from "@/services/user/user.api";
import {
  createDispatch,
  getDispatches,
  getDispatchSettings,
  getDispatchSources,
  saveDispatchSettings,
} from "@/services/dispatches/dispatch.api";
import { useDispatchData, type DispatchApi } from "./useDispatchData";
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

export default function Dispatch() {
  const data = useDispatchData(dispatchApi);
  return <DispatchPage data={data} />;
}
