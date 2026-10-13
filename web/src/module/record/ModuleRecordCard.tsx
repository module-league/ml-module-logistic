import { memo, useMemo } from "react";
import { formatDocNo } from "@/lib/formatDocNo";
import { dateToFriendlyLongString } from "@/lib/dateHelper";
import { RecordValueNode } from "../../components/custom/RecordValueNode";
import { primaryFieldOf } from "./moduleRecord.utils";
import type { ModuleRecordCardProps } from "./moduleRecord.types";

const CARD_FIELD_LIMIT = 4;

export const ModuleRecordCard = memo(function ModuleRecordCard({
  record,
  fields,
}: ModuleRecordCardProps) {
  const primary = useMemo(() => primaryFieldOf(fields), [fields]);
  const details = useMemo(
    () =>
      fields
        ?.filter((field) => field?.objId !== primary?.objId)
        .slice(0, CARD_FIELD_LIMIT) ?? [],
    [fields, primary],
  );

  return (
    <div className="flex h-full flex-col gap-3 rounded-lg border bg-background p-4">
      <div className="flex flex-col">
        <span className="truncate font-medium">
          {primary ? (
            <RecordValueNode
              field={primary}
              value={record?.values?.[primary.objId]}
            />
          ) : (
            formatDocNo(record?.docId)
          )}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {formatDocNo(record?.docId)}
        </span>
      </div>
      {details.length > 0 && (
        <dl className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-3 gap-y-1.5 text-xs">
          {details.map((field) => (
            <div key={field.objId} className="contents">
              <dt className="truncate text-muted-foreground">{field.name}</dt>
              <dd className="min-w-0 truncate">
                <RecordValueNode
                  field={field}
                  value={record?.values?.[field.objId]}
                />
              </dd>
            </div>
          ))}
        </dl>
      )}
      <span className="mt-auto text-xs text-muted-foreground">
        {dateToFriendlyLongString(record?.createTime)}
      </span>
    </div>
  );
});
