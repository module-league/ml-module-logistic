import { getFields } from "@/services/fields/field.api";
import { getRecords } from "@/services/records/record.api";
import { getMembers } from "@/services/user/user.api";
import {
  createDispatch,
  getDispatchSources,
} from "@/services/dispatches/dispatch.api";
import { useDispatchJob, type DispatchJobApi } from "./useDispatchJob";
import DispatchPage from "./DispatchPage";

const dispatchApi: DispatchJobApi = {
  getFields,
  getRecords,
  getMembers,
  getDispatchSources,
  createDispatch,
};

export default function Dispatch() {
  const job = useDispatchJob(dispatchApi);
  return <DispatchPage job={job} />;
}
