import "server-only";
import { headers } from "next/headers";
import { getToken } from "next-auth/jwt";
import { AuthConfigurationError, getAuthSettings } from "./auth/config";
import { readGitHubClaims, type GitHubSession } from "./auth/claims";

export type { GitHubSession } from "./auth/claims";

/** For server-side GitHub API calls only. Never pass the result to a client. */
export async function getGitHubSession(): Promise<GitHubSession | null> {
  // Read request data even when build-time OAuth settings are absent. Otherwise
  // Cache Components can permanently prerender the anonymous dashboard redirect.
  const incoming = await headers();
  let settings;
  try {
    settings = getAuthSettings();
  } catch (error) {
    if (error instanceof AuthConfigurationError) return null;
    throw error;
  }
  const { secret, clientId, useSecureCookies } = settings;
  // Accept only the session cookie, not arbitrary Authorization header tokens.
  const cookieHeaders = new Headers({ cookie: incoming.get("cookie") ?? "" });
  const token = await getToken({ req: { headers: cookieHeaders }, secret, secureCookie: useSecureCookies });
  return readGitHubClaims(token, clientId);
}
