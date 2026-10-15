import { HouseCogIcon, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeaderSettings } from "./pageHeaderSettings";
import type { PageHeaderProps } from "./pageHeader.types";

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
  onInvitePeople,
  onOpenForms,
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
          "flex flex-row items-center justify-between gap-2 w-full",
          headerClassName,
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-row gap-4 items-center">
            <h1 className="text-2xl font-semibold tracking-tight truncate">
              {title}
            </h1>

            <PageHeaderSettings title={title} />
          </div>

          {description && (
            <p className="mt-1 text-sm text-muted-foreground truncate">
              {description}
            </p>
          )}
        </div>

        {onOpenForms && (
          <Button
            variant="secondary"
            size="xs"
            startIcon={<HouseCogIcon size={13} />}
            onClick={onOpenForms}
          >
            Create {title} Form
          </Button>
        )}
        {(people?.length || onInvitePeople) && (
          <div className="flex shrink-0 items-center gap-3">
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
