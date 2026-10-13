import { useCallback, useMemo, useState } from "react";
import {
  toast,
  type PageToolbarFilterValue,
  type PageToolbarInputOption,
} from "@moduleleague/ui";
import { ModulePage } from "@/module/page/ModulePage";
import { useSampleLogistics } from "@/services/logistic/logistic.sample";
import {
  LOGISTIC_STATUSES,
  STATUS_LABELS,
  type Logistic,
} from "@/services/logistic/logistic.types";
import { formatDocNo } from "@/lib/formatDocNo";
import {
  getLogisticKey,
  LogisticCard,
  useLogisticColumns,
} from "./logisticView";

export default function LogisticList() {
  const logistics = useSampleLogistics();
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
      {
        key: "origin",
        label: "Origin",
        options: [...new Set(logistics?.map((l) => l?.origin))]
          .sort()
          .map((origin) => ({ value: origin, label: origin })),
      },
    ],
    [logistics],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logistics.filter((l) => {
      if (filter?.status?.length && !filter.status.includes(l?.status))
        return false;
      if (filter?.origin?.length && !filter.origin.includes(l?.origin))
        return false;
      if (!term) return true;
      return [l.trackingNo, l.origin, l.destination, formatDocNo(l.docId)].some(
        (v) => v.toLowerCase().includes(term),
      );
    });
  }, [logistics, search, filter]);

  // Create/edit dialogs arrive with the API step
  const notYet = useCallback(
    () => toast.info("Create and edit come with the API step."),
    [],
  );
  const columns = useLogisticColumns(notYet);
  const deleteRecords = useCallback(
    (keys: string[]) =>
      toast.info(
        `Deleting ${keys.length} ${keys.length === 1 ? "record" : "records"} comes with the API step.`,
      ),
    [],
  );

  const toolbar = useMemo(
    () => ({
      onAdd: notYet,
      addLabel: "New record",
      inputOptions,
      filterValue: filter,
      onFilterChange: setFilter,
      onExport: notYet,
      onDelete: deleteRecords,
      search,
      onSearchChange: setSearch,
      searchPlaceholder: "Tracking no., origin, destination",
    }),
    [notYet, deleteRecords, inputOptions, filter, search],
  );

  const renderCard = useCallback(
    (logistic: Logistic) => (
      <LogisticCard logistic={logistic} onEdit={notYet} />
    ),
    [notYet],
  );

  return (
    <ModulePage
      toolbar={toolbar}
      appView={{
        records: filtered,
        getKey: getLogisticKey,
        columns,
        renderCard,
        empty: logistics?.length
          ? {
              title: "No matching records",
              description: "Try another search or clear the filters.",
            }
          : { actionLabel: "New record", onAction: notYet },
      }}
    />
  );
}
