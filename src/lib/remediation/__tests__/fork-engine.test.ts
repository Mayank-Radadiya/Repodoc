// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGitHubSession } from "@/lib/auth";
import { POST } from "@/app/api/remediate/route";
import { REPODOC_BRANCH } from "@/src/lib/constants";
import { ScoringEngine } from "@/src/lib/scoring/engine";
import type { TreeEntry } from "@/src/lib/types";
import { RemediationEngine } from "../engine";

vi.mock("@/lib/auth", () => ({ getGitHubSession: vi.fn() }));
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
const upstream = "/repos/upstream/repo";
const target = "/repos/caller/renamed";
const prUrl = "https://github.com/upstream/repo/pull/42";
let calls: { method: string; path: string; body: Record<string, unknown> }[];
let tree: TreeEntry[];
let existing: boolean;
let forkFailure: number | undefined;
let push: boolean;
let oauthScopes: string | undefined;

function input() {
  return {
    report: ScoringEngine.run({
      owner: "upstream",
      repo: "repo",
      paths: new Set<string>(),
    }),
    token: "session-token",
    fixes: ["license", "gitignore", "ci-workflow"],
    licenseChoice: "MIT" as const,
    licenseFullName: "Explicit Holder",
  };
}
function request() {
  return new Request("https://repodoc.test/api/remediate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://repodoc.test",
    },
    body: JSON.stringify({
      owner: "upstream",
      repo: "repo",
      fixes: input().fixes,
      licenseChoice: "MIT",
      licenseFullName: "Explicit Holder",
      token: "untrusted-token",
    }),
  });
}
function writes() {
  return calls.filter(({ method }) => method !== "GET");
}

beforeEach(() => {
  calls = [];
  tree = [];
  existing = false;
  forkFailure = undefined;
  push = false;
  oauthScopes = undefined;
  vi.mocked(getGitHubSession).mockResolvedValue({
    userId: "user",
    githubId: "3",
    username: "caller",
    accessToken: "session-token",
  });
  fetchMock.mockReset().mockImplementation(async (url, options) => {
    const parsed = new URL(String(url));
    const path = decodeURIComponent(parsed.pathname);
    const method = options?.method ?? "GET";
    const body = options?.body ? JSON.parse(String(options.body)) : {};
    calls.push({ method, path, body });
    expect(parsed.origin).toBe("https://api.github.com");
    expect(new Headers(options?.headers).get("authorization")).toBe(
      "Bearer session-token",
    );
    expect(options?.cache).toBe("no-store");
    if (path === upstream)
      return Response.json({
        id: 1,
        fork: false,
        default_branch: "develop",
        permissions: { push },
        description: null,
        topics: [],
      }, { headers: oauthScopes === undefined ? {} : { "x-oauth-scopes": oauthScopes } });
    if (path === `${upstream}/git/ref/heads/develop`)
      return Response.json({
        ref: "refs/heads/develop",
        object: { type: "commit", sha: "base-commit" },
      });
    if (path.endsWith("/git/commits/base-commit"))
      return Response.json({ sha: "base-commit", tree: { sha: "base-tree" } });
    if (
      method === "GET" &&
      (path.endsWith("/git/trees/base-tree") ||
        path.endsWith("/git/trees/develop"))
    )
      return Response.json({
        sha: "base-tree",
        tree,
        truncated: false,
        url: `https://api.github.com${path}`,
      });
    if (path === "/user") return Response.json({ id: 3, login: "caller" });
    if (path === `${upstream}/forks`)
      return Response.json(
        {
          id: 2,
          fork: true,
          name: "renamed",
          owner: { id: 3, login: "caller" },
        },
        { status: 202 },
      );
    if (path === target)
      return forkFailure
        ? Response.json(
            { message: "provider-secret session-token" },
            { status: forkFailure },
          )
        : Response.json({
            id: 2,
            fork: true,
            name: "renamed",
            owner: { id: 3, login: "caller" },
            source: { id: 1 },
            default_branch: "stale-main",
            permissions: { push: true },
          });
    const writeRepo = push ? upstream : target;
    if (path === `${writeRepo}/git/blobs`)
      return Response.json({ sha: `blob-${writes().length}` }, { status: 201 });
    if (path === `${writeRepo}/git/trees`)
      return Response.json({ sha: "new-tree" }, { status: 201 });
    if (path === `${writeRepo}/git/commits`)
      return Response.json({ sha: "new-commit" }, { status: 201 });
    if (path === `${writeRepo}/git/refs` && existing)
      return Response.json({}, { status: 422 });
    if (
      path === `${writeRepo}/git/refs` ||
      path === `${writeRepo}/git/refs/heads/${REPODOC_BRANCH}`
    )
      return Response.json({
        ref: `refs/heads/${REPODOC_BRANCH}`,
        object: { type: "commit", sha: "new-commit" },
      });
    const head = push ? REPODOC_BRANCH : `caller:${REPODOC_BRANCH}`;
    const compareBase = push ? "develop" : "upstream:develop";
    if (path === `${upstream}/compare/${compareBase}...${head}`)
      return Response.json({
        files: ["LICENSE", ".gitignore", ".github/workflows/ci.yml"].map(
          (filename) => ({ filename, status: "added" }),
        ),
      });
    if (path === `${upstream}/pulls`) {
      if (method === "GET") {
        expect(parsed.searchParams.get("head")).toBe(
          push ? `upstream:${head}` : head,
        );
        return Response.json([
          {
            state: "open",
            html_url: prUrl,
            head: { label: push ? `upstream:${head}` : head },
            base: { ref: "develop" },
          },
        ]);
      }
      return existing
        ? Response.json({}, { status: 422 })
        : Response.json({ html_url: prUrl }, { status: 201 });
    }
    throw new Error(`Unexpected request: ${method} ${path}`);
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

describe("fork remediation through real GitHub helpers", () => {
  it.each([false, true])("rejects missing workflow permission before writes (push: %s)", async (canPush) => {
    push = canPush;
    oauthScopes = "read:user, public_repo";
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "workflow_scope_required" });
    expect(writes()).toEqual([]);
  });

  it.each(["", "read:user, user:email", "workflow"])("rejects missing repository permission before writes (%s)", async (scopes) => {
    oauthScopes = scopes;
    await expect(RemediationEngine.execute(input())).rejects.toMatchObject({ code: "repository_scope_required" });
    expect(writes()).toEqual([]);
  });

  it("creates a fork PR without workflow scope when CI is deselected", async () => {
    oauthScopes = "read:user, public_repo";
    await expect(RemediationEngine.execute({ ...input(), fixes: ["gitignore"] })).resolves.toEqual({ prUrl, filesCreated: [".gitignore"] });
    expect(writes().find(({ path }) => path.endsWith("/pulls"))?.body.head).toBe(`caller:${REPODOC_BRANCH}`);
  });

  it.each(["public_repo, workflow", "repo, workflow"])("accepts granted OAuth scopes (%s)", async (scopes) => {
    oauthScopes = scopes;
    await expect(RemediationEngine.execute(input())).resolves.toMatchObject({ prUrl });
  });

  it.each([false, true])(
    "creates one upstream-based commit and PR (existing fork branch/PR: %s)",
    async (reuse) => {
      existing = reuse;
      await expect(RemediationEngine.execute(input())).resolves.toEqual({
        prUrl,
        filesCreated: ["LICENSE", ".gitignore", ".github/workflows/ci.yml"],
      });
      expect(
        writes().filter(({ path }) => path.endsWith("/git/blobs")),
      ).toHaveLength(3);
      expect(
        writes().find(({ path }) => path.endsWith("/git/trees"))?.body
          .base_tree,
      ).toBe("base-tree");
      expect(
        writes().find(({ path }) => path.endsWith("/git/commits"))?.body
          .parents,
      ).toEqual(["base-commit"]);
      const pr = writes().find(({ path }) => path.endsWith("/pulls"));
      expect(pr?.path).toBe(`${upstream}/pulls`);
      expect(pr?.body).toMatchObject({
        head: `caller:${REPODOC_BRANCH}`,
        base: "develop",
      });
      expect(
        writes()
          .filter(({ path }) => path.startsWith(upstream))
          .map(({ path }) => path),
      ).toEqual([`${upstream}/forks`, `${upstream}/pulls`]);
      expect(
        writes()
          .filter(({ path }) => path.includes("/git/refs"))
          .every(
            ({ path }) =>
              path === `${target}/git/refs` ||
              path === `${target}/git/refs/heads/${REPODOC_BRANCH}`,
          ),
      ).toBe(true);
      expect(
        calls
          .filter(
            ({ method, path }) => method === "GET" && path.startsWith(target),
          )
          .map(({ path }) => path),
      ).toEqual([
        target,
        `${target}/git/commits/base-commit`,
        `${target}/git/trees/base-tree`,
      ]);
    },
  );
  it("preserves the direct flow without identity or fork requests when push is true", async () => {
    push = true;
    await RemediationEngine.execute(input());
    expect(
      calls.some(
        ({ path }) =>
          path === "/user" ||
          path.endsWith("/forks") ||
          path.startsWith(target),
      ),
    ).toBe(false);
  });
  it("does not provision a fork when findings are already resolved", async () => {
    tree = [
      { path: ".gitignore", type: "blob", mode: "100644", sha: "existing" },
    ];
    await expect(
      RemediationEngine.execute({ ...input(), fixes: ["gitignore"] }),
    ).rejects.toMatchObject({ code: "no_changes" });
    expect(writes()).toEqual([]);
  });
  it("does not provision a fork for a path conflict", async () => {
    tree = [{ path: ".github", type: "blob", mode: "120000", sha: "symlink" }];
    await expect(RemediationEngine.execute(input())).rejects.toMatchObject({
      code: "path_conflict",
    });
    expect(writes()).toEqual([]);
  });
  it("validates explicit inputs before any GitHub requests", async () => {
    await expect(
      RemediationEngine.execute({ ...input(), licenseFullName: "" }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(calls).toEqual([]);
  });
  it("audits through the route and uses the session credential for fork creation and all writes", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      prUrl,
      filesCreated: ["LICENSE", ".gitignore", ".github/workflows/ci.yml"],
    });
    expect(
      writes().filter(({ path }) => path.endsWith("/git/commits")),
    ).toHaveLength(1);
  });
  it("maps a real readiness deadline to a retryable API response with no Git writes", async () => {
    vi.useFakeTimers();
    forkFailure = 404;
    const responsePromise = POST(request());
    await vi.advanceTimersByTimeAsync(15_000);
    const response = await responsePromise;
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("15");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toContain("submit remediation again");
    expect(writes().map(({ path }) => path)).toEqual([`${upstream}/forks`]);
  });
  it("maps unsafe fork metadata to a conflict before any Git writes", async () => {
    const fallback = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url, opts) =>
      String(url).endsWith("/caller/renamed")
        ? Promise.resolve(
            Response.json({
              id: 2,
              fork: true,
              name: "renamed",
              owner: { id: 3, login: "caller" },
              source: { id: 999 },
              default_branch: "main",
              permissions: { push: true },
            }),
          )
        : fallback(url, opts),
    );
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toContain("cannot safely be used");
    expect(writes().map(({ path }) => path)).toEqual([`${upstream}/forks`]);
  });
  it.each([401, 403, 429])(
    "maps fork HTTP %i failures without leaking credentials or writing Git objects",
    async (status) => {
      forkFailure = status;
      const response = await POST(request());
      expect(response.status).toBe(status);
      expect(await response.text()).not.toMatch(
        /provider-secret|session-token|environment-token/,
      );
      expect(writes().map(({ path }) => path)).toEqual([`${upstream}/forks`]);
    },
  );
});
