// @vitest-environment node

import { describe, expect, it } from "vitest";
import { GitHubService } from "../service";

// Explicitly opt in: RUN_GITHUB_INTEGRATION=1 bun run test:run src/lib/github/__tests__/service.integration.test.ts
describe.runIf(process.env.RUN_GITHUB_INTEGRATION === "1")("GitHubService live API", () => {
  it("fetches a public repository tree and revalidates it using its ETag", async () => {
    const fresh = await GitHubService.getRepoData("octocat", "Hello-World");
    expect(fresh.defaultBranch).not.toBe("");
    expect(fresh.topics).toBeInstanceOf(Array);
    expect(fresh.treeSha).toEqual(expect.any(String));
    expect(fresh.truncated).toBe(false);
    expect(fresh.etag).not.toBe("");
    expect(fresh.tree).not.toBeNull();
    if (fresh.tree === null) throw new Error("Expected a fresh repository tree.");
    expect(fresh.tree.length).toBeGreaterThan(0);
    expect(fresh.tree.some((entry) => entry.type === "blob")).toBe(true);

    const cached = await GitHubService.getRepoData("octocat", "Hello-World", fresh.etag);
    expect(cached).toEqual({
      defaultBranch: fresh.defaultBranch,
      description: fresh.description,
      topics: fresh.topics,
      tree: null,
      treeSha: null,
      etag: fresh.etag,
      truncated: null,
    });
  }, 30_000);
});
