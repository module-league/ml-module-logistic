
/** Placeholder until Keycloak login is added; then this reads the token. */
export function useCurrentUser(): IUserInfo {
  return {
  displayName: "Demo User", userRole: "Logistic admin",
  id: "",
  createdTime: "",
  email: "demoUser@email.com"
};
}
