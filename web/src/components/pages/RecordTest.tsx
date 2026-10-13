import { useCallback, useMemo, useState } from "react";
import { toast } from "@moduleleague/ui";
import { ModulePage } from "@/components/app/ModulePage";
import { useCurrentNavItem } from "@/context/navItem.context";
import {
  toFieldCreate,
  useCreateField,
  useFields,
} from "@/services/fields/field.api";

const RECORDS: { objId: string }[] = [];
const getRecordKey = (record: { objId: string }) => record.objId;

export default function RecordTest() {
  const sidebarId = useCurrentNavItem()?.sidebarId;
  const { data: fields } = useFields(sidebarId);
  const { mutateAsync: createField } = useCreateField(sidebarId);
  const addField = useCallback(
    (field: IField) => createField(toFieldCreate(field)),
    [createField],
  );
  const [search, setSearch] = useState("");

  const notYet = useCallback(
    () => toast.info("Creating records comes with the records API."),
    [],
  );
  const deleteRecords = useCallback(
    (keys: string[]) =>
      toast.info(
        `Deleting ${keys.length} ${keys.length === 1 ? "record" : "records"} comes with the records API.`,
      ),
    [],
  );

  const toolbar = useMemo(
    () => ({
      onAdd: notYet,
      addLabel: "New record",
      onDelete: deleteRecords,
      onAddField: addField,
      search,
      onSearchChange: setSearch,
      searchPlaceholder: "Search records",
    }),
    [notYet, deleteRecords, addField, search],
  );

  return (
    <ModulePage
      toolbar={toolbar}
      fields={fields}
      appView={{
        records: RECORDS,
        getKey: getRecordKey,
        columns: [],
        empty: { actionLabel: "New record", onAction: notYet },
      }}
    />
  );
}
