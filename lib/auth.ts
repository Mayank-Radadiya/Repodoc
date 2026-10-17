import "server-only";
import { headers } from "next/headers";
import { getToken } from "next-auth/jwt";
import { AuthConfigurationError, getAuthSettings } from "./auth/config";
import { readGitHubClaims, type GitHubSession } from "./auth/claims";

export type { GitHubSession } from "./auth/claims";

/** For server-side GitHub API calls only. Never pass the result to a client. */
export async function getGitHubSession(): Promise<GitHubSession | null> {
  let settings;
  try {
    settings = getAuthSettings();
  } catch (error) {
    if (error instanceof AuthConfigurationError) return null;
    throw error;
  }
  const { secret, useSecureCookies } = settings;
  const incoming = await headers();
  // Accept only the session cookie, not arbitrary Authorization header tokens.
  const cookieHeaders = new Headers({ cookie: incoming.get("cookie") ?? "" });
  const token = await getToken({ req: { headers: cookieHeaders }, secret, secureCookie: useSecureCookies });
  return readGitHubClaims(token);
}
