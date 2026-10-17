import "server-only";
import type { JWT } from "next-auth/jwt";

export interface GitHubSession {
  userId: string;
  githubId: string;
  username: string;
  accessToken: string;
}

/** Only verified JWT claims belong here, never client-provided session updates. */
export function readGitHubClaims(token: JWT | null): GitHubSession | null {
  if (
    !token ||
    !nonempty(token.userId) ||
    !nonempty(token.githubId) ||
    !nonempty(token.username) ||
    !nonempty(token.accessToken) ||
    (token.exp !== undefined && (!Number.isFinite(token.exp) || token.exp <= Date.now() / 1000)) ||
    (token.accessTokenExpiresAt !== undefined &&
      (!Number.isFinite(token.accessTokenExpiresAt) || token.accessTokenExpiresAt <= Date.now() / 1000))
  ) return null;

  return {
    userId: token.userId,
    githubId: token.githubId,
    username: token.username,
    accessToken: token.accessToken,
  };
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
