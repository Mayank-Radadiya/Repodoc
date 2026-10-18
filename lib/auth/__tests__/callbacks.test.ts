// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthCallbacks } from "../callbacks";
import { account, claims, jwtParams, oauthClientId, profile } from "./fixtures";

const authCallbacks = createAuthCallbacks(oauthClientId);

const { upsert } = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { user: { upsert } } }));

beforeEach(() => {
  upsert.mockReset().mockResolvedValue({
    id: "db-user-id", githubId: "123", username: "octocat", avatarUrl: profile.avatar_url,
  });
});
afterEach(() => vi.restoreAllMocks());

describe("GitHub authentication callbacks", () => {
  it("upserts by provider ID and stores the database identity and credential in the JWT", async () => {
    const result = await authCallbacks.jwt(jwtParams({ token: { name: "The Octocat" } }));
    expect(upsert).toHaveBeenCalledExactlyOnceWith({
      where: { githubId: "123" },
      create: { githubId: "123", username: "octocat", avatarUrl: profile.avatar_url },
      update: { username: "octocat", avatarUrl: profile.avatar_url },
    });
    expect(result).toMatchObject({
      sub: "db-user-id", userId: "db-user-id", githubId: "123", username: "octocat",
      accessToken: account.access_token, picture: profile.avatar_url,
      oauthClientId,
    });
  });

  it("supports a missing avatar and private email", async () => {
    upsert.mockResolvedValueOnce({ id: "db-user-id", username: "octocat", avatarUrl: null });
    const result = await authCallbacks.jwt(jwtParams({ profile: { ...profile, avatar_url: null, email: null } }));
    expect(result).toMatchObject({ picture: null, username: "octocat" });
    expect(upsert.mock.calls[0][0].update).toEqual({ username: "octocat", avatarUrl: null });
  });

  it.each([
    { account: { ...account, provider: "other" } },
    { account: { ...account, type: "oidc" as const } },
    { account: { ...account, providerAccountId: "999" } },
    { account: { ...account, access_token: undefined } },
    { account: { ...account, access_token: " " } },
    { account: { ...account, access_token: "ghu_wrong_app_token" } },
    { account: { ...account, access_token: "ghs_installation_token" } },
    { profile: undefined },
    { profile: { ...profile, id: "123" } },
    { profile: { ...profile, id: 0 } },
    { profile: { ...profile, id: 1.5 } },
    { profile: { ...profile, id: Number.MAX_SAFE_INTEGER + 1 } },
    { profile: { ...profile, login: " " } },
    { profile: { ...profile, login: null } },
    { profile: { ...profile, avatar_url: {} } },
    { account: { ...account, expires_at: 1 } },
    { account: { ...account, expires_at: NaN } },
  ])("rejects invalid provider data before writing: %j", async (overrides) => {
    await expect(authCallbacks.jwt(jwtParams(overrides))).rejects.toThrow("Invalid GitHub sign-in response.");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("does not issue a token if persistence fails", async () => {
    upsert.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(authCallbacks.jwt(jwtParams())).rejects.toThrow("Database unavailable");
  });

  it("preserves server claims on reads and ignores client attempts to overwrite identity or credentials", async () => {
    const token = { ...claims };
    expect(await authCallbacks.jwt(jwtParams({ token, account: null, profile: undefined, trigger: undefined }))).toBe(token);
    expect(await authCallbacks.jwt(jwtParams({
      token, account: null, profile: undefined, trigger: "update",
      session: { userId: "attacker", accessToken: "attacker", accessTokenExpiresAt: Infinity, oauthClientId: "attacker" },
    }))).toEqual(claims);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("keeps provider expiry across reads and clears it on a new non-expiring sign-in", async () => {
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const token = await authCallbacks.jwt(jwtParams({ account: { ...account, expires_at: expiry } }));
    expect(token?.accessTokenExpiresAt).toBe(expiry);
    expect(await authCallbacks.jwt(jwtParams({ token: token!, account: null, trigger: undefined }))).toEqual(token);
    expect((await authCallbacks.jwt(jwtParams({ token: token! })))?.accessTokenExpiresAt).toBeUndefined();
  });

  it.each([
    {}, { ...claims, userId: "" }, { ...claims, accessToken: " " },
    { ...claims, oauthClientId: undefined }, { ...claims, oauthClientId: "another-client" },
    { ...claims, accessToken: "ghu_old_session_token" },
    { ...claims, accessTokenExpiresAt: 1 }, { ...claims, accessTokenExpiresAt: NaN },
    { ...claims, exp: 1 },
  ])("invalidates incomplete or expired claims: %j", async (token) => {
    expect(await authCallbacks.jwt(jwtParams({ token, account: null, trigger: undefined }))).toBeNull();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("allowlists public session fields, even if more credentials appear in the JWT", () => {
    const incomingSession = { expires: "2030-01-01T00:00:00Z", user: { ...claims, id: "db-user-id", githubId: "123", username: "octocat" } };
    const result = authCallbacks.session({
      session: incomingSession,
      token: { ...claims, refresh_token: "private-refresh-token", clientSecret: "private-client-secret" },
    });
    expect(result).toEqual({
      expires: "2030-01-01T00:00:00Z",
      user: { id: "db-user-id", githubId: "123", username: "octocat", name: claims.name, email: claims.email, image: claims.picture },
    });
    expect(JSON.stringify(result)).not.toContain("Token");
    expect(JSON.stringify(result)).not.toContain("private-");
    expect(result).not.toHaveProperty("oauthClientId");
    expect(result.user).not.toHaveProperty("oauthClientId");
  });
});
