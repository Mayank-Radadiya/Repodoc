// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGitHubSession } from "@/lib/auth";
import { REPODOC_BRANCH } from "@/src/lib/constants";
import {
  generateCIWorkflow,
  renderGitignore,
  renderLicense,
} from "@/src/lib/templates";
import type { TreeEntry } from "@/src/lib/types";
import { POST } from "../route";

vi.mock("@/lib/auth", () => ({ getGitHubSession: vi.fn() }));

// Keep real GitHub request serialization without Bottleneck's write delays.
// Existing Git API tests cover the shared client's retry behavior.
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

const api = "https://api.github.com/repos/owner/repo";
const prUrl = "https://github.com/owner/repo/pull/42";
const fetchMock = vi.fn<typeof fetch>();
const message = "chore(repodoc): resolve repository health audit findings";
let auditTree: TreeEntry[];
let freshTree: TreeEntry[];
let auditTruncated: boolean;
let freshTruncated: boolean;
let freshSha: string;
let failAt: string | undefined;
let calls: { method: string; path: string; body: Record<string, unknown> }[];

function entry(
  path: string,
  type: TreeEntry["type"] = "blob",
  mode?: TreeEntry["mode"],
): TreeEntry {
  return {
    path,
    type,
    mode: mode ?? (type === "tree" ? "040000" : "100644"),
    sha: `sha-${path}`,
  };
}

function request(fixes = ["license", "gitignore", "ci-workflow"]): Request {
  return new Request("https://repodoc.test/api/remediate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://repodoc.test",
    },
    body: JSON.stringify({
      owner: "owner",
      repo: "repo",
      fixes,
      licenseChoice: "MIT",
      licenseFullName: "Jane Example",
    }),
  });
}

function writes() {
  return calls.filter(({ method }) => method !== "GET");
}

function blob(content: string): Response {
  return Response.json({
    sha: "content-sha",
    size: Buffer.byteLength(content),
    content: Buffer.from(content).toString("base64"),
    encoding: "base64",
  });
}

beforeEach(() => {
  vi.mocked(getGitHubSession).mockReset().mockResolvedValue({
    userId: "user-id",
    githubId: "123",
    username: "caller",
    accessToken: "session-token",
  });
  auditTree = [entry("package.json"), entry("README.md")];
  freshTree = [...auditTree];
  auditTruncated = false;
  freshTruncated = false;
  freshSha = "base-tree";
  failAt = undefined;
  calls = [];
  fetchMock.mockReset().mockImplementation(async (url, options) => {
    const parsedUrl = new URL(String(url));
    expect(parsedUrl.origin).toBe("https://api.github.com");
    const path = decodeURIComponent(parsedUrl.pathname).slice(
      "/repos/owner/repo".length,
    );
    const method = options?.method ?? "GET";
    const body = options?.body ? JSON.parse(String(options.body)) : {};
    calls.push({ method, path, body });
    expect(new Headers(options?.headers).get("authorization")).toBe(
      "Bearer session-token",
    );
    expect(new Headers(options?.headers).has("if-none-match")).toBe(false);
    expect(options?.cache).toBe("no-store");
    if (`${method} ${path}` === failAt) {
      return Response.json(
        { message: "private-upstream-detail session-token" },
        { status: 403 },
      );
    }
    if (method === "GET" && path === "") {
      return Response.json({
        id: 1,
        fork: false,
        permissions: { push: true },
        default_branch: "main",
        description: null,
        topics: [],
      });
    }
    if (
      method === "GET" &&
      ["/git/trees/main", "/git/trees/base-tree"].includes(path)
    ) {
      expect(parsedUrl.searchParams.get("recursive")).toBe("1");
      const audit = path === "/git/trees/main";
      return Response.json({
        sha: audit ? "audit-tree" : freshSha,
        tree: audit ? auditTree : freshTree,
        truncated: audit ? auditTruncated : freshTruncated,
        url: `${api}${path}`,
      });
    }
    if (method === "GET" && path === "/git/blobs/sha-package.json") {
      return blob('{"scripts":{"test":"vitest run"}}');
    }
    if (method === "GET" && path === "/git/blobs/sha-README.md") {
      return blob("# Example\n\n## Installation\n\n## Usage\n");
    }
    if (method === "GET" && path === "/git/ref/heads/main") {
      return Response.json({
        ref: "refs/heads/main",
        object: { type: "commit", sha: "base-commit" },
      });
    }
    if (method === "GET" && path === "/git/commits/base-commit") {
      return Response.json({ sha: "base-commit", tree: { sha: "base-tree" } });
    }
    if (method === "POST" && path === "/git/blobs") {
      return Response.json({ sha: `blob-${writes().length}` }, { status: 201 });
    }
    if (method === "POST" && path === "/git/trees") {
      return Response.json({ sha: "new-tree" }, { status: 201 });
    }
    if (method === "POST" && path === "/git/commits") {
      return Response.json({ sha: "new-commit" }, { status: 201 });
    }
    if (method === "POST" && path === "/git/refs") {
      return Response.json({
        ref: `refs/heads/${REPODOC_BRANCH}`,
        object: { type: "commit", sha: "new-commit" },
      });
    }
    if (method === "GET" && path === `/compare/main...${REPODOC_BRANCH}`) {
      const created = calls.find(
        ({ method, path }) => method === "POST" && path === "/git/trees",
      );
      const blobs = created?.body.tree as { path: string }[];
      return Response.json({
        files: blobs.map(({ path }) => ({ filename: path, status: "added" })),
      });
    }
    if (method === "POST" && path === "/pulls") {
      return Response.json({ html_url: prUrl }, { status: 201 });
    }
    throw new Error(`Unexpected request: ${method} ${path}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GITHUB_TOKEN", "environment-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/remediate real pipeline with mocked GitHub HTTP", () => {
  it("audits then creates three files in one commit and opens a PR with the session token throughout", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      prUrl,
      filesCreated: ["LICENSE", ".gitignore", ".github/workflows/ci.yml"],
    });
    expect(
      calls.slice(0, 2).map(({ method, path }) => `${method} ${path}`),
    ).toEqual(["GET ", "GET /git/trees/main"]);
    expect(
      calls
        .slice(2, 4)
        .map(({ path }) => path)
        .sort(),
    ).toEqual(["/git/blobs/sha-README.md", "/git/blobs/sha-package.json"]);
    expect(
      calls.slice(4).map(({ method, path }) => `${method} ${path}`),
    ).toEqual([
      "GET ",
      "GET /git/ref/heads/main",
      "GET /git/commits/base-commit",
      "GET /git/trees/base-tree",
      "POST /git/blobs",
      "POST /git/blobs",
      "POST /git/blobs",
      "POST /git/trees",
      "POST /git/commits",
      "POST /git/refs",
      `GET /compare/main...${REPODOC_BRANCH}`,
      "POST /pulls",
    ]);
    const expectedContents = [
      renderLicense("MIT", new Date().getUTCFullYear(), "Jane Example"),
      renderGitignore(freshTree),
      generateCIWorkflow(freshTree, { defaultBranch: "main" }).workflow,
    ];
    expect(
      writes()
        .slice(0, 3)
        .map(({ body }) => ({
          encoding: body.encoding,
          content: Buffer.from(String(body.content), "base64").toString("utf8"),
        })),
    ).toEqual(
      expectedContents.map((content) => ({ encoding: "base64", content })),
    );
    expect(writes()[3].body).toEqual({
      base_tree: "base-tree",
      tree: [
        { path: "LICENSE", sha: "blob-1", mode: "100644", type: "blob" },
        { path: ".gitignore", sha: "blob-2", mode: "100644", type: "blob" },
        {
          path: ".github/workflows/ci.yml",
          sha: "blob-3",
          mode: "100644",
          type: "blob",
        },
      ],
    });
    expect(writes()[4].body).toEqual({
      message,
      tree: "new-tree",
      parents: ["base-commit"],
    });
    expect(writes()[5].body).toEqual({
      ref: `refs/heads/${REPODOC_BRANCH}`,
      sha: "new-commit",
    });
    expect(writes()[6].body).toMatchObject({
      head: REPODOC_BRANCH,
      base: "main",
      title: message,
    });
    expect(String(writes()[6].body.body)).toContain("LICENSE");
  });

  it("rejects an already-passing finding from the fresh audit without writes", async () => {
    auditTree.push(entry(".gitignore"));
    const response = await POST(request(["gitignore"]));
    expect(response.status).toBe(400);
    expect(writes()).toEqual([]);
    expect(calls.some(({ path }) => path === "/git/ref/heads/main")).toBe(
      false,
    );
  });

  it("skips a finding resolved between the audit and engine snapshot and fixes the remaining file", async () => {
    freshTree.push(entry(".gitignore"));
    const response = await POST(request(["gitignore", "ci-workflow"]));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      prUrl,
      filesCreated: [".github/workflows/ci.yml"],
    });
    const created = writes().find(({ path }) => path === "/git/trees");
    expect(created?.body.tree).toEqual([
      {
        path: ".github/workflows/ci.yml",
        sha: "blob-1",
        type: "blob",
        mode: "100644",
      },
    ]);
  });

  it("returns 409 without writes if all findings resolve after the audit", async () => {
    freshTree.push(entry(".gitignore"));
    const response = await POST(request(["gitignore"]));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: expect.stringContaining("already resolved"),
    });
    expect(writes()).toEqual([]);
  });

  it.each(["ancestor", "destination"])(
    "rejects a conflicting %s before any writes",
    async (conflict) => {
      freshTree.push(
        conflict === "ancestor"
          ? entry(".github")
          : entry(".github/workflows/ci.yml", "blob", "120000"),
      );
      const response = await POST(request(["ci-workflow"]));
      expect(response.status).toBe(409);
      expect(writes()).toEqual([]);
    },
  );

  it.each(["audit", "engine", "sha"])(
    "rejects an incomplete or mismatched %s snapshot before writes",
    async (stage) => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      if (stage === "audit") auditTruncated = true;
      if (stage === "engine") freshTruncated = true;
      if (stage === "sha") freshSha = "wrong-tree";
      const response = await POST(request());
      expect(response.status).toBe(502);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(writes()).toEqual([]);
      if (stage === "audit") expect(calls).toHaveLength(2);
    },
  );

  it("stops after a read permission failure without writes", async () => {
    failAt = "GET /git/ref/heads/main";
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(JSON.stringify(await response.json())).not.toContain(
      "private-upstream-detail",
    );
    expect(writes()).toEqual([]);
    expect(calls.at(-1)?.path).toBe("/git/ref/heads/main");
  });

  it("does not publish a commit, branch, or PR after a blob failure", async () => {
    failAt = "POST /git/blobs";
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: expect.stringContaining("write permissions"),
    });
    expect(writes().map(({ path }) => path)).toEqual(["/git/blobs"]);
  });
});
