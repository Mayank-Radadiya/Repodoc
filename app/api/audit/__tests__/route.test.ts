// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RUBRIC_VERSION } from "@/src/lib/constants";
import { GitHubApiError, type GitHubErrorCode } from "@/src/lib/github/client";
import { GitHubService } from "@/src/lib/github/service";
import { ScoringEngine } from "@/src/lib/scoring/engine";
import type { AuditReport, TreeEntry } from "@/src/lib/types";
import { findCachedReport, saveReport } from "@/src/lib/reports";
import { POST } from "../route";

vi.mock("@/src/lib/reports", () => ({ findCachedReport: vi.fn(), saveReport: vi.fn() }));

const fetchMock = vi.fn<typeof fetch>();
const metadata = { default_branch: "release/docs", description: "Repository tools", topics: ["tools"] };
const readmeContent = "# Project\n\n## Installation\nInstall it.\n\n## Usage\nUse it.\n\n## Architecture\nHow it works.";

function entry(path: string): TreeEntry {
  return { path, mode: "100644", type: "blob", sha: `sha-${path}` };
}

function request(body: unknown = { owner: "owner", repo: "repo" }): Request {
  return new Request("http://localhost/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockRepository(tree: TreeEntry[] = [], truncated = false): void {
  fetchMock.mockResolvedValueOnce(Response.json(metadata));
  fetchMock.mockResolvedValueOnce(Response.json({
    sha: "tree-sha",
    url: "https://api.github.com/repos/owner/repo/git/trees/tree-sha",
    tree,
    truncated,
  }, { headers: { ETag: '"tree-etag"' } }));
}

function blob(content: string): Response {
  return Response.json({
    sha: "blob-sha",
    size: Buffer.byteLength(content),
    content: Buffer.from(content).toString("base64"),
    encoding: "base64",
  });
}

function urls(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

beforeEach(() => {
  vi.mocked(findCachedReport).mockReset().mockResolvedValue(null);
  vi.mocked(saveReport).mockReset().mockImplementation(async (report) => ({ ...report, shareId: "share123" }));
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GITHUB_TOKEN", "");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("POST /api/audit input", () => {
  it.each([
    [{ owner: "owner", repo: "repo" }, "owner", "repo"],
    [{ owner: " owner ", repo: " repo " }, "owner", "repo"],
    [{ owner: "github.com/owner", repo: "repo" }, "owner", "repo"],
    [{ owner: "https://github.com/owner/", repo: "repo" }, "owner", "repo"],
    [{ owner: "owner", repo: "github.com/owner/repo" }, "owner", "repo"],
    [{ owner: "owner", repo: "https://github.com/owner/repo/" }, "owner", "repo"],
    [{ owner: "Owner", repo: " https://github.com/OWNER/Repo/ " }, "Owner", "Repo"],
    [{ owner: "my-org", repo: "my_repo.v2" }, "my-org", "my_repo.v2"],
  ])("normalizes %j", async (input, owner, repo) => {
    mockRepository();
    const response = await POST(request(input));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ owner, repo });
    expect(urls()[0]).toBe(`https://api.github.com/repos/${owner}/${repo}`);
  });

  it.each([
    null, [], "owner/repo", 1, {},
    { owner: "owner" }, { repo: "repo" },
    { owner: 1, repo: "repo" }, { owner: "owner", repo: null },
    { owner: "", repo: "repo" }, { owner: "owner", repo: "  " },
    { owner: " ", repo: "repo" },
    { owner: "owner", repo: "https://github.com/other/repo" },
    { owner: "owner", repo: "owner/repo" },
    { owner: "owner/repo", repo: "repo" },
    { owner: "owner", repo: "https://gitlab.com/owner/repo" },
    { owner: "owner", repo: "https://github.com.evil.test/owner/repo" },
    { owner: "owner", repo: "https://github.com@evil.test/owner/repo" },
    { owner: "owner", repo: "https://github.com/owner/repo/tree/main" },
    { owner: "owner", repo: "https://github.com/owner/repo?token=secret" },
    { owner: "owner", repo: "https://github.com/owner/repo#readme" },
    { owner: "owner", repo: "https://github.com/owner/../repo" },
    { owner: "owner", repo: "https://github.com:443/owner/repo" },
    { owner: "owner", repo: "http://github.com/owner/repo" },
    { owner: "owner", repo: "../repo" }, { owner: "owner", repo: "." },
    { owner: "owner", repo: ".." }, { owner: "owner", repo: "a\\b" },
    { owner: "owner", repo: "%2f" }, { owner: "owner", repo: "r\nepo" },
    { owner: "owner\u0000", repo: "repo" }, { owner: "owner", repo: "r\u0000epo" },
    { owner: "-owner", repo: "repo" }, { owner: "owner", repo: "repo name" },
  ])("rejects invalid body %j before calling GitHub", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(findCachedReport).not.toHaveBeenCalled();
    expect(saveReport).not.toHaveBeenCalled();
  });

  it.each(["", "{", '{"owner":"owner",}'])("rejects malformed JSON %j", async (body) => {
    const response = await POST(new Request("http://localhost/api/audit", { method: "POST", body }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Request body must be valid JSON." });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/audit scoring", () => {
  it("returns a complete 100-point report through the real GitHub and scoring modules", async () => {
    const paths = [
      "README.md", "CONTRIBUTING.md", "LICENSE", ".gitignore", "CODE_OF_CONDUCT.md",
      ".github/workflows/ci.yml", "tests/test.ts", ".github/ISSUE_TEMPLATE/bug.md",
      ".github/PULL_REQUEST_TEMPLATE.md", "SECURITY.md", ".github/dependabot.yml",
    ];
    mockRepository(paths.map(entry));
    fetchMock.mockResolvedValueOnce(blob(readmeContent));
    const before = Date.now();

    const response = await POST(request());
    const report: AuditReport = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(report).toMatchObject({
      owner: "owner", repo: "repo", defaultBranch: "release/docs",
      healthScore: 100, rubricVersion: RUBRIC_VERSION,
    });
    expect(Object.keys(report).sort()).toEqual([
      "checks", "defaultBranch", "generatedAt", "healthScore", "owner", "repo", "rubricVersion", "shareId",
    ]);
    expect(report.checks).toHaveLength(14);
    expect(report.healthScore).toBe(report.checks.reduce((sum, check) => sum + check.pointsAwarded, 0));
    expect(report.checks.every((check) => check.passed && check.evidence.found)).toBe(true);
    expect(report.checks.find((check) => check.id === "readme-headings")?.evidence.details).toContain("Installation");
    expect(Date.parse(report.generatedAt)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(report.generatedAt)).toBeLessThanOrEqual(Date.now());
    expect(new Date(report.generatedAt).toISOString()).toBe(report.generatedAt);
    expect(urls()).toEqual([
      "https://api.github.com/repos/owner/repo",
      "https://api.github.com/repos/owner/repo/git/trees/release%2Fdocs?recursive=1",
      "https://api.github.com/repos/owner/repo/git/blobs/sha-README.md",
    ]);
    for (const [, options] of fetchMock.mock.calls) {
      expect(options?.cache).toBe("no-store");
      expect(new Headers(options?.headers).has("if-none-match")).toBe(false);
    }
  });

  it("scores an empty tree and empty metadata as 0 without fetching blobs", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ ...metadata, description: null, topics: [] }));
    fetchMock.mockResolvedValueOnce(Response.json({
      sha: "tree", url: "https://api.github.com/tree", tree: [], truncated: false,
    }));
    const report: AuditReport = await (await POST(request())).json();
    expect(report.healthScore).toBe(0);
    expect(report.checks).toHaveLength(14);
    expect(report.checks.every((check) => !check.passed)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(["README.md", "readme.MD", ".github/README.md", "docs/README.md"])(
    "fetches the selected README %s by its blob SHA", async (path) => {
      mockRepository([entry("docs/README.txt"), entry(path)]);
      fetchMock.mockResolvedValueOnce(blob(readmeContent));
      const report: AuditReport = await (await POST(request())).json();
      expect(urls()[2]).toBe(`https://api.github.com/repos/owner/repo/git/blobs/${encodeURIComponent(`sha-${path}`)}`);
      expect(report.checks.find((check) => check.id === "readme-headings")?.pointsAwarded).toBe(10);
    },
  );

  it("awards testing points for a root manifest test script without test files", async () => {
    mockRepository([entry("package.json")]);
    fetchMock.mockResolvedValueOnce(blob('{"scripts":{"test":"vitest run"}}'));
    const report: AuditReport = await (await POST(request())).json();
    expect(report.checks.find((check) => check.id === "tests")).toMatchObject({
      passed: true, pointsAwarded: 10, evidence: { filesChecked: expect.arrayContaining(["package.json"]) },
    });
    expect(report.checks.find((check) => check.id === "readme-presence")?.passed).toBe(false);
    expect(urls()[2]).toBe("https://api.github.com/repos/owner/repo/git/blobs/sha-package.json");
  });

  it("awards testing points for a case-variant root manifest", async () => {
    mockRepository([entry("PACKAGE.JSON")]);
    fetchMock.mockResolvedValueOnce(blob('{"scripts":{"test":"vitest run"}}'));
    const report: AuditReport = await (await POST(request())).json();
    expect(report.checks.find((check) => check.id === "tests")?.passed).toBe(true);
    expect(urls()[2]).toBe("https://api.github.com/repos/owner/repo/git/blobs/sha-PACKAGE.JSON");
  });

  it("does not fetch nested manifests or entries that are not blobs", async () => {
    mockRepository([
      entry("packages/app/package.json"),
      { ...entry("package.json"), type: "tree", mode: "040000" },
      { ...entry("README.md"), type: "tree", mode: "040000" },
    ]);
    expect((await POST(request())).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("starts README and manifest requests concurrently", async () => {
    mockRepository([entry("README.md"), entry("package.json")]);
    let resolveReadme!: (response: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveReadme = resolve; }));
    fetchMock.mockResolvedValueOnce(blob('{"scripts":{"test":"vitest run"}}'));
    const pending = POST(request());
    // The manifest must start while the README response is still pending.
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    resolveReadme(blob(readmeContent));
    const report: AuditReport = await (await pending).json();
    expect(report.checks.find((check) => check.id === "tests")?.passed).toBe(true);
    expect(report.checks.find((check) => check.id === "readme-headings")?.passed).toBe(true);
  });
});

describe("POST /api/audit failures", () => {
  it.each(["metadata", "tree", "README", "manifest"])("returns 404 for a missing %s resource", async (stage) => {
    if (stage === "tree") fetchMock.mockResolvedValueOnce(Response.json(metadata));
    if (stage === "README" || stage === "manifest") {
      mockRepository([entry(stage === "README" ? "README.md" : "package.json")]);
    }
    fetchMock.mockResolvedValueOnce(Response.json({ message: "Not Found" }, { status: 404 }));
    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: expect.stringContaining("not found") });
  });

  it.each([403, 429])("maps GitHub rate limiting (%s) to 429 with Retry-After", async (status) => {
    fetchMock.mockImplementation(() => Promise.resolve(Response.json(
      { message: "API rate limit exceeded" },
      { status, headers: { "Retry-After": "60", "X-RateLimit-Remaining": "0" } },
    )));
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(await response.json()).toEqual({ error: expect.stringContaining("rate limit") });
  });

  it("calculates Retry-After from GitHub's reset timestamp", async () => {
    const now = Math.floor(Date.now() / 1000) * 1000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    fetchMock.mockImplementation(() => Promise.resolve(Response.json(
      { message: "API rate limit exceeded" },
      { status: 403, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(now / 1000 + 120) } },
    )));
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("120");
  });

  it("maps a blob rate limit to 429 rather than returning a reduced score", async () => {
    mockRepository([entry("README.md")]);
    fetchMock.mockImplementation(() => Promise.resolve(Response.json(
      { message: "API rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } },
    )));
    expect((await POST(request())).status).toBe(429);
  });

  it("omits Retry-After when retry timing is unavailable", async () => {
    vi.spyOn(GitHubService, "getRepoData").mockRejectedValue(new GitHubApiError("rate_limited", "secret"));
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.has("retry-after")).toBe(false);
  });

  it.each([401, 403, 409, 500])("returns a safe 502 for other GitHub HTTP errors (%s)", async (status) => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: "private upstream detail" }, { status }));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Unable to retrieve repository data from GitHub." });
  });

  it("returns 502 for network failures", async () => {
    fetchMock.mockRejectedValueOnce(new Error("private connection details"));
    expect((await POST(request())).status).toBe(502);
  });

  it("returns 502 for malformed GitHub metadata", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({}));
    expect((await POST(request())).status).toBe(502);
  });

  it("returns 502 for malformed blob content instead of scoring it as absent", async () => {
    mockRepository([entry("README.md")]);
    fetchMock.mockResolvedValueOnce(Response.json({ content: "not a valid blob response" }));
    expect((await POST(request())).status).toBe(502);
  });

  it("rejects a truncated tree before fetching contents or scoring", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const score = vi.spyOn(ScoringEngine, "run");
    mockRepository([entry("README.md")], true);
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: expect.stringContaining("complete repository tree") });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(score).not.toHaveBeenCalled();
  });

  it("rejects an unexpected 304 tree without a cached report", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(metadata));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 304 }));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: expect.stringContaining("complete repository tree") });
  });

  it.each<GitHubErrorCode>(["unauthorized", "forbidden", "http_error", "network_error", "invalid_input", "invalid_response"])(
    "does not expose the message of typed GitHub errors (%s)", async (code) => {
      vi.spyOn(GitHubService, "getRepoData").mockRejectedValue(new GitHubApiError(code, "secret-token"));
      const response = await POST(request());
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ error: "Unable to retrieve repository data from GitHub." });
    },
  );

  it("returns a safe 500 for an unexpected scoring failure", async () => {
    mockRepository();
    vi.spyOn(ScoringEngine, "run").mockImplementation(() => { throw new Error("private implementation detail"); });
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Unable to complete the repository audit." });
  });
});

describe("POST /api/audit persistence", () => {
  function cachedReport() {
    return { ...ScoringEngine.run({ owner: "owner", repo: "repo", paths: new Set<string>() }), shareId: "share123" };
  }

  it("persists the complete scored report and GitHub ETag before responding", async () => {
    mockRepository([entry("README.md")]);
    fetchMock.mockResolvedValueOnce(blob(readmeContent));
    const response = await POST(request());
    const report = await response.json();
    const { shareId, ...scored } = report;
    expect(shareId).toBe("share123");
    expect(findCachedReport).toHaveBeenCalledWith("owner", "repo");
    expect(saveReport).toHaveBeenCalledWith(scored, '"tree-etag"');
  });

  it("returns the unchanged saved report on 304 without blobs, scoring, or writes", async () => {
    const report = cachedReport();
    vi.mocked(findCachedReport).mockResolvedValue({ report, etag: '"cached-etag"' });
    fetchMock.mockResolvedValueOnce(Response.json(metadata));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 304 }));
    const score = vi.spyOn(ScoringEngine, "run");
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(report);
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get("if-none-match")).toBe('"cached-etag"');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(score).not.toHaveBeenCalled();
    expect(saveReport).not.toHaveBeenCalled();
  });

  it("scores and saves a changed tree after conditional revalidation", async () => {
    vi.mocked(findCachedReport).mockResolvedValue({ report: cachedReport(), etag: '"old"' });
    mockRepository([entry("LICENSE")]);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ shareId: "share123", healthScore: 17 });
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get("if-none-match")).toBe('"old"');
    expect(saveReport).toHaveBeenCalledWith(expect.objectContaining({ healthScore: 17 }), '"tree-etag"');
  });

  it("returns a safe 500 if the cache lookup fails before GitHub", async () => {
    vi.mocked(findCachedReport).mockRejectedValue(new Error("private database URL"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Unable to complete the repository audit." });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(saveReport).not.toHaveBeenCalled();
  });

  it("returns a safe 500 if saving fails rather than reporting an unsaved success", async () => {
    mockRepository();
    vi.mocked(saveReport).mockRejectedValue(new Error("private database URL"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Unable to complete the repository audit." });
  });

  it("preserves saved reports when GitHub fails", async () => {
    vi.mocked(findCachedReport).mockResolvedValue({ report: cachedReport(), etag: '"old"' });
    fetchMock.mockResolvedValueOnce(Response.json({ message: "Not Found" }, { status: 404 }));
    expect((await POST(request())).status).toBe(404);
    expect(saveReport).not.toHaveBeenCalled();
  });

  it("preserves saved reports when the new tree is truncated", async () => {
    vi.mocked(findCachedReport).mockResolvedValue({ report: cachedReport(), etag: '"old"' });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockRepository([], true);
    expect((await POST(request())).status).toBe(502);
    expect(saveReport).not.toHaveBeenCalled();
  });
});
