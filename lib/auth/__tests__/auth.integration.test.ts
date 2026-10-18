// @vitest-environment node

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { headers } from "next/headers";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/auth/[...nextauth]/route";
import { getGitHubSession } from "@/lib/auth";
import { GITHUB_SCOPES } from "../config";
import { accessToken, authEnvironment, claims, oauthClientId, profile, secret } from "./fixtures";

const database = vi.hoisted(() => ({ client: undefined as PrismaClient | undefined }));
vi.mock("@/lib/db", () => ({
  get prisma() {
    if (!database.client) throw new Error("Test database is not initialized.");
    return database.client;
  },
}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

const directory = mkdtempSync(path.join(tmpdir(), "repodoc-auth-"));
const databasePath = path.join(directory, "test.db");
writeFileSync(databasePath, "");
const databaseUrl = `file:${databasePath}`;
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const fetchMock = vi.fn<typeof fetch>();
const origin = "http://localhost:3000";
type CookieJar = Map<string, string>;

function cookieHeader(jar: CookieJar) {
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function request(
  pathname: string,
  jar: CookieJar,
  options: { body?: URLSearchParams | string; origin?: string } = {},
) {
  const method = options.body === undefined ? "GET" : "POST";
  const req = new NextRequest(`${options.origin ?? origin}/api/auth${pathname}`, {
    method,
    headers: {
      cookie: cookieHeader(jar),
      ...(method === "POST" ? {
        "content-type": options.body instanceof URLSearchParams ? "application/x-www-form-urlencoded" : "application/json",
      } : {}),
    },
    body: options.body,
  });
  const response = await (method === "POST" ? POST : GET)(req);
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";", 1)[0];
    const index = pair.indexOf("=");
    const name = pair.slice(0, index);
    const value = pair.slice(index + 1);
    if (value) jar.set(name, value); else jar.delete(name);
  }
  return response;
}

async function csrf(jar: CookieJar) {
  return (await (await request("/csrf", jar)).json()).csrfToken as string;
}

async function beginSignIn(jar: CookieJar, callbackUrl = origin) {
  const response = await request("/signin/github", jar, {
    body: new URLSearchParams({ csrfToken: await csrf(jar), callbackUrl }),
  });
  expect(response.status).toBe(302);
  return new URL(response.headers.get("location")!);
}

async function signIn(jar: CookieJar) {
  const authorization = await beginSignIn(jar);
  const params = new URLSearchParams({ code: "test-authorization-code", state: authorization.searchParams.get("state")! });
  return request(`/callback/github?${params}`, jar);
}

beforeAll(() => {
  execFileSync(process.execPath, [
    path.resolve("node_modules/prisma/build/index.js"), "db", "push", "--skip-generate",
    "--schema", path.resolve("prisma/schema.prisma"),
  ], { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: "pipe" });
  database.client = prisma;
}, 30000);

beforeEach(async () => {
  await prisma.repoReport.deleteMany();
  await prisma.user.deleteMany();
  for (const [key, value] of Object.entries(authEnvironment())) vi.stubEnv(key, value);
  vi.mocked(headers).mockReset().mockResolvedValue(new Headers());
  fetchMock.mockReset().mockImplementation(async (input) => {
    const url = String(input);
    if (url === "https://github.com/login/oauth/access_token") {
      return Response.json({ access_token: accessToken, token_type: "bearer", scope: GITHUB_SCOPES });
    }
    if (url === "https://api.github.com/user") return Response.json(profile);
    throw new Error("Unexpected outbound request in OAuth test.");
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

describe("GitHub OAuth handlers with SQLite persistence", () => {
  it("serves the built-in sign-in page and advertises the GitHub provider", async () => {
    const jar: CookieJar = new Map();
    const page = await request("/signin", jar);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("Sign in with GitHub");
    const providers = await (await request("/providers", jar)).json();
    expect(providers.github.callbackUrl).toBe(`${origin}/api/auth/callback/github`);
  });

  it("completes OAuth, persists one user, and reads the session across independent requests", async () => {
    const jar: CookieJar = new Map();
    const response = await signIn(jar);
    expect(response.headers.get("location")).toBe(origin);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const user = await prisma.user.findUniqueOrThrow({ where: { githubId: "123" } });
    expect(user).toMatchObject({ username: "octocat", avatarUrl: profile.avatar_url });
    const cookie = response.headers.getSetCookie().find((value) => value.startsWith("authjs.session-token="));
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain(accessToken);

    fetchMock.mockClear();
    const writes = vi.spyOn(prisma.user, "upsert");
    for (let index = 0; index < 2; index++) {
      const sessionResponse = await request("/session", new Map(jar));
      expect(sessionResponse.headers.get("cache-control")).toContain("no-store");
      const session = await sessionResponse.json();
      expect(session.user).toEqual({
        id: user.id, githubId: "123", username: "octocat", name: profile.name, email: profile.email, image: profile.avatar_url,
      });
      expect(new Date(session.expires).getTime()).toBeGreaterThan(Date.now() + 29 * 86400000);
      expect(JSON.stringify(session)).not.toContain(accessToken);
      expect(session).not.toHaveProperty("accessToken");
      expect(JSON.stringify(session)).not.toContain("oauthClientId");
    }
    vi.mocked(headers).mockResolvedValue(new Headers({ cookie: cookieHeader(jar) }));
    expect(await getGitHubSession()).toEqual({ userId: user.id, githubId: "123", username: "octocat", accessToken });
    expect(writes).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requests the agreed scopes and binds authorization to PKCE and state", async () => {
    const jar: CookieJar = new Map();
    const authorization = await beginSignIn(jar);
    expect(authorization.origin).toBe("https://github.com");
    expect(authorization.searchParams.get("scope")).toBe(GITHUB_SCOPES);
    expect(authorization.searchParams.has("prompt")).toBe(false);
    expect(authorization.searchParams.get("redirect_uri")).toBe(`${origin}/api/auth/callback/github`);
    expect(authorization.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authorization.searchParams.get("state")).toBeTruthy();
    expect(jar.has("authjs.state")).toBe(true);
    expect(jar.has("authjs.pkce.code_verifier")).toBe(true);
  });

  it("updates renamed profiles without replacing the user, installation, or reports", async () => {
    await signIn(new Map());
    const user = await prisma.user.update({ where: { githubId: "123" }, data: { installationId: 42 } });
    const report = await prisma.repoReport.create({ data: {
      shareId: "auth-test", owner: "owner", repo: "repo", healthScore: 80, breakdown: {}, userId: user.id,
    } });
    const createdAt = user.createdAt;
    fetchMock.mockImplementation(async (input) => String(input).endsWith("/user")
      ? Response.json({ ...profile, login: "renamed-user", avatar_url: null })
      : Response.json({ access_token: "new-token", token_type: "bearer" }));
    const jar: CookieJar = new Map();
    await signIn(jar);
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).toMatchObject({
      username: "renamed-user", avatarUrl: null, installationId: 42, createdAt,
    });
    expect((await prisma.repoReport.findUniqueOrThrow({ where: { id: report.id } })).userId).toBe(user.id);
    vi.mocked(headers).mockResolvedValue(new Headers({ cookie: cookieHeader(jar) }));
    expect(await getGitHubSession()).toMatchObject({ userId: user.id, username: "renamed-user", accessToken: "new-token" });
  });

  it("invalidates sessions after switching OAuth clients and allows a fresh sign-in without duplicating the user", async () => {
    const jar: CookieJar = new Map();
    await signIn(jar);
    const user = await prisma.user.findUniqueOrThrow({ where: { githubId: "123" } });
    vi.stubEnv("GITHUB_CLIENT_ID", "Ov23.new-oauth-client");
    vi.mocked(headers).mockResolvedValue(new Headers({ cookie: cookieHeader(jar) }));
    expect(await getGitHubSession()).toBeNull();
    expect(await (await request("/session", jar)).json()).toBeNull();
    expect(jar.has("authjs.session-token")).toBe(false);
    const authorization = await beginSignIn(jar);
    expect(authorization.searchParams.get("client_id")).toBe("Ov23.new-oauth-client");
    const response = await request(`/callback/github?${new URLSearchParams({ code: "new-code", state: authorization.searchParams.get("state")! })}`, jar);
    expect(response.headers.get("location")).toBe(origin);
    vi.mocked(headers).mockResolvedValue(new Headers({ cookie: cookieHeader(jar) }));
    expect(await getGitHubSession()).toMatchObject({ userId: user.id });
    expect(await prisma.user.count()).toBe(1);
  });

  it.each([
    { ...claims, oauthClientId: undefined },
    { ...claims, accessToken: "ghu_stale_github_app_token", oauthClientId },
  ])("clears legacy and GitHub App sessions at both session boundaries", async (token) => {
    const name = "authjs.session-token";
    const value = await encode({ token, secret, salt: name });
    const jar: CookieJar = new Map([[name, value]]);
    vi.mocked(headers).mockResolvedValue(new Headers({ cookie: cookieHeader(jar) }));
    expect(await getGitHubSession()).toBeNull();
    expect(await (await request("/session", jar)).json()).toBeNull();
    expect(jar.has(name)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("supports GitHub accounts with private email", async () => {
    fetchMock.mockImplementation(async (input) => {
      if (String(input).endsWith("/user")) return Response.json({ ...profile, email: null });
      if (String(input).endsWith("/user/emails")) return Response.json([{ email: "private@example.test", primary: true, verified: true }]);
      return Response.json({ access_token: accessToken, token_type: "bearer" });
    });
    const jar: CookieJar = new Map();
    expect((await signIn(jar)).headers.get("location")).toBe(origin);
    expect((await (await request("/session", jar)).json()).user.email).toBe("private@example.test");
    expect(await prisma.user.count()).toBe(1);
  });

  it("expires both server and public sessions when the provider token expires", async () => {
    fetchMock.mockImplementation(async (input) => String(input).endsWith("/user")
      ? Response.json(profile)
      : Response.json({ access_token: accessToken, token_type: "bearer", expires_in: 60 }));
    const jar: CookieJar = new Map();
    await signIn(jar);
    vi.mocked(headers).mockResolvedValue(new Headers({ cookie: cookieHeader(jar) }));
    expect((await getGitHubSession())?.accessToken).toBe(accessToken);
    const later = Date.now() + 120000;
    vi.spyOn(Date, "now").mockReturnValue(later);
    expect(await getGitHubSession()).toBeNull();
    expect(await (await request("/session", jar)).json()).toBeNull();
    expect(jar.has("authjs.session-token")).toBe(false);
  });

  it.each(["incorrect-state", "missing-state-cookie", "missing-pkce-cookie", "access-denied"])("rejects unsafe or cancelled callbacks: %s", async (failure) => {
    const jar: CookieJar = new Map();
    const authorization = await beginSignIn(jar);
    const params = new URLSearchParams({ code: "test-code", state: authorization.searchParams.get("state")! });
    if (failure === "incorrect-state") params.set("state", "wrong-state");
    if (failure === "missing-state-cookie") jar.delete("authjs.state");
    if (failure === "missing-pkce-cookie") jar.delete("authjs.pkce.code_verifier");
    if (failure === "access-denied") { params.delete("code"); params.set("error", "access_denied"); }
    const response = await request(`/callback/github?${params}`, jar);
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBeTruthy();
    expect(await prisma.user.count()).toBe(0);
    expect(jar.has("authjs.session-token")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed when database persistence fails, logging no provider credentials", async () => {
    vi.spyOn(prisma.user, "upsert").mockRejectedValueOnce(new Error(`Database unavailable: ${accessToken}`));
    const jar: CookieJar = new Map();
    const response = await signIn(jar);
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBeTruthy();
    expect(jar.has("authjs.session-token")).toBe(false);
    expect(await prisma.user.count()).toBe(0);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(accessToken);
  });

  it("rejects token endpoint errors and malformed profiles", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: "invalid_grant" }, { status: 400 }));
    const firstJar: CookieJar = new Map();
    expect(new URL((await signIn(firstJar)).headers.get("location")!).searchParams.get("error")).toBeTruthy();
    fetchMock.mockImplementation(async (input) => String(input).endsWith("/user")
      ? Response.json({ ...profile, login: "" })
      : Response.json({ access_token: accessToken, token_type: "bearer" }));
    const secondJar: CookieJar = new Map();
    expect(new URL((await signIn(secondJar)).headers.get("location")!).searchParams.get("error")).toBeTruthy();
    expect(await prisma.user.count()).toBe(0);
    expect(secondJar.has("authjs.session-token")).toBe(false);
  });

  it("ignores forged client session updates and rejects requests without CSRF", async () => {
    const jar: CookieJar = new Map();
    await signIn(jar);
    const response = await request("/session", jar, { body: JSON.stringify({
      csrfToken: await csrf(jar), data: { userId: "attacker", accessToken: "attacker", user: { username: "attacker" } },
    }) });
    expect((await response.json()).user.username).toBe("octocat");
    vi.mocked(headers).mockResolvedValue(new Headers({ cookie: cookieHeader(jar) }));
    expect((await getGitHubSession())?.accessToken).toBe(accessToken);
    const rejected = await request("/signin/github", new Map(), { body: new URLSearchParams({}) });
    expect(rejected.headers.get("location")).toContain("MissingCSRF");
    const signout = await request("/signout", jar, { body: new URLSearchParams({}) });
    expect(signout.headers.get("location")).toContain("MissingCSRF");
    expect((await (await request("/session", jar)).json()).user.username).toBe("octocat");
  });

  it("clears cookies on sign-out and returns an anonymous session", async () => {
    const jar: CookieJar = new Map();
    await signIn(jar);
    const response = await request("/signout", jar, { body: new URLSearchParams({ csrfToken: await csrf(jar) }) });
    expect(response.status).toBe(302);
    expect(jar.has("authjs.session-token")).toBe(false);
    expect(await (await request("/session", jar)).json()).toBeNull();
    expect(await prisma.user.count()).toBe(1);
  });

  it("prevents redirects to external callback URLs", async () => {
    const jar: CookieJar = new Map();
    const authorization = await beginSignIn(jar, "https://attacker.example.test");
    const response = await request(`/callback/github?${new URLSearchParams({
      code: "test-code", state: authorization.searchParams.get("state")!,
    })}`, jar);
    expect(response.headers.get("location")).toBe(origin);
  });

  it("uses secure, HttpOnly session cookies in HTTPS deployments", async () => {
    vi.stubEnv("NEXTAUTH_URL", "https://repodoc.example.test");
    const jar: CookieJar = new Map();
    const response = await signIn(jar);
    const cookie = response.headers.getSetCookie().find((value) => value.startsWith("__Secure-authjs.session-token="));
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    vi.mocked(headers).mockResolvedValue(new Headers({ cookie: cookieHeader(jar) }));
    expect((await getGitHubSession())?.accessToken).toBe(accessToken);
    expect((await (await request("/session", jar)).json()).user.githubId).toBe("123");
  });

  it.each(["NEXTAUTH_SECRET", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "NEXTAUTH_URL"])("returns a sanitized, uncached configuration error without %s", async (key) => {
    vi.stubEnv(key, "");
    const response = await request("/providers", new Map());
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Authentication is not configured." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats invalid cookies as anonymous and clears them", async () => {
    const jar: CookieJar = new Map([["authjs.session-token", "tampered-token"]]);
    expect(await (await request("/session", jar)).json()).toBeNull();
    expect(jar.has("authjs.session-token")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an actionable setup error for GitHub App credentials without redirecting or exposing secrets", async () => {
    vi.stubEnv("GITHUB_CLIENT_ID", "Iv1.wrong-app-client");
    const response = await request("/signin/github", new Map(), {
      body: new URLSearchParams({ csrfToken: "unused" }),
    });
    expect(response.status).toBe(500);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({ code: "oauth_app_required", error: expect.stringContaining("requires OAuth App credentials") });
    expect(JSON.stringify(body)).not.toMatch(/Iv1\.wrong-app-client|test-client-secret/);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/Iv1\.wrong-app-client|test-client-secret/);
    expect(await getGitHubSession()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
