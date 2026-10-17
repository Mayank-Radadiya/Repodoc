import "server-only";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { prisma } from "@/lib/db";
import { readGitHubClaims } from "./claims";

type Callbacks = NonNullable<NextAuthConfig["callbacks"]>;
// NextAuth's generic Profile models `id` as a string; GitHub returns a number.
type JwtParams = Omit<Parameters<NonNullable<Callbacks["jwt"]>>[0], "profile"> & { profile?: unknown };

function isGitHubProfile(value: unknown): value is { id: number; login: string; avatar_url?: string | null } {
  return typeof value === "object" && value !== null &&
    "id" in value && typeof value.id === "number" && Number.isSafeInteger(value.id) && value.id > 0 &&
    "login" in value && typeof value.login === "string" && value.login.trim().length > 0 &&
    (!("avatar_url" in value) || value.avatar_url == null || typeof value.avatar_url === "string");
}

export const authCallbacks = {
  async jwt({ token, account, profile }: JwtParams) {
    // account/profile are supplied by the provider only on a fresh sign-in.
    // In particular, never merge the client-supplied `session` update into claims.
    if (account) {
      if (
        account.provider !== "github" ||
        account.type !== "oauth" ||
        !isGitHubProfile(profile) ||
        account.providerAccountId !== String(profile.id) ||
        typeof account.access_token !== "string" || !account.access_token.trim() ||
        (account.expires_at !== undefined &&
          (!Number.isFinite(account.expires_at) || account.expires_at <= Date.now() / 1000))
      ) throw new Error("Invalid GitHub sign-in response.");

      const githubId = String(profile.id);
      const data = { username: profile.login, avatarUrl: profile.avatar_url ?? null };
      const user = await prisma.user.upsert({
        where: { githubId },
        create: { githubId, ...data },
        update: data,
      });

      token.sub = user.id;
      token.userId = user.id;
      token.githubId = githubId;
      token.username = user.username;
      token.picture = user.avatarUrl;
      token.accessToken = account.access_token;
      token.accessTokenExpiresAt = account.expires_at;
    }

    // Invalid or expired credentials also invalidate the public login session.
    return readGitHubClaims(token) ? token : null;
  },
  session({ session, token }: { session: DefaultSession; token: JWT }) {
    const identity = readGitHubClaims(token);
    if (!identity) throw new Error("Invalid GitHub session.");
    // Explicit allowlist: even future JWT fields must never leak to the browser.
    return {
      expires: session.expires,
      user: {
        id: identity.userId,
        githubId: identity.githubId,
        username: identity.username,
        name: token.name,
        email: token.email,
        image: token.picture,
      },
    };
  },
} satisfies NonNullable<NextAuthConfig["callbacks"]>;
