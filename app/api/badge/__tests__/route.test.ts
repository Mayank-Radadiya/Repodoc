// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  auditRepository,
  IncompleteTreeError,
} from "@/lib/audit";
import { BADGE_CACHE_CONTROL, BADGE_LABEL } from "@/lib/badge";
import { GitHubApiError } from "@/lib/github/client";
import type { AuditReport } from "@/lib/types";
import { GET } from "../[owner]/[repo]/route";

vi.mock("@/lib/audit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/audit")>();
  return {
    ...actual,
    auditRepository: vi.fn(),
  };
});

function mockReport(healthScore: number): AuditReport {
  return {
    owner: "facebook",
    repo: "react",
    defaultBranch: "main",
    healthScore,
    rubricVersion: "1.0.0",
    checks: [],
    generatedAt: new Date().toISOString(),
  };
}

function createContext(owner: string, repo: string) {
  return {
    params: Promise.resolve({ owner, repo }),
  };
}

describe("GET /api/badge/[owner]/[repo]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful responses", () => {
    it.each([
      [0, "red"],
      [39, "red"],
      [40, "orange"],
      [59, "orange"],
      [60, "yellow"],
      [74, "yellow"],
      [75, "green"],
      [89, "green"],
      [90, "brightgreen"],
      [100, "brightgreen"],
    ] as const)("returns the exact badge contract for score %s", async (score, color) => {
      vi.mocked(auditRepository).mockResolvedValueOnce(mockReport(score));

      const response = await GET(
        new Request("http://localhost:3000/api/badge/facebook/react"),
        createContext("facebook", "react"),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toMatch(/^application\/json\b/);
      expect(response.headers.get("Cache-Control")).toBe(
        "public, s-maxage=3600, stale-while-revalidate=86400",
      );
      expect(auditRepository).toHaveBeenCalledExactlyOnceWith("facebook", "react");
      expect(await response.json()).toEqual({
        schemaVersion: 1,
        label: "repo health",
        message: `${score}/100`,
        color,
      });
    });

    it("returns shields.io json with brightgreen for score >= 90", async () => {
      vi.mocked(auditRepository).mockResolvedValueOnce(mockReport(92));

      const request = new Request("http://localhost:3000/api/badge/facebook/react");
      const response = await GET(request, createContext("facebook", "react"));

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe(BADGE_CACHE_CONTROL);

      const data = await response.json();
      expect(data).toEqual({
        schemaVersion: 1,
        label: BADGE_LABEL,
        message: "92/100",
        color: "brightgreen",
      });
    });

    it("returns green for score between 75 and 89", async () => {
      vi.mocked(auditRepository).mockResolvedValueOnce(mockReport(80));

      const request = new Request("http://localhost:3000/api/badge/facebook/react");
      const response = await GET(request, createContext("facebook", "react"));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        schemaVersion: 1,
        label: BADGE_LABEL,
        message: "80/100",
        color: "green",
      });
    });

    it("returns yellow for score between 60 and 74", async () => {
      vi.mocked(auditRepository).mockResolvedValueOnce(mockReport(65));

      const request = new Request("http://localhost:3000/api/badge/facebook/react");
      const response = await GET(request, createContext("facebook", "react"));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        schemaVersion: 1,
        label: BADGE_LABEL,
        message: "65/100",
        color: "yellow",
      });
    });

    it("returns orange for score between 40 and 59", async () => {
      vi.mocked(auditRepository).mockResolvedValueOnce(mockReport(45));

      const request = new Request("http://localhost:3000/api/badge/facebook/react");
      const response = await GET(request, createContext("facebook", "react"));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        schemaVersion: 1,
        label: BADGE_LABEL,
        message: "45/100",
        color: "orange",
      });
    });

    it("returns red for score < 40", async () => {
      vi.mocked(auditRepository).mockResolvedValueOnce(mockReport(20));

      const request = new Request("http://localhost:3000/api/badge/facebook/react");
      const response = await GET(request, createContext("facebook", "react"));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        schemaVersion: 1,
        label: BADGE_LABEL,
        message: "20/100",
        color: "red",
      });
    });

    it("handles URL-encoded owner and repo correctly", async () => {
      vi.mocked(auditRepository).mockResolvedValueOnce(mockReport(95));

      const request = new Request("http://localhost:3000/api/badge/my%2Dorg/my%2Erepo");
      const response = await GET(request, createContext("my%2Dorg", "my%2Erepo"));

      expect(response.status).toBe(200);
      expect(auditRepository).toHaveBeenCalledWith("my-org", "my.repo");
      const data = await response.json();
      expect(data.color).toBe("brightgreen");
    });
  });

  describe("validation failures", () => {
    it.each([
      ["%", "repo"],
      ["owner", "%"],
      ["%2", "repo"],
      ["owner", "%GG"],
      ["%C3%28", "repo"],
      ["owner", "%E0%A4%A"],
      ["%2E%2E", "repo"],
      ["owner", "%2E%2E"],
      ["owner", "%252E%252E"],
      ["nested%2Fowner", "repo"],
      ["owner", "nested%2Frepo"],
      ["owner", "nested%5Crepo"],
      ["", "repo"],
      ["owner", ""],
      [undefined, "repo"],
      ["owner", undefined],
    ])("rejects invalid coordinates (%s, %s) without auditing", async (owner, repo) => {
      const context = { params: Promise.resolve({ owner, repo }) };
      const request = new Request("http://localhost:3000/api/badge/owner/repo");
      // @ts-expect-error Exercise missing parameters despite the framework's route types.
      const response = await GET(request, context);

      expect(response.status).toBe(400);
      expect(response.headers.get("Content-Type")).toMatch(/^application\/json\b/);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({
        schemaVersion: 1,
        isError: true,
        label: "repo health",
        message: "invalid repo",
        color: "red",
      });
      expect(auditRepository).not.toHaveBeenCalled();
    });

    it("returns 400 when owner is invalid", async () => {
      const request = new Request("http://localhost:3000/api/badge/invalid%20owner/react");
      const response = await GET(request, createContext("invalid owner", "react"));

      expect(response.status).toBe(400);
      expect(response.headers.get("Content-Type")).toMatch(/^application\/json\b/);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const data = await response.json();
      expect(data).toEqual({
        schemaVersion: 1,
        isError: true,
        label: BADGE_LABEL,
        message: "invalid repo",
        color: "red",
      });
    });

    it("returns 400 when repo is invalid or traversal", async () => {
      const request = new Request("http://localhost:3000/api/badge/facebook/..");
      const response = await GET(request, createContext("facebook", ".."));

      expect(response.status).toBe(400);
      expect(response.headers.get("Content-Type")).toMatch(/^application\/json\b/);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const data = await response.json();
      expect(data.isError).toBe(true);
      expect(data.message).toBe("invalid repo");
      expect(auditRepository).not.toHaveBeenCalled();
    });

    it("returns 400 if context.params rejects", async () => {
      const request = new Request("http://localhost:3000/api/badge/facebook/react");
      const rejectedContext = {
        params: Promise.reject(new Error("Params parsing failed")),
      };
      const response = await GET(request, rejectedContext);

      expect(response.status).toBe(400);
      expect(response.headers.get("Content-Type")).toMatch(/^application\/json\b/);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const data = await response.json();
      expect(data.isError).toBe(true);
      expect(data.message).toBe("invalid parameters");
      expect(auditRepository).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it.each([
      { timing: { retryAfterSeconds: 12.2, rateLimitResetAt: 1700000100 }, expected: "13" },
      { timing: { retryAfterSeconds: 0, rateLimitResetAt: 1700000100 }, expected: "0" },
      { timing: { rateLimitResetAt: 1700000060 }, expected: "60" },
      { timing: { rateLimitResetAt: 1699999999 }, expected: "0" },
      { timing: {}, expected: null },
      { timing: { retryAfterSeconds: -1 }, expected: null },
      { timing: { retryAfterSeconds: NaN }, expected: null },
      { timing: { retryAfterSeconds: Infinity }, expected: null },
      { timing: { retryAfterSeconds: Number.MAX_SAFE_INTEGER + 1 }, expected: null },
      { timing: { rateLimitResetAt: NaN }, expected: null },
      { timing: { rateLimitResetAt: Infinity }, expected: null },
    ])("handles rate-limit timing $timing", async ({ timing, expected }) => {
      vi.spyOn(Date, "now").mockReturnValue(1700000000123);
      vi.mocked(auditRepository).mockRejectedValueOnce(
        new GitHubApiError("rate_limited", "Private upstream diagnostic", timing),
      );

      const response = await GET(
        new Request("http://localhost:3000/api/badge/facebook/react"),
        createContext("facebook", "react"),
      );

      expect(response.status).toBe(429);
      expect(response.headers.get("Content-Type")).toMatch(/^application\/json\b/);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("Retry-After")).toBe(expected);
      expect(await response.json()).toEqual({
        schemaVersion: 1,
        isError: true,
        label: "repo health",
        message: "rate limited",
        color: "red",
      });
    });

    it("returns 404 when repository is not found", async () => {
      vi.mocked(auditRepository).mockRejectedValueOnce(
        new GitHubApiError("not_found", "Repo not found", { status: 404 }),
      );

      const request = new Request("http://localhost:3000/api/badge/unknown/missing");
      const response = await GET(request, createContext("unknown", "missing"));

      expect(response.status).toBe(404);
      expect(response.headers.get("Content-Type")).toMatch(/^application\/json\b/);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const data = await response.json();
      expect(data).toEqual({
        schemaVersion: 1,
        isError: true,
        label: BADGE_LABEL,
        message: "not found",
        color: "red",
      });
    });

    it("returns 429 when rate limited with Retry-After header", async () => {
      vi.mocked(auditRepository).mockRejectedValueOnce(
        new GitHubApiError("rate_limited", "Rate limit exceeded", {
          status: 403,
          retryAfterSeconds: 60,
        }),
      );

      const request = new Request("http://localhost:3000/api/badge/facebook/react");
      const response = await GET(request, createContext("facebook", "react"));

      expect(response.status).toBe(429);
      expect(response.headers.get("Content-Type")).toMatch(/^application\/json\b/);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("Retry-After")).toBe("60");
      const data = await response.json();
      expect(data).toEqual({
        schemaVersion: 1,
        isError: true,
        label: BADGE_LABEL,
        message: "rate limited",
        color: "red",
      });
    });

    it("returns 502 for upstream GitHub errors", async () => {
      vi.mocked(auditRepository).mockRejectedValueOnce(
        new GitHubApiError("network_error", "GitHub down", { status: 502 }),
      );

      const request = new Request("http://localhost:3000/api/badge/facebook/react");
      const response = await GET(request, createContext("facebook", "react"));

      expect(response.status).toBe(502);
      expect(response.headers.get("Content-Type")).toMatch(/^application\/json\b/);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const data = await response.json();
      expect(data).toEqual({
        schemaVersion: 1,
        isError: true,
        label: BADGE_LABEL,
        message: "upstream error",
        color: "red",
      });
    });

    it("returns 502 for incomplete/truncated tree", async () => {
      vi.mocked(auditRepository).mockRejectedValueOnce(
        new IncompleteTreeError(),
      );

      const request = new Request("http://localhost:3000/api/badge/facebook/react");
      const response = await GET(request, createContext("facebook", "react"));

      expect(response.status).toBe(502);
      expect(response.headers.get("Content-Type")).toMatch(/^application\/json\b/);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const data = await response.json();
      expect(data).toEqual({
        schemaVersion: 1,
        isError: true,
        label: BADGE_LABEL,
        message: "incomplete tree",
        color: "red",
      });
    });

    it("returns 500 for unexpected errors", async () => {
      vi.mocked(auditRepository).mockRejectedValueOnce(
        new Error("Unexpected crash"),
      );

      const request = new Request("http://localhost:3000/api/badge/facebook/react");
      const response = await GET(request, createContext("facebook", "react"));

      expect(response.status).toBe(500);
      expect(response.headers.get("Content-Type")).toMatch(/^application\/json\b/);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const data = await response.json();
      expect(data).toEqual({
        schemaVersion: 1,
        isError: true,
        label: BADGE_LABEL,
        message: "audit error",
        color: "red",
      });
    });
  });
});
