// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError } from "next-auth";
import { AuthConfigurationError, getAuthConfig, getAuthSettings, GITHUB_SCOPES, SESSION_MAX_AGE } from "../config";
import { authEnvironment } from "./fixtures";

beforeEach(() => {
  for (const [key, value] of Object.entries(authEnvironment())) vi.stubEnv(key, value);
});
afterEach(() => vi.unstubAllEnvs());

describe("request-time auth configuration", () => {
  it("can initialize authentication exports without configured credentials", async () => {
    for (const key of ["NEXTAUTH_SECRET", "NEXTAUTH_URL", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"]) vi.stubEnv(key, "");
    const auth = await import("@/auth");
    expect(auth.handlers.GET).toBeTypeOf("function");
    expect(auth.handlers.POST).toBeTypeOf("function");
  });

  it("uses encrypted JWT sessions, provider checks, and public-repository remediation scopes", () => {
    const config = getAuthConfig();
    expect(config.session).toEqual({ strategy: "jwt", maxAge: SESSION_MAX_AGE });
    expect(SESSION_MAX_AGE).toBe(2592000);
    expect(config.useSecureCookies).toBe(false);
    expect(config.basePath).toBe("/api/auth");
    const provider = config.providers[0];
    expect(provider).toMatchObject({
      id: "github",
      options: {
        clientId: "test-client-id", clientSecret: "test-client-secret",
        checks: ["pkce", "state"], authorization: { params: { scope: GITHUB_SCOPES } },
      },
    });
    expect(GITHUB_SCOPES).toBe("read:user user:email public_repo workflow");
  });

  it.each(["NEXTAUTH_SECRET", "NEXTAUTH_URL", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"])("requires %s without disclosing values", (key) => {
    vi.stubEnv(key, " ");
    expect(getAuthSettings).toThrow(AuthConfigurationError);
    expect(getAuthSettings).toThrow("GitHub authentication configuration is missing or invalid.");
  });

  it.each([
    "invalid", "ftp://example.test", "https://user:password@example.test",
    "https://example.test/path", "https://example.test?query=value", "https://example.test#hash",
    "http://example.test",
  ])("rejects invalid canonical origins: %s", (url) => {
    vi.stubEnv("NEXTAUTH_URL", url);
    expect(getAuthSettings).toThrow(AuthConfigurationError);
  });

  it("enables secure cookies for HTTPS, and requires HTTPS in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(getAuthSettings).toThrow(AuthConfigurationError);
    vi.stubEnv("NEXTAUTH_URL", "https://repodoc.example.test");
    expect(getAuthSettings().useSecureCookies).toBe(true);
  });

  it("supports Auth.js v5 standard environment variable aliases (AUTH_*)", () => {
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("GITHUB_CLIENT_ID", "");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "");

    vi.stubEnv("AUTH_SECRET", "auth-v5-secret-value-test-32chars-long");
    vi.stubEnv("AUTH_URL", "http://localhost:3000");
    vi.stubEnv("AUTH_GITHUB_ID", "auth-v5-client-id");
    vi.stubEnv("AUTH_GITHUB_SECRET", "auth-v5-client-secret");

    const settings = getAuthSettings();
    expect(settings).toEqual({
      secret: "auth-v5-secret-value-test-32chars-long",
      clientId: "auth-v5-client-id",
      clientSecret: "auth-v5-client-secret",
      useSecureCookies: false,
    });
  });

  it("logs only error codes, excluding provider data and error causes", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    getAuthConfig().logger?.error?.(new AuthError("sensitive provider response", { cause: { accessToken: "private" } }));
    expect(log).toHaveBeenCalledExactlyOnceWith("[auth]", "AuthError");
    log.mockRestore();
  });
});
