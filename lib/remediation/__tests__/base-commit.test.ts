// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchBaseCommit } from "../git-api";

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
const reference = {
  ref: "refs/heads/release/stable",
  object: { type: "commit", sha: "parent-sha" },
};
const commit = { sha: "parent-sha", tree: { sha: "tree-sha" } };
const resolve = () =>
  fetchBaseCommit("owner", "repo", "release/stable", "caller-token");

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GITHUB_TOKEN", "environment-token");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchBaseCommit", () => {
  it("reads a single branch snapshot and its exact commit tree with caller authentication", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json(reference))
      .mockResolvedValueOnce(Response.json(commit));
    await expect(resolve()).resolves.toEqual({
      commitSha: "parent-sha",
      treeSha: "tree-sha",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      decodeURIComponent(new URL(String(fetchMock.mock.calls[0][0])).pathname),
    ).toBe("/repos/owner/repo/git/ref/heads/release/stable");
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.github.com/repos/owner/repo/git/commits/parent-sha",
    );
    for (const [, options] of fetchMock.mock.calls) {
      expect(options?.method).toBe("GET");
      expect(options?.cache).toBe("no-store");
      expect(new Headers(options?.headers).get("authorization")).toBe(
        "Bearer caller-token",
      );
    }
  });

  it.each([
    null,
    [],
    {},
    { ...reference, ref: "refs/heads/wrong" },
    { ...reference, object: null },
    { ...reference, object: { type: "tree", sha: "parent-sha" } },
    { ...reference, object: { type: "commit", sha: " " } },
  ])("rejects invalid reference %j", async (body) => {
    fetchMock.mockResolvedValueOnce(Response.json(body));
    await expect(resolve()).rejects.toMatchObject({ code: "invalid_response" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    null,
    [],
    {},
    { ...commit, sha: "different" },
    { ...commit, tree: null },
    { ...commit, tree: { sha: " " } },
    { ...commit, tree: { sha: 5 } },
  ])("rejects invalid commit %j", async (body) => {
    fetchMock
      .mockResolvedValueOnce(Response.json(reference))
      .mockResolvedValueOnce(Response.json(body));
    await expect(resolve()).rejects.toMatchObject({ code: "invalid_response" });
  });

  it.each(["owner", "repo", "branch", "token"] as const)(
    "validates %s before requests",
    async (field) => {
      for (const value of [undefined, null, 7, "", " ", "\ud800"]) {
        if (field === "token" && value === "\ud800") continue;
        const params: Record<"owner" | "repo" | "branch" | "token", unknown> = {
          owner: "owner",
          repo: "repo",
          branch: "main",
          token: "caller-token",
          [field]: value,
        };
        await expect(
          fetchBaseCommit(
            // @ts-expect-error Deliberately exercise malformed runtime inputs.
            params.owner,
            params.repo,
            params.branch,
            params.token,
          ),
        ).rejects.toMatchObject({ code: "invalid_input" });
      }
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([1, 2])("sanitizes HTTP errors at stage %i", async (stage) => {
    if (stage === 2) fetchMock.mockResolvedValueOnce(Response.json(reference));
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: "secret" }, { status: 403 }),
    );
    await expect(resolve()).rejects.toMatchObject({
      code: "forbidden",
      message: "GitHub denied access to this resource.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(stage);
  });

  it.each([1, 2])("sanitizes network errors at stage %i", async (stage) => {
    if (stage === 2) fetchMock.mockResolvedValueOnce(Response.json(reference));
    fetchMock.mockRejectedValueOnce(new Error("secret"));
    await expect(resolve()).rejects.toMatchObject({
      code: "network_error",
      message: "Unable to reach the GitHub API.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(stage);
  });
});
