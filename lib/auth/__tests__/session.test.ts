// @vitest-environment node

import { headers } from "next/headers";
import { encode, type JWT } from "next-auth/jwt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGitHubSession } from "@/lib/auth";
import { authEnvironment, claims, secret } from "./fixtures";

vi.mock("next/headers", () => ({ headers: vi.fn() }));

beforeEach(() => {
  for (const [key, value] of Object.entries(authEnvironment())) vi.stubEnv(key, value);
  vi.mocked(headers).mockReset().mockResolvedValue(new Headers());
});
afterEach(() => vi.unstubAllEnvs());

async function sessionCookie(token: JWT = claims, secure = false, maxAge = 3600) {
  const name = `${secure ? "__Secure-" : ""}authjs.session-token`;
  const value = await encode({ token, secret, salt: name, maxAge });
  return { name, value, cookie: `${name}=${value}` };
}

describe("server-only GitHub session", () => {
  it.each([false, true])("reads and verifies encrypted cookies (HTTPS: %s)", async (secure) => {
    vi.stubEnv("NEXTAUTH_URL", secure ? "https://repodoc.example.test" : "http://localhost:3000");
    vi.mocked(headers).mockResolvedValue(new Headers({ cookie: (await sessionCookie(claims, secure)).cookie }));
    expect(await getGitHubSession()).toEqual({
      userId: "db-user-id", githubId: "123", username: "octocat", accessToken: claims.accessToken,
    });
  });

  it("supports NextAuth's chunked session cookies", async () => {
    const { name, value } = await sessionCookie({ ...claims, padding: "x".repeat(5000) });
    const cookie = `${name}.1=${value.slice(3000)}; ${name}.0=${value.slice(0, 3000)}`;
    vi.mocked(headers).mockResolvedValue(new Headers({ cookie }));
    expect((await getGitHubSession())?.accessToken).toBe(claims.accessToken);
  });

  it("returns null without cookies and ignores bearer credentials", async () => {
    expect(await getGitHubSession()).toBeNull();
    vi.mocked(headers).mockResolvedValue(new Headers({ authorization: `Bearer ${(await sessionCookie()).value}` }));
    expect(await getGitHubSession()).toBeNull();
  });

  it("rejects tampered, expired, and wrongly encrypted cookies", async () => {
    const { name, value } = await sessionCookie();
    for (const cookie of [`${name}=invalid`, `${name}=${value.slice(0, -20)}tampered`, (await sessionCookie(claims, false, -60)).cookie]) {
      vi.mocked(headers).mockResolvedValue(new Headers({ cookie }));
      expect(await getGitHubSession()).toBeNull();
    }
    vi.mocked(headers).mockResolvedValue(new Headers({ cookie: `${name}=${value}` }));
    vi.stubEnv("NEXTAUTH_SECRET", "a-different-secret");
    expect(await getGitHubSession()).toBeNull();
  });

  it.each([
    {}, { ...claims, username: "" }, { ...claims, accessToken: "" },
    { ...claims, accessTokenExpiresAt: 1 }, { ...claims, accessTokenExpiresAt: NaN },
  ])("rejects incomplete or expired provider claims", async (token) => {
    vi.mocked(headers).mockResolvedValue(new Headers({ cookie: (await sessionCookie(token)).cookie }));
    expect(await getGitHubSession()).toBeNull();
  });

  it("returns null gracefully when auth is not configured in the environment", async () => {
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    expect(await getGitHubSession()).toBeNull();
  });
});
