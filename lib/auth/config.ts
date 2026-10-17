import "server-only";
import { AuthError, type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import { authCallbacks } from "./callbacks";

export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
export const GITHUB_SCOPES = "read:user user:email public_repo workflow";

export class AuthConfigurationError extends Error {
  constructor() {
    super("GitHub authentication configuration is missing or invalid.");
    this.name = "AuthConfigurationError";
  }
}

/** Request-time validation keeps public routes buildable without OAuth secrets. */
export function getAuthSettings() {
  const secret = (process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim());
  const clientId = (process.env.GITHUB_CLIENT_ID?.trim() || process.env.AUTH_GITHUB_ID?.trim());
  const clientSecret = (process.env.GITHUB_CLIENT_SECRET?.trim() || process.env.AUTH_GITHUB_SECRET?.trim());
  const origin = (process.env.NEXTAUTH_URL?.trim() || process.env.AUTH_URL?.trim());
  if (!secret || !clientId || !clientSecret || !origin) throw new AuthConfigurationError();

  let url: URL;
  try { url = new URL(origin); } catch { throw new AuthConfigurationError(); }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
    (url.protocol === "http:" &&
      (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
  ) throw new AuthConfigurationError();

  return { secret, clientId, clientSecret, useSecureCookies: url.protocol === "https:" };
}

export function getAuthConfig(): NextAuthConfig {
  const { secret, clientId, clientSecret, useSecureCookies } = getAuthSettings();
  return {
    secret,
    basePath: "/api/auth",
    // NEXTAUTH_URL fixes the origin before Auth.js handles the request.
    trustHost: true,
    useSecureCookies,
    session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
    providers: [GitHub({
      clientId,
      clientSecret,
      authorization: { params: { scope: GITHUB_SCOPES } },
      checks: ["pkce", "state"],
    })],
    callbacks: authCallbacks,
    // Auth.js error causes can contain provider payloads. Log error codes only.
    logger: {
      error(error) { console.error("[auth]", error instanceof AuthError ? error.type : "AuthenticationError"); },
    },
  };
}
