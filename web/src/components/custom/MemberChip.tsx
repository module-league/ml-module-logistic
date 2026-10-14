import { memo } from "react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";
import type { MemberChipProps } from "./RecordMemberInput.types";

export const MemberChip = memo(function MemberChip({
  member,
  className,
}: MemberChipProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1 rounded-full bg-muted py-0.5 pr-2 pl-0.5 text-xs",
        className,
      )}
      title={member?.email}
    >
      <UserAvatar userInfo={member} className="size-4 shrink-0 text-[0.6rem]" />
      <span className="truncate">{member?.displayName ?? "Unknown user"}</span>
    </span>
  );
});
