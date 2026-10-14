import { DEMO_USER, DEMO_USER1 } from "./current.user";

export const memberKeys = {
  all: ["members"] as const,
};

/** People a member field can pick from. Only the demo user until Keycloak is wired up; swap this for the real call then. */
export async function getMembers(): Promise<IUserInfo[]> {
  return [DEMO_USER, DEMO_USER1];
}
