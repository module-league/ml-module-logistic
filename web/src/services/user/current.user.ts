const DEMO_USER: IUserInfo = {
  id: "",
  displayName: "Demo User",
  userRole: "Logistic admin",
  createdTime: "",
  email: "demoUser@email.com",
};

/** Placeholder until Keycloak login is added; then this reads the token. */
export function useCurrentUser(): IUserInfo {
  return DEMO_USER;
}
