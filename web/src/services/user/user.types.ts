declare global {
  type IUserInfo = {
    id: string;
    displayName: string;
    /** ISO8601 format date string */
    createdTime: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    requireSetup?: boolean;
    avatarURI?: string;
    userRole?: string;
  };
}
