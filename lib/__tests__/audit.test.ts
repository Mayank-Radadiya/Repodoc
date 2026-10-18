import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  auditRepository,
  IncompleteTreeError,
  InvalidRepositoryError,
  validateRepoCoordinates,
} from "@/lib/audit";
import { GitHubApiError } from "@/lib/github/client";
import { GitHubService } from "@/lib/github/service";
import type { TreeEntry } from "@/lib/types";

vi.mock("@/lib/github/service", () => ({
  GitHubService: {
    getRepoData: vi.fn(),
    fetchFileContent: vi.fn(),
  },
  findReadmeEntry: vi.fn(),
}));

describe("audit pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateRepoCoordinates", () => {
    it("accepts valid GitHub owners and repos", () => {
      expect(validateRepoCoordinates("facebook", "react")).toEqual({
        owner: "facebook",
        repo: "react",
      });
      expect(validateRepoCoordinates("vercel", "next.js")).toEqual({
        owner: "vercel",
        repo: "next.js",
      });
      expect(validateRepoCoordinates("my-org", "repo_with_underscore-and-dash")).toEqual({
        owner: "my-org",
        repo: "repo_with_underscore-and-dash",
      });
    });

    it("decodes URL-encoded parameters correctly", () => {
      expect(validateRepoCoordinates("my%2Dorg", "my%2Erepo")).toEqual({
        owner: "my-org",
        repo: "my.repo",
      });
    });

    it.each(["%", "%2", "%GG", "%C3%28", "%E0%A4%A"])(
      "rejects malformed encoding %s in either coordinate without throwing",
      (invalid) => {
        expect(validateRepoCoordinates(invalid, "repo")).toBeNull();
        expect(validateRepoCoordinates("owner", invalid)).toBeNull();
      },
    );

    it.each(["%2E", "%2E%2E", "nested%2Frepo", "nested%5Crepo", "%252E%252E"])(
      "rejects encoded traversal or separators: %s",
      (invalid) => {
        expect(validateRepoCoordinates(invalid, "repo")).toBeNull();
        expect(validateRepoCoordinates("owner", invalid)).toBeNull();
      },
    );

    it.each([undefined, null, "", " ", 123])(
      "rejects missing or non-string coordinates: %s",
      (invalid) => {
        expect(validateRepoCoordinates(invalid, "repo")).toBeNull();
        expect(validateRepoCoordinates("owner", invalid)).toBeNull();
      },
    );

    it("rejects invalid owners or repos", () => {
      expect(validateRepoCoordinates("", "react")).toBeNull();
      expect(validateRepoCoordinates("facebook", "")).toBeNull();
      expect(validateRepoCoordinates("owner/nested", "repo")).toBeNull();
      expect(validateRepoCoordinates("owner", "repo/nested")).toBeNull();
      expect(validateRepoCoordinates("owner", "..")).toBeNull();
      expect(validateRepoCoordinates("..", "repo")).toBeNull();
      expect(validateRepoCoordinates("owner", ".")).toBeNull();
      expect(validateRepoCoordinates("owner with space", "repo")).toBeNull();
      expect(validateRepoCoordinates(123 as unknown as string, "repo")).toBeNull();
    });
  });

  describe("auditRepository", () => {
    it("throws InvalidRepositoryError for invalid coordinates", async () => {
      await expect(auditRepository("invalid/owner", "repo")).rejects.toThrow(
        InvalidRepositoryError,
      );
    });

    it("rejects malformed encoding before any GitHub requests", async () => {
      await expect(auditRepository("owner", "%GG")).rejects.toThrow(
        InvalidRepositoryError,
      );
      expect(GitHubService.getRepoData).not.toHaveBeenCalled();
      expect(GitHubService.fetchFileContent).not.toHaveBeenCalled();
    });

    it("runs full audit successfully when data is present", async () => {
      const tree: TreeEntry[] = [
        { path: "README.md", mode: "100644", type: "blob", sha: "readme-sha" },
        { path: "package.json", mode: "100644", type: "blob", sha: "manifest-sha" },
        { path: "LICENSE", mode: "100644", type: "blob", sha: "lic-sha" },
      ];

      vi.mocked(GitHubService.getRepoData).mockResolvedValueOnce({
        defaultBranch: "main",
        description: "A great repo",
        topics: ["react", "ui"],
        tree,
        treeSha: "tree-sha",
        etag: "etag-123",
        truncated: false,
      });

      vi.mocked(GitHubService.fetchFileContent).mockImplementation(
        async (_o, _r, sha) => {
          if (sha === "readme-sha") return "# Title\n\n## Installation\n\n## Usage";
          if (sha === "manifest-sha") return JSON.stringify({ name: "pkg", scripts: { test: "vitest" } });
          return "";
        },
      );

      const report = await auditRepository("facebook", "react");

      expect(report.owner).toBe("facebook");
      expect(report.repo).toBe("react");
      expect(report.defaultBranch).toBe("main");
      expect(report.healthScore).toBeGreaterThan(0);
      expect(report.checks.length).toBeGreaterThan(0);
    });

    it("forwards cachedEtag and token to getRepoData and blob fetches", async () => {
      const tree: TreeEntry[] = [
        { path: "README.md", mode: "100644", type: "blob", sha: "readme-sha" },
        { path: "package.json", mode: "100644", type: "blob", sha: "manifest-sha" },
      ];
      vi.mocked(GitHubService.getRepoData).mockResolvedValueOnce({
        defaultBranch: "main",
        description: null,
        topics: [],
        tree,
        treeSha: "tree-sha",
        etag: "etag-123",
        truncated: false,
      });
      vi.mocked(GitHubService.fetchFileContent).mockResolvedValue("");

      await auditRepository("owner", "repo", { cachedEtag: '"cached"', token: "token-1" });

      expect(GitHubService.getRepoData).toHaveBeenCalledWith("owner", "repo", '"cached"', "token-1");
      expect(GitHubService.fetchFileContent).toHaveBeenCalledWith("owner", "repo", "manifest-sha", "token-1");
    });

    it("finds a case-variant manifest filename", async () => {
      const tree: TreeEntry[] = [
        { path: "PACKAGE.JSON", mode: "100644", type: "blob", sha: "manifest-sha" },
      ];
      vi.mocked(GitHubService.getRepoData).mockResolvedValueOnce({
        defaultBranch: "main",
        description: null,
        topics: [],
        tree,
        treeSha: "tree-sha",
        etag: "etag-123",
        truncated: false,
      });
      vi.mocked(GitHubService.fetchFileContent).mockImplementation(async (_o, _r, sha) => {
        if (sha === "manifest-sha") return JSON.stringify({ scripts: { test: "vitest run" } });
        return "";
      });

      const report = await auditRepository("owner", "repo");
      expect(GitHubService.fetchFileContent).toHaveBeenCalledWith("owner", "repo", "manifest-sha", undefined);
      expect(report.checks.find((check) => check.id === "tests")?.passed).toBe(true);
    });

    it("throws IncompleteTreeError when tree is truncated", async () => {
      vi.mocked(GitHubService.getRepoData).mockResolvedValueOnce({
        defaultBranch: "main",
        description: "Large repo",
        topics: [],
        tree: [],
        treeSha: "tree-sha",
        etag: "etag-123",
        truncated: true,
      });

      await expect(auditRepository("owner", "repo")).rejects.toThrow(
        IncompleteTreeError,
      );
    });

    it("throws IncompleteTreeError when tree is null", async () => {
      vi.mocked(GitHubService.getRepoData).mockResolvedValueOnce({
        defaultBranch: "main",
        description: "304 repo",
        topics: [],
        tree: null,
        treeSha: null,
        etag: "etag-123",
        truncated: null,
      });

      await expect(auditRepository("owner", "repo")).rejects.toThrow(
        IncompleteTreeError,
      );
    });

    it("propagates GitHubApiError directly", async () => {
      vi.mocked(GitHubService.getRepoData).mockRejectedValueOnce(
        new GitHubApiError("not_found", "Repo not found", { status: 404 }),
      );

      await expect(auditRepository("owner", "nonexistent")).rejects.toThrow(
        GitHubApiError,
      );
    });
  });
});
