import { Bell, ChevronDown, LogOut } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@moduleleague/ui";
import { UserAvatar } from "@/components/custom/UserAvatar";
import { useCurrentUser } from "../../services/current.user";

/** Right side of the top bar: notifications, then the signed-in user. */
export function TopBarActions() {
  const user = useCurrentUser();

  return (
    <div className="bg-transparent p-1 pb-2 ml-auto flex items-center gap-1 bg-sidebar justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="xs"
            aria-label="Notifications"
            title="Notifications"
            className="text-black"
          >
            <Bell size={11} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            You're all caught up.
          </p>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="text-black gap-2 px-1.5 focus-visible:ring-0 focus-visible:border-ring-0 data-[state=open]:bg-gray-10"
            aria-label="Account"
          >
            <UserAvatar userInfo={user} />
            <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2 font-normal">
            <UserAvatar userInfo={user} className="size-7" />
            <span className="grid min-w-0 leading-tight">
              <span className="truncate text-xs font-medium">
                {user.displayName}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
