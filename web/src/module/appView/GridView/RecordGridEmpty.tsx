import { memo } from "react";
import { ModuleAddNewButton } from "@moduleleague/ui";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import type { ModuleAppEmptyState } from "../moduleAppView.types";

export const RecordGridEmpty = memo(function RecordGridEmpty({
  title = "No records yet",
  description = "Records you create will show up here.",
  actionLabel,
  onAction,
}: ModuleAppEmptyState) {
  return (
    <Empty className="relative isolate h-full overflow-hidden py-10">
      {/* On its own layer, so the dots fade at the edges without fading the text */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-dots" />
      <EmptyHeader>
        <EmptyTitle className="text-xl font-semibold text-balance">
          {title}
        </EmptyTitle>
        <EmptyDescription className="text-pretty">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {onAction && (
        <EmptyContent>
          <ModuleAddNewButton label={actionLabel} onClick={onAction} />
        </EmptyContent>
      )}
    </Empty>
  );
});
