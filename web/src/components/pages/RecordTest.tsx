import { useCallback, useMemo, useState } from "react";
import {
  toast,
  type PageToolbarFilterValue,
  type PageToolbarInputOption,
} from "@moduleleague/ui";
import { ModulePage } from "@/components/app/ModulePage";
import {
  LOGISTIC_STATUSES,
  STATUS_LABELS,
  type Logistic,
} from "@/services/types";
import {
  getLogisticKey,
  LogisticCard,
  useLogisticColumns,
} from "@/components/logistic/logisticView";

const RECORDS: Logistic[] = [];

export default function RecordTest() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PageToolbarFilterValue>({});

  const inputOptions = useMemo<PageToolbarInputOption[]>(
    () => [
      {
        key: "status",
        label: "Status",
        options: LOGISTIC_STATUSES.map((status) => ({
          value: status,
          label: STATUS_LABELS[status],
        })),
      },
    ],
    [],
  );

  const notYet = useCallback(
    () => toast.info("Create and edit come with the API step."),
    [],
  );
  const columns = useLogisticColumns(notYet);

  const toolbar = useMemo(
    () => ({
      onAdd: notYet,
      addLabel: "New record",
      inputOptions,
      filterValue: filter,
      onFilterChange: setFilter,
      onExport: notYet,
      search,
      onSearchChange: setSearch,
      searchPlaceholder: "Tracking no., origin, destination",
    }),
    [notYet, inputOptions, filter, search],
  );

  const renderCard = useCallback(
    (logistic: Logistic) => <LogisticCard logistic={logistic} onEdit={notYet} />,
    [notYet],
  );

  return (
    <ModulePage
      toolbar={toolbar}
      appView={{
        records: RECORDS,
        getKey: getLogisticKey,
        columns,
        renderCard,
        empty: { actionLabel: "New record", onAction: notYet },
      }}
    />
  );
}
