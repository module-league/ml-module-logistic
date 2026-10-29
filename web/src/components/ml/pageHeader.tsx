import { HouseCogIcon, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeaderSettings } from "./pageHeaderSettings";
import type { PageHeaderProps } from "./pageHeader.types";

/**
 * Standard header at the top of every module page: the title on the left, every page action in one group on the right.
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
  onInvitePeople,
  onOpenForms,
}: PageHeaderProps) {
  const hasPageActions = !!onOpenForms || !!onInvitePeople;

  return (
    <div
      className={cn(
        "flex h-page-header shrink-0 items-center gap-4 px-4",
        !hidePageSeparator && "border-b",
        className,
      )}
    >
      <div className={cn("flex min-w-0 flex-1 flex-col", headerClassName)}>
        <h1 className="truncate text-xl font-semibold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="truncate text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {/* The header keeps one height, so on a narrow page the title truncates rather than the actions wrapping */}
      <div
        className={cn(
          "ml-auto flex shrink-0 items-center gap-2",
          actionClassName,
        )}
      >
        {actions}
        {!!actions && hasPageActions && (
          <Separator orientation="vertical" className="h-5" />
        )}
        {onInvitePeople && (
          <Button
            variant="outline"
            size="xs"
            startIcon={<UserPlus size={13} />}
            onClick={onInvitePeople}
          >
            Invite
          </Button>
        )}
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
        <PageHeaderSettings title={title} />
      </div>
    </div>
  );
}
