// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubApiError } from "@/src/lib/github/client";
import { createBlob, createCommit, createOrUpdateBranch, createTree, openPullRequest, type TreeBlob } from "../git-api";

const fetchMock = vi.fn<typeof fetch>();
const sha = "3a0f86fb8db8eea7ccbb9a95f325ddbedfb25e15";
const blobResponse = { sha, url: `https://api.github.com/repos/owner/repo/git/blobs/${sha}` };

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GITHUB_TOKEN", "environment-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("openPullRequest", () => {
  const head = "repodoc/health-remediation";
  const base = "main";
  const pullUrl = "https://github.com/owner/repo/pull/42";
  const apiUrl = "https://api.github.com/repos/owner/repo";
  const comparison = { files: [
    { filename: "LICENSE", status: "added" },
    { filename: ".github/workflows/ci.yml", status: "added" },
    { filename: "README.md", status: "modified" },
    { filename: "old.txt", status: "removed" },
    { filename: "renamed.txt", status: "renamed" },
  ] };
  const existingPull = {
    state: "open", html_url: pullUrl, head: { label: `owner:${head}` }, base: { ref: base },
  };
  const duplicate = () => Response.json({ message: "Pull request already exists" }, { status: 422 });
  const compare = () => fetchMock.mockResolvedValueOnce(Response.json(comparison));
  const open = () => openPullRequest("owner", "repo", head, base, " caller-token ");

  it("compares branches and creates a PR with the required title and sorted added-file summary", async () => {
    compare();
    fetchMock.mockResolvedValueOnce(Response.json({ html_url: pullUrl }, { status: 201 }));
    await expect(open()).resolves.toBe(pullUrl);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const comparisonUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(decodeURIComponent(comparisonUrl.pathname)).toBe(`/repos/owner/repo/compare/${base}...${head}`);
    expect(comparisonUrl.searchParams.get("page")).toBe("1");
    expect(comparisonUrl.searchParams.get("per_page")).toBe("1");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${apiUrl}/pulls`, expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        head, base, title: "chore(repodoc): resolve repository health audit findings",
        body: "## Repository health remediation\n\n### Files added\n\n- &#46;github/workflows/ci&#46;yml\n- LICENSE",
      }),
    }));
    for (const [, options] of fetchMock.mock.calls) {
      expect(options?.cache).toBe("no-store");
      const headers = new Headers(options?.headers);
      expect(headers.get("authorization")).toBe("Bearer caller-token");
      expect(headers.get("accept")).toBe("application/vnd.github+json");
      expect(headers.get("user-agent")).toBe("Repodoc");
      expect(headers.get("x-github-api-version")).toBe("2022-11-28");
    }
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("content-type"))
      .toBe("application/json; charset=utf-8");
  });

  it.each([[], [{ filename: "README.md", status: "modified" }]].map((files) => ({ files })))(
    "explicitly describes comparisons without added files: %j", async ({ files }) => {
      fetchMock.mockResolvedValueOnce(Response.json({ files }));
      fetchMock.mockResolvedValueOnce(Response.json({ html_url: pullUrl }, { status: 201 }));
      await open();
      expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)).body).toContain("No added files.");
    },
  );

  it("escapes Markdown, HTML, and line breaks while preserving Unicode filenames", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ files: [
      { filename: "docs/日本語.md", status: "added" },
      { filename: "[x](url)<img>&`*\n# heading\r.txt", status: "added" },
    ] }));
    fetchMock.mockResolvedValueOnce(Response.json({ html_url: pullUrl }, { status: 201 }));
    await open();
    const body = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)).body;
    expect(body).toContain("docs/日本語&#46;md");
    expect(body).toContain("&#91;x&#93;&#40;url&#41;&#60;img&#62;&#38;&#96;&#42;&#10;&#35; heading&#13;&#46;txt");
    expect(body).not.toContain("<img>");
    expect(body).not.toContain("\n# heading");
  });

  it("encodes owner, repository, and branch path parameters", async () => {
    compare();
    fetchMock.mockResolvedValueOnce(Response.json({ html_url: pullUrl }, { status: 201 }));
    await openPullRequest("owner/name", "repo?#", "feature/日本語", "release/v1", "caller-token");
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/repos/owner%2Fname/repo%3F%23/compare/release%2Fv1...feature%2F%E6%97%A5%E6%9C%AC%E8%AA%9E");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.github.com/repos/owner%2Fname/repo%3F%23/pulls");
  });

  it.each(["owner", "repo", "head", "base"] as const)("validates %s before fetching", async (field) => {
    for (const invalid of [undefined, null, 123, "", " \t\n", "\ud800"]) {
      const args: Record<"owner" | "repo" | "head" | "base", unknown> = {
        owner: "owner", repo: "repo", head, base, [field]: invalid,
      };
      // @ts-expect-error Deliberately exercise invalid runtime inputs.
      await expect(openPullRequest(args.owner, args.repo, args.head, args.base, "caller-token"))
        .rejects.toMatchObject({ code: "invalid_input" });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 123, "", " \t\n", "secret\ntoken"])(
    "rejects invalid explicit tokens despite GITHUB_TOKEN: %j", async (token) => {
      // @ts-expect-error Deliberately exercise invalid runtime inputs.
      await expect(openPullRequest("owner", "repo", head, base, token))
        .rejects.toMatchObject({ code: "invalid_input" });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    null, [], {}, "invalid", { files: null }, { files: {} },
    { files: [null] }, { files: [[]] }, { files: [{}] },
    { files: [{ filename: "", status: "added" }] },
    { files: [{ filename: 123, status: "added" }] },
    { files: [{ filename: "LICENSE", status: null }] },
    { files: [{ filename: "LICENSE", status: " " }] },
  ].map((body) => ({ body })))("rejects malformed comparisons without creating a PR: %j", async ({ body }) => {
    fetchMock.mockResolvedValueOnce(Response.json(body));
    await expect(open()).rejects.toMatchObject({ code: "invalid_response", status: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([299, 300, 301])("handles GitHub's file-list limit at %i files", async (length) => {
    fetchMock.mockResolvedValueOnce(Response.json({ files: Array.from({ length }, (_, index) => ({
      filename: `file-${index}`, status: "added",
    })) }));
    if (length < 300) {
      fetchMock.mockResolvedValueOnce(Response.json({ html_url: pullUrl }, { status: 201 }));
      await expect(open()).resolves.toBe(pullUrl);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } else {
      await expect(open()).rejects.toMatchObject({ code: "invalid_response", status: 200 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it.each([head, `forker:${head}`])("returns the matching existing PR for head %s after 422", async (inputHead) => {
    compare();
    fetchMock.mockResolvedValueOnce(duplicate());
    const label = inputHead.includes(":") ? inputHead : `owner:${head}`;
    fetchMock.mockResolvedValueOnce(Response.json([{ ...existingPull, head: { label } }]));
    await expect(openPullRequest("owner", "repo", inputHead, base, "caller-token")).resolves.toBe(pullUrl);
    const url = new URL(String(fetchMock.mock.calls[2]?.[0]));
    expect(url.pathname).toBe("/repos/owner/repo/pulls");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      state: "open", head: label, base, per_page: "100", page: "1",
    });
    expect(fetchMock.mock.calls.map(([, options]) => options?.method)).toEqual(["GET", "POST", "GET"]);
    const payload = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(payload.head).toBe(inputHead);
    expect(decodeURIComponent(new URL(String(fetchMock.mock.calls[0]?.[0])).pathname))
      .toBe(`/repos/owner/repo/compare/${inputHead.includes(":") ? `owner:${base}` : base}...${inputHead}`);
    expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).get("authorization")).toBe("Bearer caller-token");
  });

  it.each([
    [],
    [{ ...existingPull, state: "closed" }],
    [{ ...existingPull, head: { label: `someone-else:${head}` } }],
    [{ ...existingPull, head: { label: `owner:${head.toUpperCase()}` } }],
    [{ ...existingPull, base: { ref: "develop" } }],
    [{ ...existingPull, head: null }],
    [{ ...existingPull, base: null }],
  ].map((pulls) => ({ pulls })))("preserves the original 422 when no open PR matches: %j", async ({ pulls }) => {
    compare();
    fetchMock.mockResolvedValueOnce(duplicate());
    fetchMock.mockResolvedValueOnce(Response.json(pulls));
    await expect(open()).rejects.toMatchObject({
      code: "http_error", status: 422, message: "GitHub API request failed with HTTP 422.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("searches later pages without selecting unrelated pull requests", async () => {
    compare();
    fetchMock.mockResolvedValueOnce(duplicate());
    fetchMock.mockResolvedValueOnce(Response.json(Array.from({ length: 100 }, () => ({
      ...existingPull, base: { ref: "develop" },
    }))));
    fetchMock.mockResolvedValueOnce(Response.json([existingPull]));
    await expect(open()).resolves.toBe(pullUrl);
    expect(new URL(String(fetchMock.mock.calls[3]?.[0])).searchParams.get("page")).toBe("2");
  });

  it("matches owner names case-insensitively while preserving branch casing", async () => {
    compare();
    fetchMock.mockResolvedValueOnce(duplicate());
    fetchMock.mockResolvedValueOnce(Response.json([{ ...existingPull, head: { label: `OwNeR:${head}` } }]));
    await expect(open()).resolves.toBe(pullUrl);
  });

  it.each([null, {}, "invalid", [null], [[]]].map((body) => ({ body })))("rejects malformed PR lookup responses: %j", async ({ body }) => {
    compare();
    fetchMock.mockResolvedValueOnce(duplicate());
    fetchMock.mockResolvedValueOnce(Response.json(body));
    await expect(open()).rejects.toMatchObject({ code: "invalid_response", status: 200 });
  });

  describe.each([false, true])("returned URL validation (existing: %s)", (exists) => {
    it.each([
      undefined, null, 123, "", " ", "not a URL", "javascript:alert(1)",
      "http://github.com/owner/repo/pull/42", "https://evil.test/owner/repo/pull/42",
      "https://github.com.evil.test/owner/repo/pull/42", "https://api.github.com/repos/owner/repo/pulls/42",
      "https://github.com/owner/repo/pull/0", "https://github.com/owner/repo/issues/42",
      "https://github.com/owner/repo/pull/42\n",
    ])("rejects invalid PR URLs: %j", async (html_url) => {
      compare();
      if (exists) fetchMock.mockResolvedValueOnce(duplicate());
      fetchMock.mockResolvedValueOnce(Response.json(exists
        ? [{ ...existingPull, html_url }]
        : { html_url }, { status: exists ? 200 : 201 }));
      await expect(open()).rejects.toMatchObject({ code: "invalid_response", status: exists ? 200 : 201 });
    });
  });

  describe.each(["compare", "create", "lookup"] as const)("errors during %s", (stage) => {
    beforeEach(() => {
      if (stage !== "compare") compare();
      if (stage === "lookup") fetchMock.mockResolvedValueOnce(duplicate());
    });
    const precedingCalls = stage === "compare" ? 0 : stage === "create" ? 1 : 2;

    it.each([
      { status: 401, code: "unauthorized" }, { status: 403, code: "forbidden" },
      { status: 404, code: "not_found" }, { status: 409, code: "http_error" },
      { status: 429, code: "rate_limited" }, { status: 500, code: "http_error" },
    ])("sanitizes HTTP $status without extra requests", async ({ status, code }) => {
      fetchMock.mockResolvedValueOnce(Response.json({ message: "private-data caller-token" }, { status }));
      const result = open();
      await expect(result).rejects.toBeInstanceOf(GitHubApiError);
      await expect(result).rejects.toMatchObject({ code, status });
      await expect(result).rejects.not.toHaveProperty("message", expect.stringContaining("caller-token"));
      await expect(result).rejects.not.toHaveProperty("message", expect.stringContaining("private-data"));
      expect(fetchMock).toHaveBeenCalledTimes(precedingCalls + 1);
    });

    it.each([403, 429])("preserves HTTP %i rate-limit metadata", async (status) => {
      fetchMock.mockResolvedValueOnce(Response.json({ message: "API rate limit exceeded" }, {
        status, headers: { "retry-after": "60", "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1800000000" },
      }));
      await expect(open()).rejects.toMatchObject({
        code: "rate_limited", status, retryAfterSeconds: 60, rateLimitResetAt: 1800000000,
      });
      expect(fetchMock).toHaveBeenCalledTimes(precedingCalls + 1);
    });

    it.each([false, true])("bounds retries and preserves request payloads (success: %s)", async (succeeds) => {
      const limited = () => Response.json({ message: "Secondary rate limit" }, {
        status: 429, headers: { "retry-after": "1" },
      });
      fetchMock.mockResolvedValueOnce(limited());
      if (succeeds) {
        const response = stage === "compare" ? comparison : stage === "create" ? { html_url: pullUrl } : [existingPull];
        fetchMock.mockResolvedValueOnce(Response.json(response, { status: stage === "create" ? 201 : 200 }));
        if (stage === "compare") fetchMock.mockResolvedValueOnce(Response.json({ html_url: pullUrl }, { status: 201 }));
        await expect(open()).resolves.toBe(pullUrl);
      } else {
        fetchMock.mockResolvedValueOnce(limited());
        await expect(open()).rejects.toMatchObject({ code: "rate_limited", status: 429 });
      }
      expect(fetchMock.mock.calls[precedingCalls + 1]).toEqual(fetchMock.mock.calls[precedingCalls]);
      expect(fetchMock).toHaveBeenCalledTimes(precedingCalls + 2 + (succeeds && stage === "compare" ? 1 : 0));
    }, 10_000);

    it("sanitizes network failures without retrying", async () => {
      fetchMock.mockRejectedValueOnce(new Error("private-data caller-token"));
      await expect(open()).rejects.toMatchObject({ code: "network_error", message: "Unable to reach the GitHub API." });
      expect(fetchMock).toHaveBeenCalledTimes(precedingCalls + 1);
    });

    it("rejects malformed successful JSON", async () => {
      const status = stage === "create" ? 201 : 200;
      fetchMock.mockResolvedValueOnce(new Response("not json", { status, headers: { "content-type": "application/json" } }));
      await expect(open()).rejects.toMatchObject({ code: "invalid_response", status });
      expect(fetchMock).toHaveBeenCalledTimes(precedingCalls + 1);
    });

    if (stage !== "create") {
      it("propagates 422 without attempting PR recovery", async () => {
        fetchMock.mockResolvedValueOnce(duplicate());
        await expect(open()).rejects.toMatchObject({ code: "http_error", status: 422 });
        expect(fetchMock).toHaveBeenCalledTimes(precedingCalls + 1);
      });
    }
  });

  it("composes the existing Git Data API helpers through PR creation", async () => {
    const treeSha = "tree-sha";
    const commitSha = "commit-sha";
    fetchMock.mockResolvedValueOnce(Response.json(blobResponse, { status: 201 }));
    fetchMock.mockResolvedValueOnce(Response.json({ sha: treeSha }, { status: 201 }));
    fetchMock.mockResolvedValueOnce(Response.json({ sha: commitSha }, { status: 201 }));
    fetchMock.mockResolvedValueOnce(Response.json({
      ref: `refs/heads/${head}`, object: { type: "commit", sha: commitSha },
    }, { status: 201 }));
    fetchMock.mockResolvedValueOnce(Response.json({ files: [{ filename: "LICENSE", status: "added" }] }));
    fetchMock.mockResolvedValueOnce(Response.json({ html_url: pullUrl }, { status: 201 }));

    const blobSha = await createBlob("owner", "repo", "License text", "caller-token");
    const createdTreeSha = await createTree("owner", "repo", "base-tree", [{ path: "LICENSE", sha: blobSha }], "caller-token");
    const createdCommitSha = await createCommit("owner", "repo", createdTreeSha, "parent", "remediation", "caller-token");
    await createOrUpdateBranch("owner", "repo", createdCommitSha, "caller-token");
    await expect(open()).resolves.toBe(pullUrl);
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
      "/repos/owner/repo/git/blobs", "/repos/owner/repo/git/trees", "/repos/owner/repo/git/commits",
      "/repos/owner/repo/git/refs", "/repos/owner/repo/compare/main...repodoc%2Fhealth-remediation",
      "/repos/owner/repo/pulls",
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[5]?.[1]?.body)).body).toContain("- LICENSE");
  }, 10_000);
});

describe("createOrUpdateBranch", () => {
  const ref = "refs/heads/repodoc/health-remediation";
  const createUrl = "https://api.github.com/repos/owner/repo/git/refs";
  // Octokit encodes the complete ref as one URL path parameter.
  const updateUrl = `${createUrl}/heads%2Frepodoc%2Fhealth-remediation`;
  const refResponse = { ref, object: { type: "commit", sha } };

  function branchAlreadyExists(): Response {
    return Response.json({ message: "Reference already exists" }, { status: 422 });
  }

  it.each([false, true])("sets the branch reference (already exists: %s)", async (exists) => {
    if (exists) fetchMock.mockResolvedValueOnce(branchAlreadyExists());
    fetchMock.mockResolvedValueOnce(Response.json(refResponse, { status: exists ? 200 : 201 }));

    await expect(createOrUpdateBranch("owner", "repo", sha, " caller-token ")).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(exists ? 2 : 1);
    expect(fetchMock).toHaveBeenNthCalledWith(1, createUrl, expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ ref, sha }),
    }));
    if (exists) {
      expect(fetchMock).toHaveBeenNthCalledWith(2, updateUrl, expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ sha, force: true }),
      }));
    }
    for (const [, options] of fetchMock.mock.calls) {
      expect(options?.cache).toBe("no-store");
      const headers = new Headers(options?.headers);
      expect(headers.get("authorization")).toBe("Bearer caller-token");
      expect(headers.get("accept")).toBe("application/vnd.github+json");
      expect(headers.get("content-type")).toBe("application/json; charset=utf-8");
      expect(headers.get("user-agent")).toBe("Repodoc");
      expect(headers.get("x-github-api-version")).toBe("2022-11-28");
    }
  });

  it.each([false, true])("encodes owner and repository parameters (already exists: %s)", async (exists) => {
    if (exists) fetchMock.mockResolvedValueOnce(branchAlreadyExists());
    fetchMock.mockResolvedValueOnce(Response.json(refResponse, { status: exists ? 200 : 201 }));

    await createOrUpdateBranch("owner/name", "repo?#", sha, "caller-token");

    const encodedUrl = "https://api.github.com/repos/owner%2Fname/repo%3F%23/git/refs";
    expect(fetchMock.mock.calls[0]?.[0]).toBe(encodedUrl);
    if (exists) {
      expect(fetchMock.mock.calls[1]?.[0]).toBe(`${encodedUrl}/heads%2Frepodoc%2Fhealth-remediation`);
    }
  });

  it("supports repeated calls with the same SHA and replacing it with a new commit", async () => {
    const nextSha = "9fb037999f264ba9a7fc6274d15fa3ae2ab98312";
    fetchMock.mockResolvedValueOnce(Response.json(refResponse, { status: 201 }));
    fetchMock.mockResolvedValueOnce(branchAlreadyExists());
    fetchMock.mockResolvedValueOnce(Response.json(refResponse));
    fetchMock.mockResolvedValueOnce(branchAlreadyExists());
    fetchMock.mockResolvedValueOnce(Response.json({ ref, object: { type: "commit", sha: nextSha } }));

    await createOrUpdateBranch("owner", "repo", sha, "caller-token");
    await createOrUpdateBranch("owner", "repo", sha, "caller-token");
    await createOrUpdateBranch("owner", "repo", nextSha, "caller-token");

    expect(fetchMock.mock.calls.map(([url, options]) => [url, options?.method])).toEqual([
      [createUrl, "POST"], [createUrl, "POST"], [updateUrl, "PATCH"],
      [createUrl, "POST"], [updateUrl, "PATCH"],
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({ sha, force: true });
    expect(JSON.parse(String(fetchMock.mock.calls[4]?.[1]?.body))).toEqual({ sha: nextSha, force: true });
  }, 10_000);

  it.each([
    { owner: "", repo: "repo", sha },
    { owner: "owner", repo: " \t\n", sha },
    { owner: "\ud800", repo: "repo", sha },
    { owner: "owner", repo: "\ud800", sha },
    { owner: undefined, repo: "repo", sha },
    { owner: "owner", repo: null, sha },
    ...[undefined, null, 123, "", " \t\n", "\ud800"].map((commitSha) => ({
      owner: "owner", repo: "repo", sha: commitSha,
    })),
  ])("rejects invalid paths or SHA before fetching: %j", async (input) => {
    // @ts-expect-error Deliberately exercise invalid runtime input.
    await expect(createOrUpdateBranch(input.owner, input.repo, input.sha, "caller-token"))
      .rejects.toMatchObject({ code: "invalid_input" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([undefined, null, "", " \t\n", 123])(
    "rejects invalid explicit tokens despite GITHUB_TOKEN: %j", async (token) => {
      // @ts-expect-error Deliberately exercise invalid runtime input.
      await expect(createOrUpdateBranch("owner", "repo", sha, token))
        .rejects.toMatchObject({ code: "invalid_input" });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid authorization headers without exposing credentials", async () => {
    await expect(createOrUpdateBranch("owner", "repo", sha, "secret\ntoken")).rejects.toMatchObject({
      code: "invalid_input",
      message: "GitHub request headers contain invalid values.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe.each([false, true])("response handling (already exists: %s)", (exists) => {
    beforeEach(() => {
      if (exists) fetchMock.mockResolvedValueOnce(branchAlreadyExists());
    });

    it.each([
      null, [], {}, "invalid", { ref },
      { ref: "refs/heads/main", object: { type: "commit", sha } },
      { ref, object: null }, { ref, object: [] }, { ref, object: {} },
      { ref, object: { type: "tree", sha } },
      ...[undefined, null, 123, "", " \t\n", "different-sha"].map((commitSha) => ({
        ref, object: { type: "commit", sha: commitSha },
      })),
    ])("rejects malformed or mismatched reference responses: %j", async (body) => {
      const status = exists ? 200 : 201;
      fetchMock.mockResolvedValueOnce(Response.json(body, { status }));
      const result = createOrUpdateBranch("owner", "repo", sha, "caller-token");
      await expect(result).rejects.toBeInstanceOf(GitHubApiError);
      await expect(result).rejects.toMatchObject({ code: "invalid_response", status });
      expect(fetchMock).toHaveBeenCalledTimes(exists ? 2 : 1);
    });

    it("rejects malformed JSON in successful responses", async () => {
      const status = exists ? 200 : 201;
      fetchMock.mockResolvedValueOnce(new Response("not json", {
        status, headers: { "content-type": "application/json" },
      }));
      await expect(createOrUpdateBranch("owner", "repo", sha, "caller-token"))
        .rejects.toMatchObject({ code: "invalid_response", status });
      expect(fetchMock).toHaveBeenCalledTimes(exists ? 2 : 1);
    });

    it.each([
      { status: 401, code: "unauthorized" },
      { status: 403, code: "forbidden" },
      { status: 404, code: "not_found" },
      { status: 409, code: "http_error" },
      { status: 429, code: "rate_limited" },
      { status: 500, code: "http_error" },
    ])("sanitizes HTTP $status as $code without extra writes", async ({ status, code }) => {
      fetchMock.mockResolvedValueOnce(Response.json({ message: "private-data secret-token" }, { status }));
      const result = createOrUpdateBranch("owner", "repo", sha, "secret-token");
      await expect(result).rejects.toBeInstanceOf(GitHubApiError);
      await expect(result).rejects.toMatchObject({ code, status });
      await expect(result).rejects.not.toHaveProperty("message", expect.stringContaining("secret-token"));
      await expect(result).rejects.not.toHaveProperty("message", expect.stringContaining("private-data"));
      expect(fetchMock).toHaveBeenCalledTimes(exists ? 2 : 1);
    });

    it.each([403, 429])("preserves rate-limit metadata for HTTP %i", async (status) => {
      fetchMock.mockResolvedValueOnce(Response.json({ message: "API rate limit exceeded" }, {
        status,
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "1800000000",
          "retry-after": "60",
        },
      }));
      await expect(createOrUpdateBranch("owner", "repo", sha, "caller-token")).rejects.toMatchObject({
        code: "rate_limited", status, retryAfterSeconds: 60, rateLimitResetAt: 1800000000,
      });
      expect(fetchMock).toHaveBeenCalledTimes(exists ? 2 : 1);
    });

    it.each([false, true])("bounds retries and preserves payloads (eventual success: %s)", async (succeeds) => {
      fetchMock.mockResolvedValueOnce(Response.json({ message: "Secondary rate limit" }, {
        status: 429, headers: { "retry-after": "1" },
      }));
      fetchMock.mockResolvedValueOnce(succeeds
        ? Response.json(refResponse, { status: exists ? 200 : 201 })
        : Response.json({ message: "Secondary rate limit" }, {
          status: 429, headers: { "retry-after": "1" },
        }));
      const result = createOrUpdateBranch("owner", "repo", sha, "caller-token");
      if (succeeds) {
        await expect(result).resolves.toBeUndefined();
      } else {
        await expect(result).rejects.toMatchObject({ code: "rate_limited", status: 429 });
      }
      const offset = exists ? 1 : 0;
      expect(fetchMock).toHaveBeenCalledTimes(offset + 2);
      expect(fetchMock.mock.calls[offset + 1]).toEqual(fetchMock.mock.calls[offset]);
    });

    it("retains HTTP errors when their response body is malformed", async () => {
      fetchMock.mockResolvedValueOnce(new Response("not json", { status: 404 }));
      await expect(createOrUpdateBranch("owner", "repo", sha, "caller-token"))
        .rejects.toMatchObject({ code: "not_found", status: 404 });
      expect(fetchMock).toHaveBeenCalledTimes(exists ? 2 : 1);
    });

    it("sanitizes network failures without retrying", async () => {
      fetchMock.mockRejectedValueOnce(new Error("private-data secret-token"));
      await expect(createOrUpdateBranch("owner", "repo", sha, "secret-token")).rejects.toMatchObject({
        code: "network_error", status: undefined, message: "Unable to reach the GitHub API.",
      });
      expect(fetchMock).toHaveBeenCalledTimes(exists ? 2 : 1);
    });
  });

  it("propagates PATCH 422 without looping back to creation", async () => {
    fetchMock.mockResolvedValueOnce(branchAlreadyExists());
    fetchMock.mockResolvedValueOnce(Response.json({ message: "private-data secret-token" }, { status: 422 }));
    await expect(createOrUpdateBranch("owner", "repo", sha, "secret-token")).rejects.toMatchObject({
      code: "http_error", status: 422, message: "GitHub API request failed with HTTP 422.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("composes blob, tree, and commit creation into a branch pointing at the created commit", async () => {
    const treeSha = "cd8274d15fa3ae2ab983129fb037999f264ba9a7";
    const commitSha = "9fb037999f264ba9a7fc6274d15fa3ae2ab98312";
    fetchMock.mockResolvedValueOnce(Response.json(blobResponse, { status: 201 }));
    fetchMock.mockResolvedValueOnce(Response.json({ sha: treeSha }, { status: 201 }));
    fetchMock.mockResolvedValueOnce(Response.json({ sha: commitSha }, { status: 201 }));
    fetchMock.mockResolvedValueOnce(Response.json({ ref, object: { type: "commit", sha: commitSha } }, { status: 201 }));

    const blobSha = await createBlob("owner", "repo", "License text", "caller-token");
    const createdTreeSha = await createTree(
      "owner", "repo", "base-tree-sha", [{ path: "LICENSE", sha: blobSha }], "caller-token",
    );
    const createdCommitSha = await createCommit(
      "owner", "repo", createdTreeSha, "parent-sha",
      "chore(repodoc): resolve repository health audit findings", "caller-token",
    );
    await createOrUpdateBranch("owner", "repo", createdCommitSha, "caller-token");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.github.com/repos/owner/repo/git/blobs",
      "https://api.github.com/repos/owner/repo/git/trees",
      "https://api.github.com/repos/owner/repo/git/commits",
      createUrl,
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body))).toEqual({ ref, sha: commitSha });
  });
});

describe("createBlob", () => {
  it("posts base64 content with explicit authentication and returns the blob SHA", async () => {
    fetchMock.mockResolvedValue(Response.json(blobResponse, { status: 201 }));

    await expect(createBlob("owner", "repo", "Hello, world!", "caller-token")).resolves.toBe(sha);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      "https://api.github.com/repos/owner/repo/git/blobs",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        headers: expect.any(Headers),
        body: JSON.stringify({ content: "SGVsbG8sIHdvcmxkIQ==", encoding: "base64" }),
      }),
    );
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("authorization")).toBe("Bearer caller-token");
    expect(headers.get("accept")).toBe("application/vnd.github+json");
    expect(headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(headers.get("user-agent")).toBe("Repodoc");
    expect(headers.get("x-github-api-version")).toBe("2022-11-28");
  });

  it.each([
    "",
    "日本語 — café 🚀",
    " \t\r\n# Heading\r\n\r\ntrailing spaces  \n",
    "\u0000binary-like text\u0000",
  ])("preserves UTF-8 content exactly: %j", async (content) => {
    fetchMock.mockResolvedValue(Response.json(blobResponse, { status: 201 }));

    await expect(createBlob("owner", "repo", content, "caller-token")).resolves.toBe(sha);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.encoding).toBe("base64");
    expect(Buffer.from(body.content, "base64").toString("utf8")).toBe(content);
  });

  it("encodes owner and repository path parameters", async () => {
    fetchMock.mockResolvedValue(Response.json(blobResponse, { status: 201 }));

    await createBlob("owner/name", "repo?#", "text", "caller-token");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.github.com/repos/owner%2Fname/repo%3F%23/git/blobs",
    );
  });

  it("uses shared token trimming without falling back to the environment", async () => {
    fetchMock.mockResolvedValue(Response.json(blobResponse, { status: 201 }));

    await createBlob("owner", "repo", "text", " caller-token ");
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("authorization")).toBe("Bearer caller-token");
  });

  it.each([
    { owner: "", repo: "repo" },
    { owner: "owner", repo: " \t\n" },
    { owner: "\ud800", repo: "repo" },
    { owner: "owner", repo: "\ud800" },
    { owner: undefined, repo: "repo" },
    { owner: "owner", repo: null },
  ])("rejects invalid paths before fetching: %j", async ({ owner, repo }) => {
    // @ts-expect-error Deliberately exercise invalid runtime input.
    await expect(createBlob(owner, repo, "text", "caller-token")).rejects.toMatchObject({
      code: "invalid_input",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 123, {}, []])("rejects non-string content: %j", async (content) => {
    // @ts-expect-error Deliberately exercise invalid runtime input.
    await expect(createBlob("owner", "repo", content, "caller-token")).rejects.toMatchObject({
      code: "invalid_input",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([undefined, null, "", " \t\n", 123])(
    "rejects a missing or invalid explicit token despite GITHUB_TOKEN: %j", async (token) => {
      // @ts-expect-error Deliberately exercise invalid runtime input.
      await expect(createBlob("owner", "repo", "text", token)).rejects.toMatchObject({
        code: "invalid_input",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid authorization headers without exposing the token", async () => {
    await expect(createBlob("owner", "repo", "private-content", "secret\ntoken")).rejects.toMatchObject({
      code: "invalid_input",
      message: "GitHub request headers contain invalid values.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([null, [], {}, { sha: null }, { sha: 123 }, { sha: "" }, { sha: " \t\n" }])(
    "rejects malformed creation responses: %j", async (body) => {
      fetchMock.mockResolvedValue(Response.json(body, { status: 201 }));

      const result = createBlob("owner", "repo", "text", "caller-token");
      await expect(result).rejects.toBeInstanceOf(GitHubApiError);
      await expect(result).rejects.toMatchObject({ code: "invalid_response", status: 201 });
    },
  );

  it("rejects malformed JSON in a successful response", async () => {
    fetchMock.mockResolvedValue(new Response("not json", {
      status: 201,
      headers: { "content-type": "application/json" },
    }));

    await expect(createBlob("owner", "repo", "text", "caller-token")).rejects.toMatchObject({
      code: "invalid_response",
      status: 201,
    });
  });

  it.each([
    { status: 401, code: "unauthorized" },
    { status: 403, code: "forbidden" },
    { status: 404, code: "not_found" },
    { status: 409, code: "http_error" },
    { status: 422, code: "http_error" },
    { status: 429, code: "rate_limited" },
    { status: 500, code: "http_error" },
  ])("maps HTTP $status to a typed $code error", async ({ status, code }) => {
    fetchMock.mockResolvedValue(Response.json({ message: "private-content secret-token" }, { status }));

    const result = createBlob("owner", "repo", "private-content", "secret-token");
    await expect(result).rejects.toBeInstanceOf(GitHubApiError);
    await expect(result).rejects.toMatchObject({ code, status });
    await expect(result).rejects.not.toHaveProperty("message", expect.stringContaining("secret-token"));
    await expect(result).rejects.not.toHaveProperty("message", expect.stringContaining("private-content"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([403, 429])("retains rate-limit timing for HTTP %i", async (status) => {
    fetchMock.mockResolvedValue(Response.json({ message: "API rate limit exceeded" }, {
      status,
      headers: {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1800000000",
        "retry-after": "60",
      },
    }));

    await expect(createBlob("owner", "repo", "text", "caller-token")).rejects.toMatchObject({
      code: "rate_limited",
      status,
      retryAfterSeconds: 60,
      rateLimitResetAt: 1800000000,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reuses the bounded rate-limit retry and succeeds", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: "Secondary rate limit" }, {
      status: 429,
      headers: { "retry-after": "1" },
    }));
    fetchMock.mockResolvedValueOnce(Response.json(blobResponse, { status: 201 }));

    await expect(createBlob("owner", "repo", "text", "caller-token")).resolves.toBe(sha);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]).toEqual(fetchMock.mock.calls[0]);
  });

  it("retains HTTP errors when the error body is malformed", async () => {
    fetchMock.mockResolvedValue(new Response("not json", { status: 404 }));

    await expect(createBlob("owner", "repo", "text", "caller-token")).rejects.toMatchObject({
      code: "not_found",
      status: 404,
    });
  });

  it("sanitizes network errors without retrying or exposing request data", async () => {
    fetchMock.mockRejectedValue(new Error("private-content secret-token"));

    await expect(createBlob("owner", "repo", "private-content", "secret-token")).rejects.toMatchObject({
      code: "network_error",
      status: undefined,
      message: "Unable to reach the GitHub API.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("createCommit", () => {
  const treeSha = "cd8274d15fa3ae2ab983129fb037999f264ba9a7";
  const parentSha = "9fb037999f264ba9a7fc6274d15fa3ae2ab98312";
  const commitSha = "7c258a9869f33c1e1e1f74fbb32f07c86cb5a75b";
  const message = "chore(repodoc): resolve repository health audit findings";
  const commitResponse = { sha: commitSha };

  it("posts the remediation message, tree, and exactly one parent with explicit authentication", async () => {
    fetchMock.mockResolvedValue(Response.json(commitResponse, { status: 201 }));

    await expect(
      createCommit("owner", "repo", treeSha, parentSha, message, "caller-token"),
    ).resolves.toBe(commitSha);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      "https://api.github.com/repos/owner/repo/git/commits",
      expect.objectContaining({ method: "POST", cache: "no-store", headers: expect.any(Headers) }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      message,
      tree: treeSha,
      parents: [parentSha],
    });
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("authorization")).toBe("Bearer caller-token");
    expect(headers.get("accept")).toBe("application/vnd.github+json");
    expect(headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(headers.get("user-agent")).toBe("Repodoc");
    expect(headers.get("x-github-api-version")).toBe("2022-11-28");
  });

  it.each(["Custom commit", "日本語 — café 🚀", "  Summary\r\n\r\nDetails\n  "])(
    "preserves the supplied message verbatim: %j",
    async (customMessage) => {
      fetchMock.mockResolvedValue(Response.json(commitResponse, { status: 201 }));
      await createCommit("owner", "repo", treeSha, parentSha, customMessage, "caller-token");
      expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).message).toBe(customMessage);
    },
  );

  it("encodes repository path parameters and trims only the authentication token", async () => {
    fetchMock.mockResolvedValue(Response.json(commitResponse, { status: 201 }));
    await createCommit("owner/name", "repo?#", treeSha, parentSha, message, " caller-token ");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.github.com/repos/owner%2Fname/repo%3F%23/git/commits",
    );
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(
      "Bearer caller-token",
    );
  });

  it.each([
    { owner: "", repo: "repo", tree: treeSha, parent: parentSha },
    { owner: "owner", repo: " \t\n", tree: treeSha, parent: parentSha },
    { owner: "\ud800", repo: "repo", tree: treeSha, parent: parentSha },
    { owner: "owner", repo: "\ud800", tree: treeSha, parent: parentSha },
    { owner: undefined, repo: "repo", tree: treeSha, parent: parentSha },
    { owner: "owner", repo: null, tree: treeSha, parent: parentSha },
    ...[undefined, null, 123, "", " \t\n", "\ud800"].flatMap((invalidSha) => [
      { owner: "owner", repo: "repo", tree: invalidSha, parent: parentSha },
      { owner: "owner", repo: "repo", tree: treeSha, parent: invalidSha },
    ]),
  ])("rejects invalid repository, tree, or parent parameters: %j", async ({ owner, repo, tree, parent }) => {
    // @ts-expect-error Deliberately exercise invalid runtime input.
    await expect(createCommit(owner, repo, tree, parent, message, "caller-token")).rejects.toMatchObject({
      code: "invalid_input",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 123, {}, [], "", " \t\r\n"])(
    "rejects missing, non-string, or blank messages: %j",
    async (invalidMessage) => {
      // @ts-expect-error Deliberately exercise invalid runtime input.
      const result = createCommit("owner", "repo", treeSha, parentSha, invalidMessage, "caller-token");
      await expect(result).rejects.toMatchObject({ code: "invalid_input" });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, null, 123, "", " \t\n"])(
    "rejects invalid explicit tokens despite GITHUB_TOKEN: %j",
    async (token) => {
      // @ts-expect-error Deliberately exercise invalid runtime input.
      const result = createCommit("owner", "repo", treeSha, parentSha, message, token);
      await expect(result).rejects.toMatchObject({ code: "invalid_input" });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid authorization headers without exposing credentials", async () => {
    await expect(
      createCommit("owner", "repo", treeSha, parentSha, message, "secret\ntoken"),
    ).rejects.toMatchObject({
      code: "invalid_input",
      message: "GitHub request headers contain invalid values.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([null, [], {}, "invalid", { sha: null }, { sha: 123 }, { sha: "" }, { sha: " \t\n" }])(
    "rejects malformed commit responses: %j",
    async (body) => {
      fetchMock.mockResolvedValue(Response.json(body, { status: 201 }));
      const result = createCommit("owner", "repo", treeSha, parentSha, message, "caller-token");
      await expect(result).rejects.toBeInstanceOf(GitHubApiError);
      await expect(result).rejects.toMatchObject({ code: "invalid_response", status: 201 });
    },
  );

  it("rejects malformed JSON in successful responses", async () => {
    fetchMock.mockResolvedValue(
      new Response("not json", { status: 201, headers: { "content-type": "application/json" } }),
    );
    await expect(
      createCommit("owner", "repo", treeSha, parentSha, message, "caller-token"),
    ).rejects.toMatchObject({ code: "invalid_response", status: 201 });
  });

  it.each([
    { status: 401, code: "unauthorized" },
    { status: 403, code: "forbidden" },
    { status: 404, code: "not_found" },
    { status: 409, code: "http_error" },
    { status: 422, code: "http_error" },
    { status: 429, code: "rate_limited" },
    { status: 500, code: "http_error" },
  ])("sanitizes HTTP $status as $code", async ({ status, code }) => {
    fetchMock.mockResolvedValue(Response.json({ message: "private-message secret-token" }, { status }));
    const result = createCommit("owner", "repo", treeSha, parentSha, "private-message", "secret-token");
    await expect(result).rejects.toBeInstanceOf(GitHubApiError);
    await expect(result).rejects.toMatchObject({ code, status });
    await expect(result).rejects.not.toHaveProperty("message", expect.stringContaining("secret-token"));
    await expect(result).rejects.not.toHaveProperty("message", expect.stringContaining("private-message"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([403, 429])("preserves rate-limit metadata for HTTP %i", async (status) => {
    fetchMock.mockResolvedValue(Response.json({ message: "API rate limit exceeded" }, {
      status,
      headers: {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1800000000",
        "retry-after": "60",
      },
    }));
    await expect(
      createCommit("owner", "repo", treeSha, parentSha, message, "caller-token"),
    ).rejects.toMatchObject({
      code: "rate_limited",
      status,
      retryAfterSeconds: 60,
      rateLimitResetAt: 1800000000,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    "bounds retries and preserves the commit payload (eventual success: %s)",
    async (succeeds) => {
      fetchMock.mockResolvedValue(Response.json({ message: "Secondary rate limit" }, {
        status: 429,
        headers: { "retry-after": "1" },
      }));
      if (succeeds) {
        fetchMock.mockResolvedValueOnce(Response.json({ message: "Secondary rate limit" }, {
          status: 429,
          headers: { "retry-after": "1" },
        }));
        fetchMock.mockResolvedValueOnce(Response.json(commitResponse, { status: 201 }));
      }
      const result = createCommit("owner", "repo", treeSha, parentSha, message, "caller-token");
      if (succeeds) {
        await expect(result).resolves.toBe(commitSha);
      } else {
        await expect(result).rejects.toMatchObject({ code: "rate_limited", status: 429 });
      }
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1]).toEqual(fetchMock.mock.calls[0]);
    },
  );

  it("retains HTTP errors when their response body is malformed", async () => {
    fetchMock.mockResolvedValue(new Response("not json", { status: 404 }));
    await expect(
      createCommit("owner", "repo", treeSha, parentSha, message, "caller-token"),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });
  });

  it("sanitizes network failures without retrying", async () => {
    fetchMock.mockRejectedValue(new Error("private-message secret-token"));
    await expect(
      createCommit("owner", "repo", treeSha, parentSha, "private-message", "secret-token"),
    ).rejects.toMatchObject({
      code: "network_error",
      status: undefined,
      message: "Unable to reach the GitHub API.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("composes created blobs and a tree into one commit with the base commit as its parent", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(blobResponse, { status: 201 }));
    fetchMock.mockResolvedValueOnce(Response.json({ sha: treeSha }, { status: 201 }));
    fetchMock.mockResolvedValueOnce(Response.json(commitResponse, { status: 201 }));

    const blobSha = await createBlob("owner", "repo", "License text", "caller-token");
    const createdTreeSha = await createTree(
      "owner", "repo", "base-tree-sha", [{ path: "LICENSE", sha: blobSha }], "caller-token",
    );
    await expect(
      createCommit("owner", "repo", createdTreeSha, parentSha, message, "caller-token"),
    ).resolves.toBe(commitSha);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.github.com/repos/owner/repo/git/blobs",
      "https://api.github.com/repos/owner/repo/git/trees",
      "https://api.github.com/repos/owner/repo/git/commits",
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      base_tree: "base-tree-sha",
      tree: [{ path: "LICENSE", sha: blobSha, mode: "100644", type: "blob" }],
    });
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({
      tree: createdTreeSha,
      parents: [parentSha],
      message,
    });
  });
});

describe("createTree", () => {
  const baseTreeSha = "9fb037999f264ba9a7fc6274d15fa3ae2ab98312";
  const treeSha = "cd8274d15fa3ae2ab983129fb037999f264ba9a7";
  const secondBlobSha = "7c258a9869f33c1e1e1f74fbb32f07c86cb5a75b";
  const blobs: readonly TreeBlob[] = Object.freeze([
    Object.freeze({ path: "LICENSE", sha }),
    Object.freeze({ path: ".github/workflows/ci.yml", sha: secondBlobSha }),
  ]);
  const treeResponse = { sha: treeSha, tree: [], truncated: false };

  it("posts multiple regular-file blobs on the base tree and returns the tree SHA", async () => {
    fetchMock.mockResolvedValue(Response.json(treeResponse, { status: 201 }));

    await expect(createTree("owner", "repo", baseTreeSha, blobs, "caller-token")).resolves.toBe(
      treeSha,
    );
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      "https://api.github.com/repos/owner/repo/git/trees",
      expect.objectContaining({ method: "POST", cache: "no-store", headers: expect.any(Headers) }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      base_tree: baseTreeSha,
      tree: [
        { path: "LICENSE", sha, mode: "100644", type: "blob" },
        { path: ".github/workflows/ci.yml", sha: secondBlobSha, mode: "100644", type: "blob" },
      ],
    });
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("authorization")).toBe("Bearer caller-token");
    expect(headers.get("accept")).toBe("application/vnd.github+json");
    expect(headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(headers.get("user-agent")).toBe("Repodoc");
    expect(headers.get("x-github-api-version")).toBe("2022-11-28");
    expect(blobs).toEqual([
      { path: "LICENSE", sha },
      { path: ".github/workflows/ci.yml", sha: secondBlobSha },
    ]);
  });

  it("preserves Unicode, spaces, punctuation, case, and file order without forwarding extra properties", async () => {
    fetchMock.mockResolvedValue(Response.json(treeResponse, { status: 201 }));
    const entries = [
      { path: "docs/日本語 — café 🚀.md", sha, mode: "120000", type: "tree", content: "unwanted" },
      { path: " README?#.md ", sha: secondBlobSha },
      { path: "README.md", sha },
      { path: "readme.md", sha },
    ];

    await createTree("owner/name", "repo?#", baseTreeSha, entries, " caller-token ");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.github.com/repos/owner%2Fname/repo%3F%23/git/trees",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      base_tree: baseTreeSha,
      tree: entries.map(({ path, sha: blobSha }) => ({
        path,
        sha: blobSha,
        mode: "100644",
        type: "blob",
      })),
    });
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(
      "Bearer caller-token",
    );
    expect(entries[0]).toHaveProperty("content", "unwanted");
  });

  it.each([
    { owner: "", repo: "repo", base: baseTreeSha },
    { owner: "owner", repo: " \t\n", base: baseTreeSha },
    { owner: "\ud800", repo: "repo", base: baseTreeSha },
    { owner: "owner", repo: "\ud800", base: baseTreeSha },
    { owner: undefined, repo: "repo", base: baseTreeSha },
    { owner: "owner", repo: null, base: baseTreeSha },
    ...[undefined, null, 123, "", " \t\n", "\ud800"].map((base) => ({
      owner: "owner",
      repo: "repo",
      base,
    })),
  ])("rejects invalid repository or base tree parameters: %j", async ({ owner, repo, base }) => {
    // @ts-expect-error Deliberately exercise invalid runtime input.
    await expect(createTree(owner, repo, base, blobs, "caller-token")).rejects.toMatchObject({
      code: "invalid_input",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([undefined, null, "", " \t\n", 123])(
    "rejects invalid explicit tokens despite GITHUB_TOKEN: %j",
    async (token) => {
      // @ts-expect-error Deliberately exercise invalid runtime input.
      await expect(createTree("owner", "repo", baseTreeSha, blobs, token)).rejects.toMatchObject({
        code: "invalid_input",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid authorization headers without exposing credentials", async () => {
    await expect(
      createTree("owner", "repo", baseTreeSha, blobs, "secret\ntoken"),
    ).rejects.toMatchObject({
      code: "invalid_input",
      message: "GitHub request headers contain invalid values.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([undefined, null, {}, "blobs", [], [null], [undefined], [123], [[]], [{}], new Array(1)])(
    "rejects malformed or empty blob collections: %j",
    async (entries) => {
      // @ts-expect-error Deliberately exercise invalid runtime input.
      const result = createTree("owner", "repo", baseTreeSha, entries, "caller-token");
      await expect(result).rejects.toMatchObject({ code: "invalid_input" });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, null, 123, "", " \t\n"])(
    "rejects missing or invalid blob SHAs: %j",
    async (blobSha) => {
      // @ts-expect-error Deliberately exercise invalid runtime input.
      const result = createTree("owner", "repo", baseTreeSha, [{ path: "LICENSE", sha: blobSha }], "caller-token");
      await expect(result).rejects.toMatchObject({ code: "invalid_input" });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    undefined,
    null,
    123,
    "",
    " \t\n",
    "\ud800",
    "/LICENSE",
    "docs/",
    "docs//file.md",
    ".",
    "..",
    "./LICENSE",
    "../LICENSE",
    "docs/./file.md",
    "docs/../file.md",
    "file\0.md",
  ])("rejects invalid destination paths before fetching: %j", async (path) => {
    // @ts-expect-error Deliberately exercise invalid runtime input.
    const result = createTree("owner", "repo", baseTreeSha, [{ path, sha }], "caller-token");
    await expect(result).rejects.toMatchObject({ code: "invalid_input" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects duplicate paths instead of choosing which blob to use", async () => {
    await expect(
      createTree(
        "owner",
        "repo",
        baseTreeSha,
        [blobs[0], { path: "LICENSE", sha: secondBlobSha }],
        "caller-token",
      ),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([null, [], {}, { sha: null }, { sha: 123 }, { sha: "" }, { sha: " \t\n" }])(
    "rejects malformed tree responses: %j",
    async (body) => {
      fetchMock.mockResolvedValue(Response.json(body, { status: 201 }));
      const result = createTree("owner", "repo", baseTreeSha, blobs, "caller-token");
      await expect(result).rejects.toBeInstanceOf(GitHubApiError);
      await expect(result).rejects.toMatchObject({ code: "invalid_response", status: 201 });
    },
  );

  it("rejects malformed JSON in successful responses", async () => {
    fetchMock.mockResolvedValue(
      new Response("not json", { status: 201, headers: { "content-type": "application/json" } }),
    );
    await expect(
      createTree("owner", "repo", baseTreeSha, blobs, "caller-token"),
    ).rejects.toMatchObject({ code: "invalid_response", status: 201 });
  });

  it.each([
    { status: 401, code: "unauthorized" },
    { status: 403, code: "forbidden" },
    { status: 404, code: "not_found" },
    { status: 409, code: "http_error" },
    { status: 422, code: "http_error" },
    { status: 429, code: "rate_limited" },
    { status: 500, code: "http_error" },
  ])("sanitizes HTTP $status as $code", async ({ status, code }) => {
    fetchMock.mockResolvedValue(
      Response.json({ message: "private-path secret-token" }, { status }),
    );
    const result = createTree(
      "owner",
      "repo",
      baseTreeSha,
      [{ path: "private-path", sha }],
      "secret-token",
    );
    await expect(result).rejects.toBeInstanceOf(GitHubApiError);
    await expect(result).rejects.toMatchObject({ code, status });
    await expect(result).rejects.not.toHaveProperty(
      "message",
      expect.stringContaining("secret-token"),
    );
    await expect(result).rejects.not.toHaveProperty(
      "message",
      expect.stringContaining("private-path"),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([403, 429])("preserves rate-limit metadata for HTTP %i", async (status) => {
    fetchMock.mockResolvedValue(
      Response.json(
        { message: "API rate limit exceeded" },
        {
          status,
          headers: {
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": "1800000000",
            "retry-after": "60",
          },
        },
      ),
    );
    await expect(
      createTree("owner", "repo", baseTreeSha, blobs, "caller-token"),
    ).rejects.toMatchObject({
      code: "rate_limited",
      status,
      retryAfterSeconds: 60,
      rateLimitResetAt: 1800000000,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    "bounds retries and preserves the tree payload (eventual success: %s)",
    async (succeeds) => {
      fetchMock.mockResolvedValue(
        Response.json(
          { message: "Secondary rate limit" },
          { status: 429, headers: { "retry-after": "1" } },
        ),
      );
      if (succeeds) {
        fetchMock.mockResolvedValueOnce(
          Response.json(
            { message: "Secondary rate limit" },
            { status: 429, headers: { "retry-after": "1" } },
          ),
        );
        fetchMock.mockResolvedValueOnce(Response.json(treeResponse, { status: 201 }));
      }
      const result = createTree("owner", "repo", baseTreeSha, blobs, "caller-token");
      if (succeeds) {
        await expect(result).resolves.toBe(treeSha);
      } else {
        await expect(result).rejects.toMatchObject({ code: "rate_limited", status: 429 });
      }
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1]).toEqual(fetchMock.mock.calls[0]);
    },
  );

  it("retains HTTP errors when their response body is malformed", async () => {
    fetchMock.mockResolvedValue(new Response("not json", { status: 404 }));
    await expect(
      createTree("owner", "repo", baseTreeSha, blobs, "caller-token"),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });
  });

  it("sanitizes network failures without retrying", async () => {
    fetchMock.mockRejectedValue(new Error("private-path secret-token"));
    await expect(
      createTree("owner", "repo", baseTreeSha, blobs, "secret-token"),
    ).rejects.toMatchObject({
      code: "network_error",
      status: undefined,
      message: "Unable to reach the GitHub API.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("composes created blobs into one tree using their returned SHAs", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(blobResponse, { status: 201 }));
    fetchMock.mockResolvedValueOnce(Response.json({ sha: secondBlobSha }, { status: 201 }));
    fetchMock.mockResolvedValueOnce(Response.json(treeResponse, { status: 201 }));

    const licenseSha = await createBlob("owner", "repo", "License text", "caller-token");
    const workflowSha = await createBlob("owner", "repo", "Workflow text", "caller-token");
    await expect(
      createTree(
        "owner",
        "repo",
        baseTreeSha,
        [
          { path: "LICENSE", sha: licenseSha },
          { path: ".github/workflows/ci.yml", sha: workflowSha },
        ],
        "caller-token",
      ),
    ).resolves.toBe(treeSha);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.github.com/repos/owner/repo/git/blobs",
      "https://api.github.com/repos/owner/repo/git/blobs",
      "https://api.github.com/repos/owner/repo/git/trees",
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({
      base_tree: baseTreeSha,
      tree: [
        { path: "LICENSE", sha: licenseSha, mode: "100644", type: "blob" },
        { path: ".github/workflows/ci.yml", sha: workflowSha, mode: "100644", type: "blob" },
      ],
    });
  });
});
