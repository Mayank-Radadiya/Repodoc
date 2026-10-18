// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GitHubTreeResponse, TreeEntry } from "@/lib/types";
import * as client from "../client";
import { GitHubService } from "../service";

const fetchMock = vi.fn<typeof fetch>();
const metadata = { default_branch: "feature/docs", description: "Project description", topics: ["docs"] };
const treeResponse: GitHubTreeResponse = {
  sha: "tree-sha",
  url: "https://api.github.com/repos/owner/repo/git/trees/tree-sha",
  tree: [{ path: "README.md", mode: "100644", type: "blob", sha: "readme-sha" }],
  truncated: false,
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

describe("GitHubService.getRepoData", () => {
  it("fetches metadata followed by one recursive tree request and combines the results", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(metadata));
    fetchMock.mockResolvedValueOnce(Response.json(treeResponse, { headers: { ETag: '"new-etag"' } }));

    await expect(GitHubService.getRepoData("owner", "repo")).resolves.toEqual({
      defaultBranch: "feature/docs",
      description: "Project description",
      topics: ["docs"],
      tree: treeResponse.tree,
      treeSha: "tree-sha",
      etag: '"new-etag"',
      truncated: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.github.com/repos/owner/repo",
      "https://api.github.com/repos/owner/repo/git/trees/feature%2Fdocs?recursive=1",
    ]);
  });

  it("returns fresh metadata and null tree information on 304, retaining the cached ETag", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(metadata));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 304 }));

    await expect(GitHubService.getRepoData("owner", "repo", 'W/"cached"')).resolves.toEqual({
      defaultBranch: "feature/docs",
      description: "Project description",
      topics: ["docs"],
      tree: null,
      treeSha: null,
      etag: 'W/"cached"',
      truncated: null,
    });
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).has("if-none-match")).toBe(false);
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("if-none-match")).toBe('W/"cached"');
  });

  it("replaces a stale ETag when GitHub returns a changed tree", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(metadata));
    fetchMock.mockResolvedValueOnce(Response.json(treeResponse, { headers: { ETag: '"new"' } }));
    await expect(GitHubService.getRepoData("owner", "repo", '"old"')).resolves.toMatchObject({ etag: '"new"', tree: treeResponse.tree });
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("if-none-match")).toBe('"old"');
  });

  it("preserves an empty tree, null description, and empty topics when no ETag is returned", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ ...metadata, description: null, topics: [] }));
    fetchMock.mockResolvedValueOnce(Response.json({ ...treeResponse, tree: [] }));

    await expect(GitHubService.getRepoData("owner", "repo")).resolves.toStrictEqual({
      defaultBranch: metadata.default_branch,
      description: null,
      topics: [],
      tree: [],
      treeSha: treeResponse.sha,
      etag: "",
      truncated: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns normalized nested entries while preserving zero and absent sizes", async () => {
    const entries: TreeEntry[] = [
      { path: "docs", mode: "040000", type: "tree", sha: "docs-sha" },
      { path: "docs/Setup.md", mode: "100644", type: "blob", sha: "setup-sha", size: 0 },
      { path: "src/lib/client.ts", mode: "100644", type: "blob", sha: "client-sha", size: 128 },
    ];
    fetchMock.mockResolvedValueOnce(Response.json(metadata));
    fetchMock.mockResolvedValueOnce(Response.json({
      ...treeResponse,
      tree: entries.map((entry) => ({
        ...entry,
        url: `https://api.github.com/repos/owner/repo/git/objects/${entry.sha}`,
      })),
    }, { headers: { ETag: '"nested"' } }));

    await expect(GitHubService.getRepoData("owner", "repo")).resolves.toStrictEqual({
      defaultBranch: metadata.default_branch,
      description: metadata.description,
      topics: metadata.topics,
      tree: entries,
      treeSha: treeResponse.sha,
      etag: '"nested"',
      truncated: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refreshes changed metadata even when the tree is not modified", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(metadata));
    fetchMock.mockResolvedValueOnce(Response.json(treeResponse, { headers: { ETag: '"cached"' } }));
    const fresh = await GitHubService.getRepoData("owner", "repo");

    const updatedMetadata = { ...metadata, description: "Updated description", topics: ["updated"] };
    fetchMock.mockResolvedValueOnce(Response.json(updatedMetadata));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 304 }));

    await expect(GitHubService.getRepoData("owner", "repo", fresh.etag)).resolves.toStrictEqual({
      defaultBranch: metadata.default_branch,
      description: updatedMetadata.description,
      topics: updatedMetadata.topics,
      tree: null,
      treeSha: null,
      etag: fresh.etag,
      truncated: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("uses the environment token for both requests", async () => {
    vi.stubEnv("GITHUB_TOKEN", "environment-token");
    fetchMock.mockResolvedValueOnce(Response.json(metadata));
    fetchMock.mockResolvedValueOnce(Response.json(treeResponse));
    await GitHubService.getRepoData("owner", "repo");
    for (const [, options] of fetchMock.mock.calls) {
      expect(new Headers(options?.headers).get("authorization")).toBe("Bearer environment-token");
    }
  });

  it("propagates a metadata error without requesting a tree", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({}, { status: 404 }));
    await expect(GitHubService.getRepoData("owner", "repo")).rejects.toMatchObject({ code: "not_found", status: 404 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("propagates a tree error without retrying", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(metadata));
    fetchMock.mockResolvedValueOnce(Response.json({}, { status: 429 }));
    await expect(GitHubService.getRepoData("owner", "repo")).rejects.toMatchObject({ code: "rate_limited", status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("propagates truncation while preserving the partial tree", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(Response.json(metadata));
    fetchMock.mockResolvedValueOnce(Response.json({ ...treeResponse, truncated: true }));
    await expect(GitHubService.getRepoData("owner", "repo")).resolves.toMatchObject({ truncated: true, tree: treeResponse.tree });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("GitHubService client delegation", () => {
  it.each([undefined, 'W/"cached"'])("delegates the default branch and cached ETag (%s) to the client", async (cachedEtag) => {
    const repoMetadata: client.GitHubRepoMetadata = {
      defaultBranch: "release/docs",
      description: null,
      topics: [],
    };
    const metadataSpy = vi.spyOn(client, "fetchDefaultBranch").mockResolvedValue(repoMetadata);
    const treeSpy = vi.spyOn(client, "fetchRepoTree").mockResolvedValue({
      tree: treeResponse.tree,
      sha: treeResponse.sha,
      etag: '"new"',
      truncated: false,
      notModified: false,
    });

    await expect(GitHubService.getRepoData("owner", "repo", cachedEtag)).resolves.toStrictEqual({
      ...repoMetadata,
      tree: treeResponse.tree,
      treeSha: treeResponse.sha,
      etag: '"new"',
      truncated: false,
    });
    expect(metadataSpy).toHaveBeenCalledExactlyOnceWith("owner", "repo", undefined);
    expect(treeSpy).toHaveBeenCalledExactlyOnceWith("owner", "repo", "release/docs", cachedEtag, undefined);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards an explicit token to both metadata and tree clients", async () => {
    const repoMetadata: client.GitHubRepoMetadata = {
      defaultBranch: "release/docs",
      description: null,
      topics: [],
    };
    const metadataSpy = vi.spyOn(client, "fetchDefaultBranch").mockResolvedValue(repoMetadata);
    const treeSpy = vi.spyOn(client, "fetchRepoTree").mockResolvedValue({
      tree: treeResponse.tree,
      sha: treeResponse.sha,
      etag: '"new"',
      truncated: false,
      notModified: false,
    });

    await GitHubService.getRepoData("owner", "repo", undefined, "token-1");
    expect(metadataSpy).toHaveBeenCalledExactlyOnceWith("owner", "repo", "token-1");
    expect(treeSpy).toHaveBeenCalledExactlyOnceWith("owner", "repo", "release/docs", undefined, "token-1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates the original metadata error and skips the tree client", async () => {
    const error = new client.GitHubApiError("rate_limited", "Rate limited", {
      status: 403,
      retryAfterSeconds: 60,
      rateLimitResetAt: 1800000000,
    });
    const metadataSpy = vi.spyOn(client, "fetchDefaultBranch").mockRejectedValue(error);
    const treeSpy = vi.spyOn(client, "fetchRepoTree");

    await expect(GitHubService.getRepoData("owner", "repo")).rejects.toBe(error);
    expect(metadataSpy).toHaveBeenCalledExactlyOnceWith("owner", "repo", undefined);
    expect(treeSpy).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates the original tree error with rate-limit timing and no retries", async () => {
    const error = new client.GitHubApiError("rate_limited", "Rate limited", {
      status: 429,
      retryAfterSeconds: 30,
      rateLimitResetAt: 1800000000,
    });
    const metadataSpy = vi.spyOn(client, "fetchDefaultBranch").mockResolvedValue({
      defaultBranch: metadata.default_branch,
      description: metadata.description,
      topics: metadata.topics,
    });
    const treeSpy = vi.spyOn(client, "fetchRepoTree").mockRejectedValue(error);

    await expect(GitHubService.getRepoData("owner", "repo", '"cached"')).rejects.toBe(error);
    expect(metadataSpy).toHaveBeenCalledExactlyOnceWith("owner", "repo", undefined);
    expect(treeSpy).toHaveBeenCalledExactlyOnceWith("owner", "repo", metadata.default_branch, '"cached"', undefined);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("GitHubService.fetchFileContent", () => {
  it("delegates to fetchFileContent with owner, repo, sha, and optional token", async () => {
    const fetchSpy = vi.spyOn(client, "fetchFileContent").mockResolvedValue("# Content");

    const result = await GitHubService.fetchFileContent("owner", "repo", "sha-1", "token-1");
    expect(result).toBe("# Content");
    expect(fetchSpy).toHaveBeenCalledExactlyOnceWith("owner", "repo", "sha-1", "token-1");
  });

  it("propagates client errors unchanged", async () => {
    const error = new client.GitHubApiError("not_found", "Blob not found", { status: 404 });
    vi.spyOn(client, "fetchFileContent").mockRejectedValue(error);

    await expect(GitHubService.fetchFileContent("owner", "repo", "sha-1")).rejects.toBe(error);
  });
});

describe("GitHubService.getReadmeContent and fetchReadmeContent", () => {
  it("delegates to fetchReadmeContent and returns decoded content", async () => {
    const tree: TreeEntry[] = [
      { path: "README.md", mode: "100644", type: "blob", sha: "sha-1" },
    ];
    const readmeSpy = vi.spyOn(client, "fetchReadmeContent").mockResolvedValue("# Readme text");

    const result = await GitHubService.getReadmeContent("owner", "repo", tree, "token-1");
    expect(result).toBe("# Readme text");
    expect(readmeSpy).toHaveBeenCalledWith("owner", "repo", tree, "token-1");
  });

  it("returns null when no README is present in repository tree", async () => {
    const tree: TreeEntry[] = [
      { path: "index.js", mode: "100644", type: "blob", sha: "sha-2" },
    ];
    vi.spyOn(client, "fetchReadmeContent").mockResolvedValue(null);

    const result = await GitHubService.getReadmeContent("owner", "repo", tree);
    expect(result).toBeNull();
  });

  it("supports fetchReadmeContent alias method", async () => {
    const readmeSpy = vi.spyOn(client, "fetchReadmeContent").mockResolvedValue("Readme via alias");

    const result = await GitHubService.fetchReadmeContent("owner", "repo");
    expect(result).toBe("Readme via alias");
    expect(readmeSpy).toHaveBeenCalledWith("owner", "repo", undefined, undefined);
  });

  it("propagates errors from client.fetchReadmeContent unchanged", async () => {
    const error = new client.GitHubApiError("rate_limited", "Rate limit exceeded", { status: 403 });
    vi.spyOn(client, "fetchReadmeContent").mockRejectedValue(error);

    await expect(GitHubService.getReadmeContent("owner", "repo")).rejects.toBe(error);
  });
});

