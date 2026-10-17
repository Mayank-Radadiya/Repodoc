import type { Account } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { authCallbacks } from "../callbacks";

export const secret = "test-secret-for-authentication-only-0123456789";
export const accessToken = "gho_test_access_token";
export const profile = {
  id: 123,
  login: "octocat",
  name: "The Octocat",
  email: "octocat@example.test",
  avatar_url: "https://avatars.githubusercontent.com/u/123",
};
export const account: Account = {
  provider: "github",
  type: "oauth",
  providerAccountId: "123",
  access_token: accessToken,
};
export const claims: JWT = {
  sub: "db-user-id",
  userId: "db-user-id",
  githubId: "123",
  username: "octocat",
  name: "The Octocat",
  email: "octocat@example.test",
  picture: "https://avatars.githubusercontent.com/u/123",
  accessToken,
};

export function jwtParams(overrides: Partial<Parameters<typeof authCallbacks.jwt>[0]> = {}) {
  return {
    token: {},
    user: { id: "provider-user" },
    account: { ...account },
    profile: { ...profile },
    trigger: "signIn" as const,
    ...overrides,
  };
}

export function authEnvironment(origin = "http://localhost:3000") {
  return {
    NEXTAUTH_SECRET: secret,
    NEXTAUTH_URL: origin,
    GITHUB_CLIENT_ID: "test-client-id",
    GITHUB_CLIENT_SECRET: "test-client-secret",
    // Prevent developer-specific Auth.js settings from changing test behavior.
    AUTH_URL: undefined,
    AUTH_SECRET: undefined,
    AUTH_REDIRECT_PROXY_URL: undefined,
  };
}
