// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GitHubTreeResponse, TreeEntry } from "@/lib/types";
import {
  fetchDefaultBranch,
  fetchFileContent,
  fetchReadmeContent,
  fetchRepoTree,
  findReadmeEntry,
  GitHubApiError,
  README_CANDIDATES,
} from "../client";

const fetchMock = vi.fn<typeof fetch>();
const entry: TreeEntry = {
  path: "README.md",
  mode: "100644",
  type: "blob",
  sha: "blob-sha",
  size: 32,
};
const metadata = { default_branch: "main", description: "A repository", topics: ["typescript"] };
const treeResponse: GitHubTreeResponse = {
  sha: "tree-sha",
  url: "https://api.github.com/repos/owner/repo/git/trees/tree-sha",
  tree: [entry],
  truncated: false,
};
const blobResponse = {
  sha: "blob-sha",
  node_id: "blob-node-id",
  size: 32,
  url: "https://api.github.com/repos/owner/repo/git/blobs/blob-sha",
  content: Buffer.from("# Repodoc\n\nAutomated repository health auditor.").toString("base64"),
  encoding: "base64",
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GITHUB_TOKEN", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("fetchDefaultBranch", () => {
  it("returns metadata using the GitHub repository endpoint", async () => {
    fetchMock.mockResolvedValue(Response.json(metadata));

    await expect(fetchDefaultBranch("owner", "repo")).resolves.toEqual({
      defaultBranch: "main",
      description: "A repository",
      topics: ["typescript"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://api.github.com/repos/owner/repo", {
      method: "GET",
      cache: "no-store",
      headers: expect.any(Headers),
    });
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("accept")).toBe("application/vnd.github+json");
    expect(headers.get("user-agent")).toBe("Repodoc");
    expect(headers.get("x-github-api-version")).toBe("2022-11-28");
    expect(headers.has("authorization")).toBe(false);
    expect(headers.has("if-none-match")).toBe(false);
  });

  it("preserves custom branches, null descriptions, and empty topics", async () => {
    fetchMock.mockResolvedValue(Response.json({ default_branch: "develop", description: null, topics: [] }));
    await expect(fetchDefaultBranch("owner", "repo")).resolves.toEqual({
      defaultBranch: "develop",
      description: null,
      topics: [],
    });
  });

  it.each([
    { token: undefined, environmentToken: "environment-token", expectedToken: "environment-token" },
    { token: "explicit-token", environmentToken: "environment-token", expectedToken: "explicit-token" },
    { token: "", environmentToken: "environment-token", expectedToken: null },
  ])("selects authentication for $token", async ({ token, environmentToken, expectedToken }) => {
    vi.stubEnv("GITHUB_TOKEN", environmentToken);
    fetchMock.mockResolvedValue(Response.json(metadata));
    await fetchDefaultBranch("owner", "repo", token);
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("authorization")).toBe(expectedToken ? `Bearer ${expectedToken}` : null);
  });

  it("encodes owner and repository path parameters", async () => {
    fetchMock.mockResolvedValue(Response.json(metadata));
    await fetchDefaultBranch("owner/name", "repo?#");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.github.com/repos/owner%2Fname/repo%3F%23");
  });

  it.each([
    null,
    [],
    {},
    { ...metadata, default_branch: " " },
    { ...metadata, default_branch: 1 },
    { ...metadata, description: undefined },
    { ...metadata, description: false },
    { ...metadata, topics: undefined },
    { ...metadata, topics: [1] },
  ])("rejects malformed repository metadata: %j", async (body) => {
    fetchMock.mockResolvedValue(Response.json(body));
    await expect(fetchDefaultBranch("owner", "repo")).rejects.toMatchObject({
      code: "invalid_response",
      status: 200,
    });
  });

  it("rejects private repositories with 404 to prevent private repo data exposure", async () => {
    fetchMock.mockResolvedValue(Response.json({ ...metadata, private: true }));
    await expect(fetchDefaultBranch("owner", "repo")).rejects.toMatchObject({
      code: "not_found",
      status: 404,
    });
  });

  it("rejects an unexpected 304 without parsing a body", async () => {
    const response = new Response(null, { status: 304 });
    const jsonSpy = vi.spyOn(response, "json");
    fetchMock.mockResolvedValue(response);
    await expect(fetchDefaultBranch("owner", "repo")).rejects.toMatchObject({ code: "invalid_response", status: 304 });
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it("retries on a 429 secondary rate limit with low Retry-After and succeeds on retry", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "You have exceeded a secondary rate limit." }), {
        status: 429,
        headers: { "Retry-After": "1", "content-type": "application/json" },
      }),
    );
    fetchMock.mockResolvedValueOnce(
      Response.json(metadata),
    );

    await expect(fetchDefaultBranch("owner", "repo")).resolves.toEqual({
      defaultBranch: "main",
      description: "A repository",
      topics: ["typescript"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("fetchRepoTree", () => {
  it("normalizes nested entries for a full SHA while preserving paths and optional sizes", async () => {
    const requestedSha = "a".repeat(40);
    const returnedSha = "b".repeat(40);
    const entries: TreeEntry[] = [
      { path: "src", mode: "040000", type: "tree", sha: "src-sha" },
      { path: "src/lib", mode: "040000", type: "tree", sha: "lib-sha" },
      { path: "src/lib/client.ts", mode: "100644", type: "blob", sha: "client-sha", size: 128 },
      { path: "docs/Setup Guide — 日本語.md", mode: "100644", type: "blob", sha: "docs-sha", size: 0 },
    ];
    fetchMock.mockResolvedValue(Response.json({
      ...treeResponse,
      sha: returnedSha,
      tree: entries.map((entry) => ({
        ...entry,
        url: `https://api.github.com/repos/owner/repo/git/objects/${entry.sha}`,
        apiOnlyField: "ignored",
      })),
    }, { headers: { ETag: '"nested-tree"' } }));

    await expect(fetchRepoTree("owner", "repo", requestedSha)).resolves.toStrictEqual({
      tree: entries,
      sha: returnedSha,
      etag: '"nested-tree"',
      truncated: false,
      notModified: false,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `https://api.github.com/repos/owner/repo/git/trees/${requestedSha}?recursive=1`,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns a recursive tree with its SHA and unchanged weak ETag", async () => {
    fetchMock.mockResolvedValue(Response.json(treeResponse, { headers: { ETag: 'W/"tree-etag"' } }));
    await expect(fetchRepoTree("owner", "repo", "main")).resolves.toEqual({
      tree: [entry],
      sha: "tree-sha",
      etag: 'W/"tree-etag"',
      truncated: false,
      notModified: false,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.github.com/repos/owner/repo/git/trees/main?recursive=1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("encodes branches containing slashes and forwards ETag and explicit authentication", async () => {
    fetchMock.mockResolvedValue(Response.json(treeResponse));
    await fetchRepoTree("owner", "repo", "feature/docs#1", 'W/"cached"', "explicit-token");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.github.com/repos/owner/repo/git/trees/feature%2Fdocs%231?recursive=1");
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("if-none-match")).toBe('W/"cached"');
    expect(headers.get("authorization")).toBe("Bearer explicit-token");
    expect(fetchMock.mock.calls[0]?.[1]?.cache).toBe("no-store");
  });

  it("returns only notModified on 304 and does not read the body", async () => {
    const response = new Response(null, { status: 304 });
    const jsonSpy = vi.spyOn(response, "json");
    fetchMock.mockResolvedValue(response);
    await expect(fetchRepoTree("owner", "repo", "main", '"cached"')).resolves.toEqual({ notModified: true });
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it("returns an empty tree when the response has no entries", async () => {
    fetchMock.mockResolvedValue(Response.json({ ...treeResponse, tree: [] }));
    await expect(fetchRepoTree("owner", "repo", "main")).resolves.toMatchObject({ tree: [], notModified: false });
  });

  it("warns once for a truncated tree and does not make fallback requests", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockResolvedValue(Response.json({ ...treeResponse, truncated: true }));
    await expect(fetchRepoTree("owner", "repo", "main")).resolves.toMatchObject({ tree: [entry], truncated: true });
    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("truncated"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses an empty ETag when absent and omits an empty conditional header", async () => {
    fetchMock.mockResolvedValue(Response.json(treeResponse));
    await expect(fetchRepoTree("owner", "repo", "main", "")).resolves.toMatchObject({ etag: "" });
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).has("if-none-match")).toBe(false);
  });

  it("accepts all supported Git entry types, including entries without size", async () => {
    const entries: TreeEntry[] = [
      entry,
      { path: "script", mode: "100755", type: "blob", sha: "script-sha" },
      { path: "src", mode: "040000", type: "tree", sha: "directory-sha" },
      { path: "module", mode: "160000", type: "commit", sha: "commit-sha" },
      { path: "link", mode: "120000", type: "blob", sha: "link-sha" },
    ];
    fetchMock.mockResolvedValue(Response.json({ ...treeResponse, tree: entries }));
    await expect(fetchRepoTree("owner", "repo", "main")).resolves.toStrictEqual({
      tree: entries,
      sha: treeResponse.sha,
      etag: "",
      truncated: false,
      notModified: false,
    });
  });

  it.each([
    { sha: "f".repeat(40), status: 404, code: "not_found" },
    { sha: "invalid-reference", status: 422, code: "http_error" },
  ])("rejects a missing or invalid tree reference with HTTP $status", async ({ sha, status, code }) => {
    fetchMock.mockResolvedValue(Response.json({ message: "Invalid tree reference" }, { status }));
    const result = fetchRepoTree("owner", "repo", sha);
    await expect(result).rejects.toBeInstanceOf(GitHubApiError);
    await expect(result).rejects.toMatchObject({ code, status });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `https://api.github.com/repos/owner/repo/git/trees/${sha}?recursive=1`,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    null,
    {},
    { ...treeResponse, sha: "" },
    { ...treeResponse, url: undefined },
    { ...treeResponse, truncated: "false" },
    { ...treeResponse, tree: {} },
    { ...treeResponse, tree: [null] },
    { ...treeResponse, tree: [entry, { ...entry, path: "" }] },
    { ...treeResponse, tree: [{ ...entry, sha: 1 }] },
    { ...treeResponse, tree: [{ ...entry, mode: "unknown" }] },
    { ...treeResponse, tree: [{ ...entry, type: "unknown" }] },
    { ...treeResponse, tree: [{ ...entry, size: -1 }] },
    { ...treeResponse, tree: [{ ...entry, size: 1.5 }] },
    { ...treeResponse, tree: [{ ...entry, size: "32" }] },
    { ...treeResponse, tree: [{ ...entry, url: 1 }] },
  ])("rejects malformed tree responses: %j", async (body) => {
    fetchMock.mockResolvedValue(Response.json(body));
    await expect(fetchRepoTree("owner", "repo", "main")).rejects.toMatchObject({ code: "invalid_response", status: 200 });
  });
});

describe.each([
  { endpoint: "metadata", request: () => fetchDefaultBranch("owner", "repo") },
  { endpoint: "tree", request: () => fetchRepoTree("owner", "repo", "main") },
  { endpoint: "blob", request: () => fetchFileContent("owner", "repo", "blob-sha") },
])("$endpoint error handling", ({ request }) => {
  it.each([
    { status: 404, code: "not_found" },
    { status: 401, code: "unauthorized" },
    { status: 403, code: "forbidden" },
    { status: 409, code: "http_error" },
    { status: 422, code: "http_error" },
    { status: 500, code: "http_error" },
    { status: 429, code: "rate_limited" },
  ])("throws a typed $code error for HTTP $status", async ({ status, code }) => {
    fetchMock.mockResolvedValue(Response.json({ message: "Request failed" }, { status }));
    const result = request();
    await expect(result).rejects.toBeInstanceOf(GitHubApiError);
    await expect(result).rejects.toMatchObject({ code, status });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("identifies primary rate limits and preserves retry timing", async () => {
    fetchMock.mockResolvedValue(Response.json({ message: "Forbidden" }, {
      status: 403,
      headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "1800000000", "Retry-After": "60" },
    }));
    await expect(request()).rejects.toMatchObject({
      code: "rate_limited",
      status: 403,
      retryAfterSeconds: 60,
      rateLimitResetAt: 1800000000,
    });
  });

  it.each(["API rate limit exceeded", "You have exceeded a secondary rate limit", "Abuse detection mechanism triggered"])(
    "identifies rate limits from GitHub's message: %s", async (message) => {
      fetchMock.mockResolvedValue(Response.json({ message }, { status: 403 }));
      await expect(request()).rejects.toMatchObject({ code: "rate_limited", status: 403 });
    },
  );

  it("identifies a rate limit from Retry-After even without JSON", async () => {
    fetchMock.mockResolvedValue(new Response("not json", { status: 403, headers: { "Retry-After": "30" } }));
    await expect(request()).rejects.toMatchObject({ code: "rate_limited", retryAfterSeconds: 30 });
  });

  it.each(["", "invalid", "-1", "Infinity"])("ignores invalid timing headers: %s", async (value) => {
    fetchMock.mockResolvedValue(Response.json({}, { status: 429, headers: { "Retry-After": value, "X-RateLimit-Reset": value } }));
    await expect(request()).rejects.toMatchObject({ code: "rate_limited", retryAfterSeconds: undefined, rateLimitResetAt: undefined });
  });

  it("retains the HTTP error when the error body is malformed", async () => {
    fetchMock.mockResolvedValue(new Response("not json", { status: 404 }));
    await expect(request()).rejects.toMatchObject({ code: "not_found", status: 404 });
  });

  it("rejects invalid JSON in a successful response", async () => {
    fetchMock.mockResolvedValue(new Response("not json", { status: 200 }));
    await expect(request()).rejects.toMatchObject({ code: "invalid_response", status: 200 });
  });

  it("does not expose raw API errors that may contain credentials", async () => {
    fetchMock.mockResolvedValue(Response.json({ message: "secret-token" }, { status: 500 }));
    await expect(request()).rejects.toMatchObject({ message: "GitHub API request failed with HTTP 500." });
  });

  it("reports network failures without leaking transport messages or retrying", async () => {
    fetchMock.mockRejectedValue(new Error("secret-token"));
    await expect(request()).rejects.toMatchObject({ code: "network_error", status: undefined, message: "Unable to reach the GitHub API." });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("invalid request input", () => {
  it.each([
    { owner: "", repo: "repo", sha: "main" },
    { owner: "owner", repo: " ", sha: "main" },
    { owner: "owner", repo: "repo", sha: "" },
    { owner: "owner", repo: "repo", sha: " \t\n" },
    { owner: "owner", repo: "repo", sha: "\ud800" },
    { owner: "\ud800", repo: "repo", sha: "main" },
  ])("rejects invalid tree path parameters before fetching: %j", async ({ owner, repo, sha }) => {
    await expect(fetchRepoTree(owner, repo, sha)).rejects.toMatchObject({ code: "invalid_input" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { owner: "", repo: "repo", sha: "blob-sha" },
    { owner: "owner", repo: " ", sha: "blob-sha" },
    { owner: "owner", repo: "repo", sha: "" },
    { owner: "owner", repo: "repo", sha: "   " },
    { owner: "owner", repo: "repo", sha: "\ud800" },
    { owner: "\ud800", repo: "repo", sha: "blob-sha" },
  ])("rejects invalid blob path parameters before fetching: %j", async ({ owner, repo, sha }) => {
    await expect(fetchFileContent(owner, repo, sha)).rejects.toMatchObject({ code: "invalid_input" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invalid metadata path parameters before fetching", async () => {
    await expect(fetchDefaultBranch("owner", " ")).rejects.toMatchObject({ code: "invalid_input" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invalid token headers without exposing their values", async () => {
    await expect(fetchDefaultBranch("owner", "repo", "secret\ntoken")).rejects.toMatchObject({
      code: "invalid_input",
      message: "GitHub request headers contain invalid values.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invalid blob token headers without exposing their values", async () => {
    await expect(fetchFileContent("owner", "repo", "blob-sha", "secret\ntoken")).rejects.toMatchObject({
      code: "invalid_input",
      message: "GitHub request headers contain invalid values.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invalid ETag headers before fetching", async () => {
    await expect(fetchRepoTree("owner", "repo", "main", '"etag\nvalue"')).rejects.toMatchObject({ code: "invalid_input" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("fetchFileContent", () => {
  it("returns decoded UTF-8 text using the GitHub git blobs endpoint", async () => {
    fetchMock.mockResolvedValue(Response.json(blobResponse));

    await expect(fetchFileContent("owner", "repo", "blob-sha")).resolves.toBe(
      "# Repodoc\n\nAutomated repository health auditor.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://api.github.com/repos/owner/repo/git/blobs/blob-sha", {
      method: "GET",
      cache: "no-store",
      headers: expect.any(Headers),
    });
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("accept")).toBe("application/vnd.github+json");
    expect(headers.get("user-agent")).toBe("Repodoc");
    expect(headers.get("x-github-api-version")).toBe("2022-11-28");
    expect(headers.has("authorization")).toBe(false);
  });

  it("decodes multi-byte UTF-8 Unicode characters and emojis accurately", async () => {
    const unicodeText = "## ドキュメント 🚀 — Overview\n\n日本語と絵文字のテスト ✨";
    fetchMock.mockResolvedValue(
      Response.json({
        ...blobResponse,
        content: Buffer.from(unicodeText, "utf-8").toString("base64"),
      }),
    );

    await expect(fetchFileContent("owner", "repo", "blob-sha")).resolves.toBe(unicodeText);
  });

  it("decodes multi-line base64 payloads wrapped with newlines", async () => {
    const text = "A".repeat(200);
    const b64 = Buffer.from(text, "utf-8").toString("base64");
    const multilineB64 = b64.match(/.{1,40}/g)?.join("\n") ?? b64;
    fetchMock.mockResolvedValue(
      Response.json({
        ...blobResponse,
        content: multilineB64,
      }),
    );

    await expect(fetchFileContent("owner", "repo", "blob-sha")).resolves.toBe(text);
  });

  it("handles empty blob files returning empty string", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        sha: "empty-sha",
        size: 0,
        content: "",
        encoding: "base64",
      }),
    );

    await expect(fetchFileContent("owner", "repo", "empty-sha")).resolves.toBe("");
  });

  it.each([
    { token: undefined, environmentToken: "env-token", expectedToken: "env-token" },
    { token: "explicit-token", environmentToken: "env-token", expectedToken: "explicit-token" },
    { token: "", environmentToken: "env-token", expectedToken: null },
  ])("selects authentication for blob fetching: token=$token", async ({ token, environmentToken, expectedToken }) => {
    vi.stubEnv("GITHUB_TOKEN", environmentToken);
    fetchMock.mockResolvedValue(Response.json(blobResponse));
    await fetchFileContent("owner", "repo", "blob-sha", token);
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("authorization")).toBe(expectedToken ? `Bearer ${expectedToken}` : null);
  });

  it("encodes owner, repository, and sha path parameters", async () => {
    fetchMock.mockResolvedValue(Response.json(blobResponse));
    await fetchFileContent("owner/name", "repo?#", "blob/ref#1");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.github.com/repos/owner%2Fname/repo%3F%23/git/blobs/blob%2Fref%231",
    );
  });

  it.each([
    null,
    [],
    {},
    { ...blobResponse, sha: "" },
    { ...blobResponse, content: 123 },
    { ...blobResponse, encoding: undefined },
    { ...blobResponse, encoding: "utf-8" },
    { ...blobResponse, encoding: "binary" },
    { ...blobResponse, size: -1 },
    { ...blobResponse, size: 2.5 },
    { ...blobResponse, size: "32" },
  ])("rejects malformed blob responses: %j", async (body) => {
    fetchMock.mockResolvedValue(Response.json(body));
    await expect(fetchFileContent("owner", "repo", "blob-sha")).rejects.toMatchObject({
      code: "invalid_response",
      status: 200,
    });
  });

  it("rejects an unexpected 304 without parsing a body", async () => {
    const response = new Response(null, { status: 304 });
    const jsonSpy = vi.spyOn(response, "json");
    fetchMock.mockResolvedValue(response);
    await expect(fetchFileContent("owner", "repo", "blob-sha")).rejects.toMatchObject({
      code: "invalid_response",
      status: 304,
    });
    expect(jsonSpy).not.toHaveBeenCalled();
  });
});

describe("findReadmeEntry", () => {
  it("exports the complete list of 18 README candidates", () => {
    expect(README_CANDIDATES).toHaveLength(18);
    expect(README_CANDIDATES).toContain("README.md");
  });

  it("finds root README.md when present", () => {
    const tree: TreeEntry[] = [
      { path: "src/index.ts", mode: "100644", type: "blob", sha: "code-sha" },
      { path: "README.md", mode: "100644", type: "blob", sha: "readme-sha" },
    ];
    expect(findReadmeEntry(tree)).toEqual({
      path: "README.md",
      mode: "100644",
      type: "blob",
      sha: "readme-sha",
    });
  });

  it.each(["readme.md", "Readme.md", "README.MD"])(
    "finds README.md with case-insensitivity: %s",
    (casedPath) => {
      const tree: TreeEntry[] = [
        { path: casedPath, mode: "100644", type: "blob", sha: "case-sha" },
      ];
      expect(findReadmeEntry(tree)).toEqual({
        path: casedPath,
        mode: "100644",
        type: "blob",
        sha: "case-sha",
      });
    },
  );

  it.each([
    "README",
    "README.markdown",
    "README.rst",
    "README.txt",
    "README.adoc",
    ".github/README.md",
    ".github/README",
    ".github/README.markdown",
    ".github/README.rst",
    ".github/README.txt",
    ".github/README.adoc",
    "docs/README.md",
    "docs/README",
    "docs/README.markdown",
    "docs/README.rst",
    "docs/README.txt",
    "docs/README.adoc",
  ])("discovers supported candidate README file: %s", (candidatePath) => {
    const tree: TreeEntry[] = [
      { path: "src/lib.rs", mode: "100644", type: "blob", sha: "code-sha" },
      { path: candidatePath, mode: "100644", type: "blob", sha: "candidate-sha" },
    ];
    expect(findReadmeEntry(tree)).toMatchObject({
      path: candidatePath,
      sha: "candidate-sha",
    });
  });

  it("prioritizes root README over nested .github/ or docs/ locations", () => {
    const tree: TreeEntry[] = [
      { path: "docs/README.md", mode: "100644", type: "blob", sha: "docs-sha" },
      { path: ".github/README.md", mode: "100644", type: "blob", sha: "github-sha" },
      { path: "README.md", mode: "100644", type: "blob", sha: "root-sha" },
    ];
    expect(findReadmeEntry(tree)).toMatchObject({
      path: "README.md",
      sha: "root-sha",
    });
  });

  it("prioritizes README.md over extensionless README and other formats at root", () => {
    const tree: TreeEntry[] = [
      { path: "README.txt", mode: "100644", type: "blob", sha: "txt-sha" },
      { path: "README", mode: "100644", type: "blob", sha: "noext-sha" },
      { path: "README.md", mode: "100644", type: "blob", sha: "md-sha" },
    ];
    expect(findReadmeEntry(tree)).toMatchObject({
      path: "README.md",
      sha: "md-sha",
    });
  });

  it("ignores directory (tree) entries named README.md", () => {
    const tree: TreeEntry[] = [
      { path: "README.md", mode: "040000", type: "tree", sha: "dir-sha" },
      { path: "docs/README.md", mode: "100644", type: "blob", sha: "blob-sha" },
    ];
    expect(findReadmeEntry(tree)).toMatchObject({
      path: "docs/README.md",
      sha: "blob-sha",
    });
  });

  it("ignores submodule/commit entries named README", () => {
    const tree: TreeEntry[] = [
      { path: "README.md", mode: "160000", type: "commit", sha: "commit-sha" },
    ];
    expect(findReadmeEntry(tree)).toBeNull();
  });

  it("returns null for empty tree or tree with no README candidates", () => {
    expect(findReadmeEntry([])).toBeNull();
    const tree: TreeEntry[] = [
      { path: "package.json", mode: "100644", type: "blob", sha: "pkg-sha" },
      { path: "src/index.ts", mode: "100644", type: "blob", sha: "src-sha" },
    ];
    expect(findReadmeEntry(tree)).toBeNull();
  });
});

describe("fetchReadmeContent", () => {
  it("fetches decoded README content when given a tree with README.md", async () => {
    fetchMock.mockResolvedValue(Response.json(blobResponse));
    const tree: TreeEntry[] = [
      { path: "src/main.go", mode: "100644", type: "blob", sha: "go-sha" },
      { path: "README.md", mode: "100644", type: "blob", sha: "blob-sha" },
    ];

    const content = await fetchReadmeContent("owner", "repo", tree);
    expect(content).toBe("# Repodoc\n\nAutomated repository health auditor.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.github.com/repos/owner/repo/git/blobs/blob-sha");
  });

  it("fetches nested or alternative README formats when present in tree", async () => {
    const customBlob = {
      ...blobResponse,
      sha: "nested-sha",
      content: Buffer.from("Nested README documentation").toString("base64"),
    };
    fetchMock.mockResolvedValue(Response.json(customBlob));
    const tree: TreeEntry[] = [
      { path: ".github/README.md", mode: "100644", type: "blob", sha: "nested-sha" },
    ];

    const content = await fetchReadmeContent("owner", "repo", tree);
    expect(content).toBe("Nested README documentation");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when given a tree with no README without making API calls", async () => {
    const tree: TreeEntry[] = [
      { path: "index.js", mode: "100644", type: "blob", sha: "js-sha" },
    ];

    const content = await fetchReadmeContent("owner", "repo", tree);
    expect(content).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches blob content directly when passed a SHA string", async () => {
    fetchMock.mockResolvedValue(Response.json(blobResponse));

    const content = await fetchReadmeContent("owner", "repo", "blob-sha");
    expect(content).toBe("# Repodoc\n\nAutomated repository health auditor.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("discovers default branch and tree when called without a tree parameter", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(metadata));
    fetchMock.mockResolvedValueOnce(Response.json(treeResponse));
    fetchMock.mockResolvedValueOnce(Response.json(blobResponse));

    const content = await fetchReadmeContent("owner", "repo");
    expect(content).toBe("# Repodoc\n\nAutomated repository health auditor.");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.github.com/repos/owner/repo");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.github.com/repos/owner/repo/git/trees/main?recursive=1");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("https://api.github.com/repos/owner/repo/git/blobs/blob-sha");
  });

  it("returns null when repo-level tree has no README", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(metadata));
    fetchMock.mockResolvedValueOnce(
      Response.json({
        ...treeResponse,
        tree: [{ path: "LICENSE", mode: "100644", type: "blob", sha: "lic-sha" }],
      }),
    );

    const content = await fetchReadmeContent("owner", "repo");
    expect(content).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("propagates API errors without masking them as missing README", async () => {
    const tree: TreeEntry[] = [
      { path: "README.md", mode: "100644", type: "blob", sha: "blob-sha" },
    ];
    fetchMock.mockResolvedValue(
      Response.json({ message: "API rate limit exceeded" }, { status: 403 }),
    );

    await expect(fetchReadmeContent("owner", "repo", tree)).rejects.toMatchObject({
      code: "rate_limited",
      status: 403,
    });
  });

  it("propagates repository not found errors when called without a tree", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ message: "Not Found" }, { status: 404 }),
    );

    await expect(fetchReadmeContent("owner", "nonexistent-repo")).rejects.toMatchObject({
      code: "not_found",
      status: 404,
    });
  });

  it.each([
    { owner: "", repo: "repo" },
    { owner: "owner", repo: " " },
    { owner: "\ud800", repo: "repo" },
    { owner: "owner", repo: "\ud800" },
  ])("rejects invalid path parameters in fetchReadmeContent before fetching: %j", async ({ owner, repo }) => {
    await expect(fetchReadmeContent(owner, repo)).rejects.toMatchObject({ code: "invalid_input" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates rate-limit errors when discovering default branch without tree", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ message: "API rate limit exceeded" }, {
        status: 403,
        headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "1800000000", "Retry-After": "60" },
      }),
    );

    await expect(fetchReadmeContent("owner", "repo")).rejects.toMatchObject({
      code: "rate_limited",
      status: 403,
      retryAfterSeconds: 60,
      rateLimitResetAt: 1800000000,
    });
  });

  it("propagates network errors when fetching README blob content", async () => {
    const tree: TreeEntry[] = [
      { path: "README.md", mode: "100644", type: "blob", sha: "blob-sha" },
    ];
    fetchMock.mockRejectedValue(new Error("Network failed"));

    await expect(fetchReadmeContent("owner", "repo", tree)).rejects.toMatchObject({
      code: "network_error",
      message: "Unable to reach the GitHub API.",
    });
  });
});

