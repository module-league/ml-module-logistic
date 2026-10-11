import type { AvatarProps } from "@radix-ui/react-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { User2Icon } from "lucide-react";

type UserAvatarProps = {
  email?: string;
  userInfo?: Partial<IUserInfo>;
  avatarClassName?: string;
} & AvatarProps;
export function UserAvatar(props: UserAvatarProps) {
  const { email, userInfo, avatarClassName, ...others } = props;
  const _displayName = userInfo?.displayName ?? email ?? "";

  return (
    <Avatar className={avatarClassName} {...others}>
      <AvatarImage src={userInfo?.avatarURI} alt="User avatar" />
      {!!_displayName ? (
        <AvatarFallback
          style={{
            textTransform: "uppercase",
            backgroundColor: colorFromString(_displayName),
            color: "inherit",
          }}
        >
          {_displayName.at(0)}
        </AvatarFallback>
      ) : (
        <AvatarFallback className="text-secondary">
          <User2Icon size={18} />
        </AvatarFallback>
      )}
    </Avatar>
  );
}

const colorCodes = [
  "#e6f4ff",
  "#fff1f0",
  "#f9f0ff",
  "#fff0f6",
  "#cff5d1",
  "#E1F7F5",
  "#FEFDED",
  "#FEECE2",
  "#F1FADA",
];
function colorFromString(str: string) {
  const hashNum = Math.abs(hashString(str));
  const colorChoice = hashNum % colorCodes.length;
  return colorCodes[colorChoice];

  function hashString(str: string) {
    if (!str) return 0;
    return str.split("").reduce(function (a, b) {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
  }
}
