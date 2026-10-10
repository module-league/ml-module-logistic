export interface CurrentUser {
  name: string;
  role: string;
  initials: string;
}
 
/** Placeholder until Keycloak login is added; then this reads the token. */
export function useCurrentUser(): CurrentUser {
  return { name: "Demo User", role: "Logistic admin", initials: "DU" };
}
