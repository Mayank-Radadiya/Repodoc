// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REPODOC_BRANCH } from "@/src/lib/constants";
import { GitHubApiError } from "@/src/lib/github/client";
import { ScoringEngine } from "@/src/lib/scoring/engine";
import {
  generateCIWorkflow,
  renderCodeOfConduct,
  renderGitignore,
  renderLicense,
  renderSecurityPolicy,
} from "@/src/lib/templates";
import type { TreeEntry } from "@/src/lib/types";
import {
  RemediationEngine,
  RemediationError,
  type RemediationEngineInput,
} from "../engine";

// Keep real request serialization and Git helpers without Bottleneck's wall-clock write delays.
// Retry behavior remains covered by the existing Git API tests.
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
const message = "chore(repodoc): resolve repository health audit findings";
const fetchMock = vi.fn<typeof fetch>();
let tree: TreeEntry[];
let branch: string;
let truncated: boolean;
let returnedTreeSha: string;
let existingBranch: boolean;
let existingPR: boolean;
let failAt: number | undefined;
let failStatus: number;
let calls: { method: string; path: string; body: Record<string, unknown> }[];

function entry(
  path: string,
  type: TreeEntry["type"] = "blob",
  mode?: TreeEntry["mode"],
): TreeEntry {
  return {
    path,
    sha: "existing-sha",
    type,
    mode: mode ?? (type === "tree" ? "040000" : "100644"),
  };
}

function input(
  fixes = ["license", "gitignore", "ci-workflow"],
): RemediationEngineInput {
  return {
    report: ScoringEngine.run({
      paths: new Set<string>(),
      owner: "owner",
      repo: "repo",
    }),
    fixes,
    token: " caller-token ",
    licenseChoice: "MIT",
    licenseFullName: "Jane Example",
    licenseYear: 2026,
    codeOfConductContact: "conduct@example.com",
  };
}

function writes() {
  return calls.filter((call) => call.method !== "GET");
}

beforeEach(() => {
  tree = [entry("package.json")];
  branch = "main";
  truncated = false;
  returnedTreeSha = "base-tree";
  existingBranch = false;
  existingPR = false;
  failAt = undefined;
  failStatus = 500;
  calls = [];
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url, options) => {
    const pathname = decodeURIComponent(new URL(String(url)).pathname);
    const path = pathname.slice("/repos/owner/repo".length);
    const method = options?.method ?? "GET";
    const body = options?.body ? JSON.parse(String(options.body)) : {};
    calls.push({ method, path, body });
    expect(new Headers(options?.headers).get("authorization")).toBe(
      "Bearer caller-token",
    );
    expect(new Headers(options?.headers).has("if-none-match")).toBe(false);
    expect(options?.cache).toBe("no-store");
    if (calls.length === failAt) {
      return Response.json(
        { message: "secret-server-message" },
        {
          status: failStatus,
          headers:
            failStatus === 429
              ? { "retry-after": "31", "x-ratelimit-reset": "1900000000" }
              : {},
        },
      );
    }
    if (method === "GET" && path === "") {
      return Response.json({
        id: 1,
        fork: false,
        permissions: { push: true },
        default_branch: branch,
        description: null,
        topics: [],
      });
    }
    if (method === "GET" && path === `/git/ref/heads/${branch}`) {
      return Response.json({
        ref: `refs/heads/${branch}`,
        object: { type: "commit", sha: "base-commit" },
      });
    }
    if (method === "GET" && path === "/git/commits/base-commit") {
      return Response.json({ sha: "base-commit", tree: { sha: "base-tree" } });
    }
    if (method === "GET" && path === "/git/trees/base-tree") {
      expect(new URL(String(url)).searchParams.get("recursive")).toBe("1");
      return Response.json({
        sha: returnedTreeSha,
        tree,
        truncated,
        url: `${api}/git/trees/base-tree`,
      });
    }
    if (method === "POST" && path === "/git/blobs") {
      return Response.json({ sha: `blob-${writes().length}` }, { status: 201 });
    }
    if (method === "POST" && path === "/git/trees")
      return Response.json({ sha: "new-tree" }, { status: 201 });
    if (method === "POST" && path === "/git/commits")
      return Response.json({ sha: "new-commit" }, { status: 201 });
    if (method === "POST" && path === "/git/refs" && existingBranch) {
      return Response.json(
        { message: "Reference already exists" },
        { status: 422 },
      );
    }
    if (
      (method === "POST" && path === "/git/refs") ||
      (method === "PATCH" && path === `/git/refs/heads/${REPODOC_BRANCH}`)
    ) {
      return Response.json({
        ref: `refs/heads/${REPODOC_BRANCH}`,
        object: { type: "commit", sha: "new-commit" },
      });
    }
    if (method === "GET" && path === `/compare/${branch}...${REPODOC_BRANCH}`) {
      const createdTree = calls.find(
        (call) => call.method === "POST" && call.path === "/git/trees",
      );
      const blobs = createdTree?.body.tree as { path: string }[];
      return Response.json({
        files: blobs.map((blob) => ({ filename: blob.path, status: "added" })),
      });
    }
    if (method === "POST" && path === "/pulls") {
      return existingPR
        ? Response.json({ message: "Already exists" }, { status: 422 })
        : Response.json({ html_url: prUrl }, { status: 201 });
    }
    if (method === "GET" && path === "/pulls" && existingPR) {
      return Response.json([
        {
          state: "open",
          html_url: prUrl,
          head: { label: `owner:${REPODOC_BRANCH}` },
          base: { ref: branch },
        },
      ]);
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

describe("RemediationEngine.execute", () => {
  it("creates three missing files in one tree and commit using real templates and Git helpers", async () => {
    const request = input();
    const original = structuredClone(request);
    await expect(RemediationEngine.execute(request)).resolves.toEqual({
      prUrl,
      filesCreated: ["LICENSE", ".gitignore", ".github/workflows/ci.yml"],
    });
    expect(request).toEqual(original);
    expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
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
    const expected = [
      renderLicense("MIT", 2026, "Jane Example"),
      renderGitignore(tree),
      generateCIWorkflow(tree, { defaultBranch: "main" }).workflow,
    ];
    for (const [index, call] of writes().slice(0, 3).entries()) {
      expect(call.body.encoding).toBe("base64");
      expect(
        Buffer.from(String(call.body.content), "base64").toString("utf8"),
      ).toBe(expected[index]);
    }
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

  it("supports the instance method and both policy templates with explicit contact", async () => {
    await expect(
      new RemediationEngine().execute(
        input(["security-policy", "code-of-conduct"]),
      ),
    ).resolves.toEqual({
      prUrl,
      filesCreated: ["SECURITY.md", "CODE_OF_CONDUCT.md"],
    });
    const contents = writes()
      .slice(0, 2)
      .map((call) =>
        Buffer.from(String(call.body.content), "base64").toString("utf8"),
      );
    expect(contents).toEqual([
      renderSecurityPolicy({ projectName: "repo" }),
      renderCodeOfConduct({ contactMethod: "conduct@example.com" }),
    ]);
    expect(contents.join("\n")).not.toContain("[INSERT CONTACT METHOD]");
  });

  it.each(["node", "python", "rust", "go", "generic"])(
    "uses the fresh tree for %s templates",
    async (language) => {
      const manifests: Record<string, string> = {
        node: "package.json",
        python: "pyproject.toml",
        rust: "Cargo.toml",
        go: "go.mod",
      };
      tree = manifests[language] ? [entry(manifests[language])] : [];
      await RemediationEngine.execute(input(["gitignore", "ci-workflow"]));
      expect(
        Buffer.from(String(writes()[0].body.content), "base64").toString(),
      ).toBe(renderGitignore(tree));
      expect(
        Buffer.from(String(writes()[1].body.content), "base64").toString(),
      ).toBe(generateCIWorkflow(tree, { defaultBranch: "main" }).workflow);
    },
  );

  it("uses the current default branch instead of the stale report branch", async () => {
    branch = "release/stable";
    await RemediationEngine.execute(input(["ci-workflow"]));
    expect(
      Buffer.from(String(writes()[0].body.content), "base64").toString(),
    ).toBe(generateCIWorkflow(tree, { defaultBranch: branch }).workflow);
    expect(writes().at(-1)?.body.base).toBe(branch);
  });

  it("defaults the license year to the current UTC year", async () => {
    const request = input(["license"]);
    delete request.licenseYear;
    await RemediationEngine.execute(request);
    expect(
      Buffer.from(String(writes()[0].body.content), "base64").toString(),
    ).toBe(renderLicense("MIT", new Date().getUTCFullYear(), "Jane Example"));
  });

  it.each([
    "MIT",
    "Apache-2.0",
    "BSD-3-Clause",
    "GPL-3.0",
    "GPL-3.0-only",
    "MPL-2.0",
  ] as const)(
    "renders the explicitly selected %s license",
    async (licenseChoice) => {
      await RemediationEngine.execute({ ...input(["license"]), licenseChoice });
      expect(
        Buffer.from(String(writes()[0].body.content), "base64").toString(),
      ).toBe(renderLicense(licenseChoice, 2026, "Jane Example"));
    },
  );

  it("deduplicates selections and retains the first selection order", async () => {
    await expect(
      RemediationEngine.execute(input(["gitignore", "license", "gitignore"])),
    ).resolves.toEqual({ prUrl, filesCreated: [".gitignore", "LICENSE"] });
    expect(writes().filter((call) => call.path === "/git/blobs")).toHaveLength(
      2,
    );
  });

  it("ignores report-provided paths and never creates an arbitrary destination", async () => {
    const request = input(["gitignore"]);
    request.report.checks.find(
      (check) => check.id === "gitignore",
    )!.remediation!.targetPath = "../../unexpected";
    await expect(RemediationEngine.execute(request)).resolves.toEqual({
      prUrl,
      filesCreated: [".gitignore"],
    });
    expect(calls.find((call) => call.path === "/git/trees")?.body.tree).toEqual(
      [{ path: ".gitignore", sha: "blob-1", mode: "100644", type: "blob" }],
    );
  });

  it.each([
    ["license", "LiCeNcE.md"],
    ["license", ".github/LICENSE.txt"],
    ["gitignore", ".GITIGNORE"],
    ["ci-workflow", ".github/workflows/existing.yaml"],
    ["security-policy", ".GITHUB/security.MD"],
    ["code-of-conduct", "docs/CODE_OF_CONDUCT.md"],
  ])("skips resolved %s from fresh alternate path %s", async (fix, path) => {
    tree.push(entry(path));
    const other = fix === "gitignore" ? "security-policy" : "gitignore";
    const remainingPath = other === "gitignore" ? ".gitignore" : "SECURITY.md";
    await expect(
      RemediationEngine.execute(input([fix, other])),
    ).resolves.toEqual({ prUrl, filesCreated: [remainingPath] });
    expect(writes().filter((call) => call.path === "/git/blobs")).toHaveLength(
      1,
    );
  });

  it("returns typed no_changes without writes when all selected findings are resolved", async () => {
    tree.push(
      entry("LICENSE"),
      entry(".gitignore"),
      entry(".github/workflows/ci.yml"),
    );
    await expect(RemediationEngine.execute(input())).rejects.toMatchObject({
      name: "RemediationError",
      code: "no_changes",
    });
    expect(writes()).toEqual([]);
  });

  it.each([
    entry(".GITHUB", "blob"),
    entry(".github/workflows", "blob", "120000"),
    entry(".github", "commit", "160000"),
    entry(".github/workflows/ci.yml", "tree"),
    entry(".github/workflows/ci.yml", "blob", "120000"),
    entry(".gitignore", "commit", "160000"),
    entry("LICENSE", "tree"),
  ])(
    "rejects occupied destination or parent $path ($mode) before any writes",
    async (conflict) => {
      tree.push(conflict);
      await expect(RemediationEngine.execute(input())).rejects.toMatchObject({
        code: "path_conflict",
      });
      expect(writes()).toEqual([]);
    },
  );

  it("retains conflicting path types when multiple paths differ only by case", async () => {
    tree.push(entry(".github", "blob", "120000"), entry(".GITHUB", "tree"));
    await expect(
      RemediationEngine.execute(input(["ci-workflow"])),
    ).rejects.toMatchObject({ code: "path_conflict" });
    expect(writes()).toEqual([]);
  });

  it("retains conflicting destination types when paths differ only by case", async () => {
    tree.push(entry("LICENSE", "blob", "120000"), entry("license"));
    await expect(
      RemediationEngine.execute(input(["license"])),
    ).rejects.toMatchObject({ code: "path_conflict" });
    expect(writes()).toEqual([]);
  });

  it("preserves ordinary parent directories", async () => {
    tree.push(entry(".github", "tree"), entry(".github/workflows", "tree"));
    await expect(
      RemediationEngine.execute(input(["ci-workflow"])),
    ).resolves.toMatchObject({ prUrl });
  });

  it("rejects truncated tree data without writes", async () => {
    truncated = true;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(RemediationEngine.execute(input())).rejects.toMatchObject({
      code: "invalid_response",
    });
    expect(writes()).toEqual([]);
  });

  it("rejects a tree SHA that does not match the base commit", async () => {
    returnedTreeSha = "unrelated-tree";
    await expect(RemediationEngine.execute(input())).rejects.toMatchObject({
      code: "invalid_response",
    });
    expect(writes()).toEqual([]);
  });

  it("rejects a missing tree after an unexpected 304", async () => {
    const handler = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url, options) =>
      String(url).includes("/git/trees/")
        ? Promise.resolve(new Response(null, { status: 304 }))
        : handler(url, options),
    );
    await expect(RemediationEngine.execute(input())).rejects.toMatchObject({
      code: "invalid_response",
    });
    expect(writes()).toEqual([]);
  });

  it("refuses to overwrite the default branch when it is the remediation branch", async () => {
    branch = REPODOC_BRANCH;
    await expect(RemediationEngine.execute(input())).rejects.toMatchObject({
      code: "invalid_input",
    });
    expect(calls).toHaveLength(1);
  });

  it("reuses existing branch and PR without changing the default branch", async () => {
    existingBranch = true;
    existingPR = true;
    await expect(
      RemediationEngine.execute(input(["gitignore"])),
    ).resolves.toMatchObject({ prUrl });
    expect(writes().find((call) => call.method === "PATCH")).toEqual({
      method: "PATCH",
      path: `/git/refs/heads/${REPODOC_BRANCH}`,
      body: { sha: "new-commit", force: true },
    });
    expect(calls.at(-1)?.path).toBe("/pulls");
  });

  it.each(Array.from({ length: 12 }, (_, index) => index + 1))(
    "stops immediately when pipeline request %i fails",
    async (stage) => {
      failAt = stage;
      await expect(RemediationEngine.execute(input())).rejects.toBeInstanceOf(
        GitHubApiError,
      );
      expect(calls).toHaveLength(stage);
      expect(calls.some((call) => call.method === "DELETE")).toBe(false);
    },
  );

  it("preserves rate-limit metadata and sanitizes errors", async () => {
    failAt = 5;
    failStatus = 429;
    await expect(RemediationEngine.execute(input())).rejects.toMatchObject({
      code: "rate_limited",
      retryAfterSeconds: 31,
      rateLimitResetAt: 1900000000,
      message: "GitHub API rate limit exceeded. Try again later.",
    });
    expect(calls).toHaveLength(5);
  });

  const invalidCases: [string, (request: RemediationEngineInput) => unknown][] =
    [
      ["missing input", () => undefined],
      ["missing report", (request) => ({ ...request, report: undefined })],
      ["malformed report", (request) => ({ ...request, report: {} })],
      [
        "invalid coordinates",
        (request) => ({
          ...request,
          report: { ...request.report, owner: "../owner" },
        }),
      ],
      ["missing token", (request) => ({ ...request, token: undefined })],
      ["blank token", (request) => ({ ...request, token: "  " })],
      [
        "header injection",
        (request) => ({ ...request, token: "secret\nvalue" }),
      ],
      ["empty selections", (request) => ({ ...request, fixes: [] })],
      ["non-array selections", (request) => ({ ...request, fixes: "license" })],
      ["unsupported fix", (request) => ({ ...request, fixes: ["readme"] })],
      ["prototype fix", (request) => ({ ...request, fixes: ["__proto__"] })],
      ["non-string fix", (request) => ({ ...request, fixes: [1] })],
      [
        "absent report check",
        (request) => ({
          ...request,
          report: {
            ...request.report,
            checks: request.report.checks.filter(
              (check) => check.id !== "license",
            ),
          },
        }),
      ],
      [
        "passed check",
        (request) => {
          request.report.checks.find(
            (check) => check.id === "license",
          )!.passed = true;
          return request;
        },
      ],
      [
        "manual check",
        (request) => {
          request.report.checks.find(
            (check) => check.id === "license",
          )!.remediation!.canAutomate = false;
          return request;
        },
      ],
      [
        "no remediation",
        (request) => {
          delete request.report.checks.find((check) => check.id === "license")!
            .remediation;
          return request;
        },
      ],
      [
        "missing license choice",
        (request) => ({ ...request, licenseChoice: undefined }),
      ],
      [
        "unsupported license",
        (request) => ({ ...request, licenseChoice: "unknown" }),
      ],
      [
        "missing holder",
        (request) => ({ ...request, licenseFullName: undefined }),
      ],
      ["blank holder", (request) => ({ ...request, licenseFullName: " " })],
      [
        "multiline holder",
        (request) => ({ ...request, licenseFullName: "Jane\nExample" }),
      ],
      ["invalid year", (request) => ({ ...request, licenseYear: 999 })],
      ["null year", (request) => ({ ...request, licenseYear: null })],
      [
        "missing conduct contact",
        (request) => ({
          ...request,
          fixes: ["code-of-conduct"],
          codeOfConductContact: undefined,
        }),
      ],
      [
        "blank conduct contact",
        (request) => ({
          ...request,
          fixes: ["code-of-conduct"],
          codeOfConductContact: " ",
        }),
      ],
      [
        "multiline conduct contact",
        (request) => ({
          ...request,
          fixes: ["code-of-conduct"],
          codeOfConductContact: "one\ntwo",
        }),
      ],
    ];
  it.each(invalidCases)(
    "rejects %s before network calls",
    async (_label, modify) => {
      // Deliberately exercise malformed runtime inputs.
      await expect(
        RemediationEngine.execute(modify(input()) as RemediationEngineInput),
      ).rejects.toBeInstanceOf(RemediationError);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
