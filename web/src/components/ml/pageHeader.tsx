import { useMemo } from "react";
import { UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/custom/UserAvatar";
import type { PageHeaderProps, PeopleStackProps } from "./pageHeader.types";

/**
 * Standard header at the top of every module page.
 * @example
 * <PageHeader title="Job Orders" actions={<Button>New</Button>} />
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  headerClassName,
  actionClassName,
  hidePageSeparator = false,
  people,
  maxPeople = 4,
  onInvitePeople,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 p-4 flex-col",
        !hidePageSeparator && "border-b",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-row items-center justify-between w-full",
          headerClassName,
        )}
      >
        <div className="flex flex-col w-full">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {(people?.length || onInvitePeople) && (
          <div className="flex items-center gap-3">
            {people?.length ? (
              <PeopleStack people={people} max={maxPeople} />
            ) : null}
            {onInvitePeople && (
              <Button variant="outline" size="xs" onClick={onInvitePeople}>
                <UserPlus size={13} />
                Invite
              </Button>
            )}
          </div>
        )}
      </div>

      {actions && (
        <div className={cn("flex items-center gap-2 w-full", actionClassName)}>
          {actions}
        </div>
      )}
    </div>
  );
}

function PeopleStack({ people, max }: PeopleStackProps) {
  const visible = useMemo(() => people?.slice(0, max), [people, max]);
  const hidden = useMemo(() => people?.slice(max), [people, max]);

  return (
    <AvatarGroup>
      {visible?.map((person) => (
        <UserAvatar
          key={person?.id}
          userInfo={person}
          title={person?.displayName}
          avatarClassName="size-6"
        />
      ))}
      {hidden?.length > 0 && (
        <AvatarGroupCount
          className="size-6"
          title={hidden?.map((person) => person?.displayName).join(", ")}
        >
          +{hidden.length}
        </AvatarGroupCount>
      )}
    </AvatarGroup>
  );
}
