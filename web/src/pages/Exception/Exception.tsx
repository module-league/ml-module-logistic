import { getFields } from "@/services/fields/field.api";
import { getRecords, updateRecord } from "@/services/records/record.api";
import {
  getDispatches,
  getDispatchSettings,
  getDispatchSources,
  planDispatch,
} from "@/services/dispatches/dispatch.api";
import {
  addExceptionActivity,
  assignException,
  createException,
  evaluateExceptions,
  getExceptionActivity,
  getExceptionRules,
  getExceptions,
  getExceptionSettings,
  resolveException,
  saveExceptionSettings,
  snoozeException,
  wakeException,
} from "@/services/exceptions/exception.api";
import { useExceptionData, type ExceptionApi } from "./useExceptionData";
import { ExceptionPage } from "./ExceptionPage";

const exceptionApi: ExceptionApi = {
  getFields,
  getRecords,
  getDispatches,
  getDispatchSources,
  getDispatchSettings,
  getExceptions,
  getExceptionRules,
  getExceptionSettings,
  saveExceptionSettings,
  evaluateExceptions,
  createException,
  getExceptionActivity,
  addExceptionActivity,
  assignException,
  snoozeException,
  wakeException,
  resolveException,
  planDispatch,
  updateRecord,
};

export default function Exception() {
  const data = useExceptionData(exceptionApi);
  return (
    <ExceptionPage
      data={data}
      getActivity={exceptionApi.getExceptionActivity}
    />
  );
}
