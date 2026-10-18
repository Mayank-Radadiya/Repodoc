// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGitHubSession } from "@/lib/auth";
import {
  auditRepository,
  IncompleteTreeError,
  InvalidRepositoryError,
} from "@/lib/audit";
import { GitHubApiError, type GitHubErrorCode } from "@/lib/github/client";
import {
  RemediationEngine,
  RemediationError,
} from "@/lib/remediation/engine";
import { ScoringEngine } from "@/lib/scoring/engine";
import { SUPPORTED_LICENSE_IDS } from "@/lib/templates/licenses";
import { POST } from "../route";

vi.mock("@/lib/auth", () => ({ getGitHubSession: vi.fn() }));
vi.mock("@/lib/audit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/audit")>()),
  auditRepository: vi.fn(),
}));

const session = {
  userId: "user-id",
  githubId: "123",
  username: "caller",
  accessToken: "session-secret",
};
const report = ScoringEngine.run({
  owner: "owner",
  repo: "repo",
  paths: new Set<string>(),
});
const result = {
  prUrl: "https://github.com/owner/repo/pull/42",
  filesCreated: [".gitignore"],
};
const validBody = { owner: "owner", repo: "repo", fixes: ["gitignore"] };

function request(
  body: unknown = validBody,
  headers: HeadersInit = {},
): Request {
  return new Request("https://repodoc.test/api/remediate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function expectError(response: Response, status: number) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-type")).toContain("application/json");
  const data = await response.json();
  expect(data).toEqual({ error: expect.any(String) });
  expect(JSON.stringify(data)).not.toMatch(
    /session-secret|private-upstream-detail/,
  );
  return data;
}

beforeEach(() => {
  vi.mocked(getGitHubSession).mockReset().mockResolvedValue(session);
  vi.mocked(auditRepository).mockReset().mockResolvedValue(report);
  vi.spyOn(RemediationEngine, "execute").mockResolvedValue(result);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/remediate authentication and request boundary", () => {
  it("authenticates before parsing the body or checking headers", async () => {
    vi.mocked(getGitHubSession).mockResolvedValue(null);
    await expectError(
      await POST(
        new Request("https://repodoc.test/api/remediate", {
          method: "POST",
          body: "{",
          headers: { origin: "https://other.test" },
        }),
      ),
      401,
    );
    expect(auditRepository).not.toHaveBeenCalled();
    expect(RemediationEngine.execute).not.toHaveBeenCalled();
  });

  it("returns a safe 500 when session lookup throws", async () => {
    vi.mocked(getGitHubSession).mockRejectedValue(
      new Error("private-upstream-detail session-secret"),
    );
    await expectError(await POST(request()), 500);
    expect(auditRepository).not.toHaveBeenCalled();
    expect(RemediationEngine.execute).not.toHaveBeenCalled();
  });

  it.each([undefined, "https://repodoc.test"])(
    "accepts origin %s",
    async (origin) => {
      expect(
        (await POST(request(validBody, origin ? { origin } : {}))).status,
      ).toBe(200);
    },
  );

  it.each([
    "https://other.test",
    "null",
    "http://repodoc.test",
    "https://repodoc.test.evil.test",
    "https://repodoc.test:444",
  ])("rejects origin %s before GitHub", async (origin) => {
    await expectError(await POST(request(validBody, { origin })), 403);
    expect(auditRepository).not.toHaveBeenCalled();
    expect(RemediationEngine.execute).not.toHaveBeenCalled();
  });

  it("rejects sec-fetch-site cross-site requests before GitHub", async () => {
    await expectError(
      await POST(request(validBody, { "sec-fetch-site": "cross-site" })),
      403,
    );
    expect(auditRepository).not.toHaveBeenCalled();
    expect(RemediationEngine.execute).not.toHaveBeenCalled();
  });

  it.each([
    "text/plain",
    "application/x-www-form-urlencoded",
    "multipart/form-data",
    "application/jsonp",
    "",
  ])("rejects content type %s", async (contentType) => {
    await expectError(
      await POST(request(validBody, { "Content-Type": contentType })),
      415,
    );
    expect(auditRepository).not.toHaveBeenCalled();
  });

  it("rejects an absent content type", async () => {
    await expectError(
      await POST(
        new Request("https://repodoc.test/api/remediate", { method: "POST" }),
      ),
      415,
    );
    expect(auditRepository).not.toHaveBeenCalled();
  });

  it("accepts JSON media type parameters and casing", async () => {
    expect(
      (
        await POST(
          request(validBody, {
            "Content-Type": "Application/JSON; charset=utf-8",
          }),
        )
      ).status,
    ).toBe(200);
  });

  it.each(["", "{", '{"owner":"owner",}'])(
    "rejects malformed JSON %j",
    async (body) => {
      await expectError(
        await POST(
          new Request("https://repodoc.test/api/remediate", {
            method: "POST",
            body,
            headers: { "Content-Type": "application/json" },
          }),
        ),
        400,
      );
      expect(auditRepository).not.toHaveBeenCalled();
      expect(RemediationEngine.execute).not.toHaveBeenCalled();
    },
  );
});

describe("POST /api/remediate input", () => {
  it.each([
    null,
    [],
    true,
    3,
    "owner/repo",
    {},
    { repo: "repo", fixes: ["gitignore"] },
    { owner: "owner", fixes: ["gitignore"] },
    ...[
      null,
      42,
      "",
      " ",
      "-owner",
      "owner/other",
      "https://github.com/owner",
      "owner\nother",
    ].map((owner) => ({ ...validBody, owner })),
    ...[
      null,
      42,
      "",
      " ",
      ".",
      "..",
      "../repo",
      "owner/repo",
      "%2E%2E",
      "r\\epo",
      "r\u0000epo",
      "repo?token=secret",
    ].map((repo) => ({ ...validBody, repo })),
    ...[
      undefined,
      null,
      "gitignore",
      [],
      [null],
      [7],
      ["unknown"],
      ["license", "manual"],
      ["__proto__"],
      ["constructor"],
      [" gitignore "],
    ].map((fixes) => ({ ...validBody, fixes })),
  ])("rejects invalid input %j without GitHub calls", async (body) => {
    await expectError(await POST(request(body)), 400);
    expect(auditRepository).not.toHaveBeenCalled();
    expect(RemediationEngine.execute).not.toHaveBeenCalled();
  });

  it("trims coordinates, preserves case, deduplicates fixes, and uses only the server token", async () => {
    const body = {
      owner: " My-Org ",
      repo: " Repo.v2 ",
      fixes: ["gitignore", "ci-workflow", "gitignore"],
      token: "client-token",
      accessToken: "client-token",
      report: { checks: [] },
      licenseYear: 1900,
    };
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(auditRepository).toHaveBeenCalledExactlyOnceWith(
      "My-Org",
      "Repo.v2",
      { token: "session-secret" },
    );
    expect(RemediationEngine.execute).toHaveBeenCalledExactlyOnceWith({
      report,
      fixes: ["gitignore", "ci-workflow"],
      token: "session-secret",
    });
    expect(vi.mocked(auditRepository).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(RemediationEngine.execute).mock.invocationCallOrder[0],
    );
  });

  it("only returns the public success fields", async () => {
    const internalResult = { ...result, token: "session-secret" };
    vi.mocked(RemediationEngine.execute).mockResolvedValue(internalResult);
    const response = await POST(request());
    expect(await response.json()).toEqual(result);
  });

  it.each(SUPPORTED_LICENSE_IDS)(
    "accepts explicit license %s and attribution",
    async (licenseChoice) => {
      const response = await POST(
        request({
          ...validBody,
          fixes: ["license"],
          licenseChoice,
          licenseFullName: " Jane Example ",
        }),
      );
      expect(response.status).toBe(200);
      expect(RemediationEngine.execute).toHaveBeenCalledWith({
        report,
        fixes: ["license"],
        token: "session-secret",
        licenseChoice,
        licenseFullName: "Jane Example",
      });
    },
  );

  it.each([
    {},
    { licenseChoice: "MIT" },
    { licenseFullName: "Jane Example" },
    { licenseChoice: "mit", licenseFullName: "Jane Example" },
    { licenseChoice: "unsupported", licenseFullName: "Jane Example" },
    { licenseChoice: null, licenseFullName: "Jane Example" },
    ...[
      null,
      42,
      "",
      " ",
      "Jane\nExample",
      "Jane\rExample",
      "Jane\u2028Example",
      "Jane\u2029Example",
    ].map((licenseFullName) => ({ licenseChoice: "MIT", licenseFullName })),
  ])("rejects license input %j before auditing", async (inputs) => {
    const data = await expectError(
      await POST(request({ ...validBody, fixes: ["license"], ...inputs })),
      400,
    );
    expect(data.error).toContain("licenseChoice");
    expect(auditRepository).not.toHaveBeenCalled();
    expect(RemediationEngine.execute).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    null,
    42,
    "",
    " ",
    "contact\nexample",
    "contact\rexample",
    "a\u2028b",
    "a\u2029b",
  ])(
    "rejects conduct contact %j before auditing",
    async (codeOfConductContact) => {
      const data = await expectError(
        await POST(
          request({
            ...validBody,
            fixes: ["code-of-conduct"],
            codeOfConductContact,
          }),
        ),
        400,
      );
      expect(data.error).toContain("codeOfConductContact");
      expect(auditRepository).not.toHaveBeenCalled();
    },
  );

  it("forwards the explicit conduct contact without inferring identity", async () => {
    const response = await POST(
      request({
        ...validBody,
        fixes: ["code-of-conduct", "security-policy"],
        codeOfConductContact: " conduct@example.com ",
      }),
    );
    expect(response.status).toBe(200);
    expect(RemediationEngine.execute).toHaveBeenCalledWith({
      report,
      fixes: ["code-of-conduct", "security-policy"],
      codeOfConductContact: "conduct@example.com",
      token: "session-secret",
    });
  });

  it.each([
    { licenseChoice: "invalid" },
    { licenseFullName: "\n" },
    { codeOfConductContact: null },
  ])(
    "rejects malformed optional inputs even without the corresponding fix: %j",
    async (inputs) => {
      await expectError(await POST(request({ ...validBody, ...inputs })), 400);
      expect(auditRepository).not.toHaveBeenCalled();
    },
  );
});

describe("POST /api/remediate failures", () => {
  const githubCases: [GitHubErrorCode, number][] = [
    ["unauthorized", 401],
    ["forbidden", 403],
    ["not_found", 404],
    ["rate_limited", 429],
    ["http_error", 502],
    ["network_error", 502],
    ["invalid_response", 502],
    ["invalid_input", 502],
  ];
  it.each(["audit", "engine"] as const)(
    "sanitizes and maps typed GitHub errors from %s",
    async (stage) => {
      for (const [code, status] of githubCases) {
        const error = new GitHubApiError(
          code,
          "private-upstream-detail session-secret",
        );
        if (stage === "audit")
          vi.mocked(auditRepository).mockRejectedValueOnce(error);
        else vi.mocked(RemediationEngine.execute).mockRejectedValueOnce(error);
        await expectError(await POST(request()), status);
      }
      if (stage === "audit")
        expect(RemediationEngine.execute).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["invalid_input", 400],
    ["path_conflict", 409],
    ["no_changes", 409],
    ["fork_conflict", 409],
    ["fork_not_ready", 503],
  ] as const)("maps remediation error %s to %s", async (code, status) => {
    vi.mocked(RemediationEngine.execute).mockRejectedValue(
      new RemediationError(code, "private-upstream-detail session-secret"),
    );
    await expectError(await POST(request()), status);
  });

  it.each([
    [new IncompleteTreeError("private-upstream-detail"), 502],
    [new InvalidRepositoryError("private-upstream-detail"), 400],
    [new Error("private-upstream-detail session-secret"), 500],
  ] as const)(
    "maps audit failure %s without executing the engine",
    async (error, status) => {
      vi.mocked(auditRepository).mockRejectedValue(error);
      await expectError(await POST(request()), status);
      expect(RemediationEngine.execute).not.toHaveBeenCalled();
    },
  );

  it("sanitizes unexpected engine errors", async () => {
    vi.mocked(RemediationEngine.execute).mockRejectedValue(
      new Error("private-upstream-detail session-secret"),
    );
    await expectError(await POST(request()), 500);
  });

  it.each([
    [{ retryAfterSeconds: 12.2, rateLimitResetAt: 1900000000 }, "13"],
    [{ retryAfterSeconds: 0 }, "0"],
    [{ rateLimitResetAt: 1800000030.1 }, "31"],
    [{ rateLimitResetAt: 1799999999 }, "0"],
    [{}, null],
    [{ retryAfterSeconds: -1 }, null],
    [{ retryAfterSeconds: NaN }, null],
    [{ retryAfterSeconds: Infinity }, null],
    [{ retryAfterSeconds: Number.MAX_SAFE_INTEGER + 1 }, null],
    [{ rateLimitResetAt: NaN }, null],
  ])("handles rate-limit timing %j", async (options, expected) => {
    vi.spyOn(Date, "now").mockReturnValue(1800000000000);
    vi.mocked(RemediationEngine.execute).mockRejectedValue(
      new GitHubApiError("rate_limited", "private-upstream-detail", options),
    );
    const response = await POST(request());
    expect(response.headers.get("retry-after")).toBe(expected);
    await expectError(response, 429);
  });
});
