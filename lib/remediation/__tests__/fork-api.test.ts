// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REPODOC_BRANCH } from "@/src/lib/constants";
import { ensureForkReady, fetchRemediationRepository } from "../fork-api";

vi.mock("octokit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("octokit")>();
  return {
    ...actual,
    Octokit: class extends actual.Octokit {
      constructor(options: ConstructorParameters<typeof actual.Octokit>[0]) {
        super({
          ...options,
          throttle: { ...options?.throttle, enabled: false },
        });
      }
    },
  };
});

const fetchMock = vi.fn<typeof fetch>();
const upstream = {
  defaultBranch: "main",
  push: false,
  repositoryId: 1,
  networkId: 1,
};
const base = { commitSha: "upstream-commit", treeSha: "upstream-tree" };
const original = {
  id: 1,
  fork: false,
  default_branch: "main",
  permissions: { push: false },
};
let fork: Record<string, unknown>;
let ready: Record<string, unknown>;
let requests: { method: string; path: string; signal?: AbortSignal | null }[];
let failPath: string | undefined;
let failStatus: number;
let unavailable: number;

function run() {
  return ensureForkReady("upstream", "repo", upstream, base, "caller-token");
}

beforeEach(() => {
  fork = {
    id: 2,
    fork: true,
    name: "renamed-fork",
    owner: { id: 3, login: "caller" },
  };
  ready = {
    ...fork,
    source: { id: 1 },
    default_branch: "old-main",
    permissions: { push: true },
  };
  requests = [];
  failPath = undefined;
  failStatus = 403;
  unavailable = 0;
  fetchMock.mockReset().mockImplementation(async (url, options) => {
    const path = new URL(String(url)).pathname;
    const method = options?.method ?? "GET";
    requests.push({ method, path, signal: options?.signal });
    expect(new Headers(options?.headers).get("authorization")).toBe(
      "Bearer caller-token",
    );
    expect(options?.cache).toBe("no-store");
    if (path === failPath)
      return Response.json(
        { message: "provider-secret caller-token" },
        {
          status: failStatus,
          headers: failStatus === 429 ? { "retry-after": "1" } : {},
        },
      );
    if (path === "/user") return Response.json({ id: 3, login: "caller" });
    if (path === "/repos/upstream/repo/forks") {
      expect(method).toBe("POST");
      expect(options?.body).toBeUndefined();
      return Response.json(fork, { status: 202 });
    }
    if (path === "/repos/upstream/repo") return Response.json(original);
    if (path === "/repos/caller/renamed-fork") return Response.json(ready);
    if (path === "/repos/caller/renamed-fork/git/trees/upstream-tree")
      return Response.json({ sha: base.treeSha, tree: [] });
    if (path === "/repos/caller/renamed-fork/git/commits/upstream-commit") {
      if (unavailable-- > 0)
        return Response.json({ message: "Not ready" }, { status: 404 });
      return Response.json({
        sha: base.commitSha,
        tree: { sha: base.treeSha },
      });
    }
    throw new Error(`Unexpected path: ${path}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GITHUB_TOKEN", "environment-token");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("fetchRemediationRepository", () => {
  it("returns explicit push permissions and repository identity", async () => {
    await expect(
      fetchRemediationRepository("upstream", "repo", "caller-token"),
    ).resolves.toEqual(upstream);
  });
  it("uses the root network identity when upstream is itself a fork", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        ...original,
        fork: true,
        source: { id: 7 },
        permissions: { push: true },
      }),
    );
    await expect(
      fetchRemediationRepository("upstream", "repo", "caller-token"),
    ).resolves.toEqual({ ...upstream, push: true, networkId: 7 });
  });
  it.each([
    {},
    { ...original, permissions: {} },
    { ...original, permissions: { push: "true" } },
    { ...original, id: -1 },
    { ...original, fork: true },
    { ...original, default_branch: "" },
    { ...original, fork: true, source: { id: "1" } },
    { ...original, fork: undefined },
    null,
  ])("rejects incomplete metadata %j", async (body) => {
    fetchMock.mockResolvedValue(Response.json(body));
    await expect(
      fetchRemediationRepository("upstream", "repo", "caller-token"),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });
  it.each(["", " "])(
    "rejects empty credentials before requests",
    async (token) => {
      await expect(
        fetchRemediationRepository("upstream", "repo", token),
      ).rejects.toMatchObject({ code: "invalid_input" });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});

describe("ensureForkReady", () => {
  it("rejects empty credentials before resolving identity or requesting a fork", async () => {
    await expect(
      ensureForkReady("upstream", "repo", upstream, base, ""),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(requests).toEqual([]);
  });
  it.each([{}, { id: 3, login: "../caller" }, { id: "3", login: "caller" }])(
    "rejects malformed authenticated identities %j",
    async (body) => {
      fetchMock.mockResolvedValue(Response.json(body));
      await expect(run()).rejects.toMatchObject({ code: "invalid_response" });
      expect(requests).toEqual([]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
  it.each([{ name: "../repo" }, { id: null }, { owner: null }])(
    "rejects malformed fork coordinates %j",
    async (change) => {
      Object.assign(fork, change);
      await expect(run()).rejects.toMatchObject({ code: "invalid_response" });
      expect(requests).toHaveLength(2);
    },
  );
  it("accepts existing renamed forks and verifies the exact upstream objects", async () => {
    await expect(run()).resolves.toEqual({
      owner: "caller",
      repo: "renamed-fork",
    });
    expect(requests.map(({ path }) => path)).toEqual([
      "/user",
      "/repos/upstream/repo/forks",
      "/repos/caller/renamed-fork",
      "/repos/caller/renamed-fork/git/commits/upstream-commit",
      "/repos/caller/renamed-fork/git/trees/upstream-tree",
    ]);
    expect(requests.slice(2).every(({ signal }) => signal?.aborted)).toBe(true);
  });
  it("reuses the returned fork on another submission", async () => {
    await run();
    await run();
    expect(requests.filter(({ method }) => method === "POST")).toHaveLength(2);
  });
  it("waits for Git objects even when metadata is already accessible", async () => {
    vi.useFakeTimers();
    unavailable = 2;
    const result = run();
    const assertion = expect(result).resolves.toEqual({
      owner: "caller",
      repo: "renamed-fork",
    });
    await vi.advanceTimersByTimeAsync(2000);
    await assertion;
    expect(
      requests.filter(({ path }) => path.endsWith("/upstream-commit")),
    ).toHaveLength(3);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([404, 409])(
    "times out transient HTTP %i and succeeds on a later submission",
    async (status) => {
      vi.useFakeTimers();
      failPath = "/repos/caller/renamed-fork";
      failStatus = status;
      const assertion = expect(run()).rejects.toMatchObject({
        code: "fork_not_ready",
      });
      await vi.advanceTimersByTimeAsync(15_000);
      await assertion;
      expect(requests.filter(({ method }) => method !== "GET")).toHaveLength(1);
      expect(vi.getTimerCount()).toBe(0);
      failPath = undefined;
      await expect(run()).resolves.toEqual({
        owner: "caller",
        repo: "renamed-fork",
      });
    },
  );
  it("bounds a stalled readiness request and aborts it", async () => {
    vi.useFakeTimers();
    const fallback = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url, opts) =>
      String(url).endsWith("/renamed-fork")
        ? new Promise<Response>((_, reject) =>
            opts?.signal?.addEventListener("abort", () =>
              reject(new Error("aborted")),
            ),
          )
        : fallback(url, opts),
    );
    const assertion = expect(run()).rejects.toMatchObject({
      code: "fork_not_ready",
    });
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([401, 403, 422, 429, 500])(
    "propagates readiness HTTP %i immediately without retrying",
    async (status) => {
      vi.useFakeTimers();
      failPath = "/repos/caller/renamed-fork";
      failStatus = status;
      await expect(run()).rejects.toMatchObject({ status });
      expect(requests.filter(({ path }) => path === failPath)).toHaveLength(1);
      expect(vi.getTimerCount()).toBe(0);
    },
  );
  it.each(["/user", "/repos/upstream/repo/forks"])(
    "sanitizes failures at %s",
    async (path) => {
      failPath = path;
      await expect(run()).rejects.toMatchObject({
        code: "forbidden",
        message: "GitHub denied access to this resource.",
      });
      expect(
        requests.filter(({ method }) => method !== "GET").length,
      ).toBeLessThanOrEqual(1);
    },
  );
  it.each([
    { owner: { id: 9, login: "caller" } },
    { owner: { id: 3, login: "stranger" } },
    { fork: false },
    { id: 1 },
  ])("rejects unsafe provisioning responses %j", async (change) => {
    Object.assign(fork, change);
    await expect(run()).rejects.toMatchObject({ code: "fork_conflict" });
    expect(requests).toHaveLength(2);
  });
  it.each([
    { source: { id: 9 } },
    { default_branch: REPODOC_BRANCH },
    { id: 9 },
    { owner: { id: 9, login: "caller" } },
    { fork: false },
    { name: "different" },
  ])("rejects unsafe ready metadata %j", async (change) => {
    Object.assign(ready, change);
    await expect(run()).rejects.toMatchObject({ code: "fork_conflict" });
    expect(requests).toHaveLength(3);
  });
  it("rejects missing fork write permission", async () => {
    ready.permissions = { push: false };
    await expect(run()).rejects.toMatchObject({ code: "forbidden" });
  });
  it.each([
    { sha: "different", tree: { sha: base.treeSha } },
    { sha: base.commitSha, tree: { sha: "different" } },
    {},
  ])("rejects mismatched or malformed Git objects %j", async (body) => {
    const fallback = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url, opts) =>
      String(url).endsWith("/upstream-commit")
        ? Promise.resolve(Response.json(body))
        : fallback(url, opts),
    );
    await expect(run()).rejects.toMatchObject({ code: "invalid_response" });
  });
  it("supports upstream repositories that are forks within the same network", async () => {
    ready.source = { id: 7 };
    await expect(
      ensureForkReady(
        "upstream",
        "repo",
        { ...upstream, networkId: 7 },
        base,
        "caller-token",
      ),
    ).resolves.toEqual({ owner: "caller", repo: "renamed-fork" });
  });
  it.each([{ sha: "wrong-tree", tree: [] }, { sha: base.treeSha }, null])(
    "rejects invalid accessible tree objects %j",
    async (body) => {
      const fallback = fetchMock.getMockImplementation()!;
      fetchMock.mockImplementation((url, opts) =>
        String(url).endsWith("/upstream-tree")
          ? Promise.resolve(Response.json(body))
          : fallback(url, opts),
      );
      await expect(run()).rejects.toMatchObject({ code: "invalid_response" });
    },
  );
  it("waits for tree replication after the commit becomes accessible", async () => {
    vi.useFakeTimers();
    const fallback = fetchMock.getMockImplementation()!;
    let treeAttempts = 0;
    fetchMock.mockImplementation((url, opts) =>
      String(url).endsWith("/upstream-tree") && treeAttempts++ === 0
        ? Promise.resolve(Response.json({}, { status: 404 }))
        : fallback(url, opts),
    );
    const assertion = expect(run()).resolves.toEqual({
      owner: "caller",
      repo: "renamed-fork",
    });
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(treeAttempts).toBe(2);
  });
  it("sanitizes network failures without polling", async () => {
    const fallback = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url, opts) =>
      String(url).endsWith("/renamed-fork")
        ? Promise.reject(new Error("provider-secret caller-token"))
        : fallback(url, opts),
    );
    await expect(run()).rejects.toMatchObject({
      code: "network_error",
      message: "Unable to reach the GitHub API.",
    });
    expect(requests).toHaveLength(2);
  });
  it("preserves rate-limit timing metadata without readiness retries", async () => {
    failPath = "/repos/caller/renamed-fork";
    failStatus = 429;
    await expect(run()).rejects.toMatchObject({
      code: "rate_limited",
      retryAfterSeconds: 1,
    });
    expect(requests).toHaveLength(3);
  });
});
