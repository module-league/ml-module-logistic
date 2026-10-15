import type { ReactNode } from "react";

export interface PageHeaderProps {
  /** Main page title, e.g. "Job Orders". */
  title: string;
  /** Optional line shown under the title. */
  description?: string;
  /** Buttons or other actions shown on the right. */
  actions?: ReactNode;
  /** Extra Tailwind classes. They override the defaults. */
  className?: string;
  hidePageSeparator?: boolean;
  headerClassName?: string;
  actionClassName?: string;
  /** People on this page, shown as avatars on the right of the title. */
  people?: IUserInfo[];
  /** @default 6 */
  maxPeople?: number;
  /** Shows an Invite button next to the people. */
  onInvitePeople?: () => void;
  /** Shows the "Create {title} Form" button, which opens the page's forms. */
  onOpenForms?: () => void;
}

export interface PeopleStackProps {
  people: IUserInfo[];
  max: number;
}
