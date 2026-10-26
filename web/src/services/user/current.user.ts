/** Stand-in until Keycloak login is added; its id is a Guid like a Keycloak "sub". */
export const DEMO_USER: IUserInfo = {
  id: "00000000-0000-0000-0000-000000000001",
  displayName: "Demo User",
  userRole: "Logistic admin",
  createdTime: "",
  email: "demoUser@email.com",
};

export const DEMO_USER1: IUserInfo = {
  id: "00000000-0000-0000-0000-000000000002",
  displayName: "Demo User1",
  userRole: "Logistic admin1",
  createdTime: "",
  email: "demoUser1@email.com",
};

/** Placeholder until Keycloak login is added; then this reads the token. */
export function useCurrentUser(): IUserInfo {
  return DEMO_USER;
}

/** Who did something the API logged: "system" without an actor, else the member's name; "Team member" until sign-in is wired up. */
export const actorName = (members: IUserInfo[], actorId?: string) =>
  !actorId
    ? "system"
    : (members.find((member) => member?.id === actorId)?.displayName ??
      "Team member");
