import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getGitHubSession } from "@/lib/auth";
import { POST } from "@/app/api/remediate/route";
import { REPODOC_BRANCH } from "@/src/lib/constants";
import { ScoringEngine } from "@/src/lib/scoring/engine";
import { renderLicense } from "@/src/lib/templates/licenses";
import { TestAuthSession } from "@/components/auth/__tests__/fixtures";
import { ReportController } from "../report-controller";
import { ReportThemeScope } from "../theme-scope";

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

const report = {
  ...ScoringEngine.run({
    owner: "owner",
    repo: "repo",
    defaultBranch: "main",
    paths: new Set(["README.md", "package.json"]),
    generatedAt: "2026-10-17T12:00:00.000Z",
  }),
  shareId: "test1234",
};
const prUrl = "https://github.com/owner/repo/pull/42";
const calls: { method: string; path: string; body: Record<string, unknown> }[] =
  [];
let browserBody: Record<string, unknown> | null;
let fail: boolean;
const tree = ["README.md", "package.json"].map((path) => ({
  path,
  type: "blob",
  mode: "100644",
  sha: `sha-${path}`,
}));

beforeEach(() => {
  calls.length = 0;
  browserBody = null;
  fail = false;
  vi.mocked(getGitHubSession).mockResolvedValue({
    userId: "user",
    githubId: "123",
    username: "caller",
    accessToken: "session-token",
  });
  vi.stubEnv("GITHUB_TOKEN", "unused-environment-token");
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockImplementation(async (url, options) => {
      if (String(url) === "/api/remediate") {
        browserBody = JSON.parse(String(options?.body));
        expect(options?.credentials).toBe("same-origin");
        expect(JSON.stringify(browserBody)).not.toContain("token");
        const response = await POST(
          new Request("http://localhost/api/remediate", {
            ...options,
            headers: {
              "Content-Type": "application/json",
              Origin: "http://localhost",
            },
          }),
        );
        return response;
      }
      const parsed = new URL(String(url));
      expect(parsed.origin).toBe("https://api.github.com");
      expect(new Headers(options?.headers).get("authorization")).toBe(
        "Bearer session-token",
      );
      const path = decodeURIComponent(parsed.pathname).slice(
        "/repos/owner/repo".length,
      );
      const method = options?.method ?? "GET";
      const body = options?.body ? JSON.parse(String(options.body)) : {};
      calls.push({ method, path, body });
      if (fail && method === "POST")
        return Response.json(
          { message: "private upstream data" },
          { status: 403 },
        );
      if (method === "GET" && path === "")
        return Response.json({
          id: 1,
          fork: false,
          permissions: { push: true },
          default_branch: "main",
          description: null,
          topics: [],
        });
      if (
        method === "GET" &&
        ["/git/trees/main", "/git/trees/base-tree"].includes(path)
      )
        return Response.json({
          sha: path.endsWith("main") ? "audit-tree" : "base-tree",
          tree,
          truncated: false,
          url: String(url),
        });
      if (method === "GET" && path.startsWith("/git/blobs/sha-")) {
        const content = path.endsWith("package.json")
          ? '{"scripts":{"test":"vitest run"}}'
          : "# Example\n\n## Installation\n\n## Usage\n";
        return Response.json({
          sha: "content-sha",
          size: Buffer.byteLength(content),
          content: Buffer.from(content).toString("base64"),
          encoding: "base64",
        });
      }
      if (method === "GET" && path === "/git/ref/heads/main")
        return Response.json({
          ref: "refs/heads/main",
          object: { type: "commit", sha: "base-commit" },
        });
      if (method === "GET" && path === "/git/commits/base-commit")
        return Response.json({
          sha: "base-commit",
          tree: { sha: "base-tree" },
        });
      if (method === "POST" && path === "/git/blobs")
        return Response.json({ sha: `blob-${calls.length}` }, { status: 201 });
      if (method === "POST" && path === "/git/trees")
        return Response.json({ sha: "new-tree" }, { status: 201 });
      if (method === "POST" && path === "/git/commits")
        return Response.json({ sha: "new-commit" }, { status: 201 });
      if (method === "POST" && path === "/git/refs")
        return Response.json({
          ref: `refs/heads/${REPODOC_BRANCH}`,
          object: { type: "commit", sha: "new-commit" },
        });
      if (method === "GET" && path === `/compare/main...${REPODOC_BRANCH}`) {
        const entries = calls.find(
          (call) => call.path === "/git/trees" && call.method === "POST",
        )!.body.tree as { path: string }[];
        return Response.json({
          files: entries.map(({ path }) => ({
            filename: path,
            status: "added",
          })),
        });
      }
      if (method === "POST" && path === "/pulls")
        return Response.json({ html_url: prUrl }, { status: 201 });
      throw new Error(`Unexpected request ${method} ${path}`);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

async function start() {
  render(
    <TestAuthSession status="authenticated">
      <ReportThemeScope>
        <ReportController owner="owner" repo="repo" initialReport={report} />
      </ReportThemeScope>
    </TestAuthSession>,
  );
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Fix All" }));
  await screen.findByRole("dialog", { name: "Fix repository findings" });
  // Keep the three original atomic-remediation examples selected.
  for (const checkbox of screen.getAllByRole("checkbox")) {
    const name = document.getElementById(
      checkbox.getAttribute("aria-labelledby")!,
    )?.textContent;
    if (
      name?.toLowerCase().includes("conduct") ||
      name?.toLowerCase().includes("security")
    )
      fireEvent.click(checkbox);
  }
  fireEvent.change(screen.getByRole("textbox", { name: "Copyright holder" }), {
    target: { value: "Explicit Holder" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue to license" }));
  await screen.findByRole("dialog", { name: "Choose a license" });
  expect(calls).toHaveLength(0);
  fireEvent.click(screen.getByRole("radio", { name: "MIT" }));
  fireEvent.click(screen.getByRole("button", { name: "Use selected license" }));
}

it("creates an atomic three-file PR through the real UI, request helper, API, audit, templates, and engine", async () => {
  await start();
  const link = await screen.findByRole("link", { name: /View pull request/ });
  expect(link.getAttribute("href")).toBe(prUrl);
  expect(browserBody).toEqual({
    owner: "owner",
    repo: "repo",
    fixes: ["license", "gitignore", "ci-workflow"],
    licenseChoice: "MIT",
    licenseFullName: "Explicit Holder",
  });
  const writes = calls.filter(({ method }) => method !== "GET");
  expect(writes.map(({ path }) => path)).toEqual([
    "/git/blobs",
    "/git/blobs",
    "/git/blobs",
    "/git/trees",
    "/git/commits",
    "/git/refs",
    "/pulls",
  ]);
  expect(Buffer.from(String(writes[0].body.content), "base64").toString()).toBe(
    renderLicense("MIT", new Date().getUTCFullYear(), "Explicit Holder"),
  );
  expect(writes[3].body).toMatchObject({
    base_tree: "base-tree",
    tree: [
      { path: "LICENSE" },
      { path: ".gitignore" },
      { path: ".github/workflows/ci.yml" },
    ],
  });
  expect(writes[4].body).toMatchObject({
    tree: "new-tree",
    parents: ["base-commit"],
  });
  expect(screen.getByText(/Files included:/).textContent).toContain(
    ".github/workflows/ci.yml",
  );
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe(
    String(report.healthScore),
  );
  expect(
    screen.getByRole<HTMLButtonElement>("button", { name: "Re-audit" })
      .disabled,
  ).toBe(false);
  expect(screen.getByRole("link", { name: /View pull request/ })).toBeDefined();
});

it("surfaces real API permission guidance and short-circuits GitHub writes", async () => {
  fail = true;
  await start();
  expect((await screen.findByRole("alert")).textContent).toMatch(
    /write permissions.*OAuth scopes/,
  );
  expect(screen.queryByRole("link", { name: /View pull request/ })).toBeNull();
  expect(
    calls.filter(({ method }) => method !== "GET").map(({ path }) => path),
  ).toEqual(["/git/blobs"]);
});
