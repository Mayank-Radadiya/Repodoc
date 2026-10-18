// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { RepoTree, TreeEntry } from "@/src/lib/types";
import { buildPathSet, findFile, findFilesInDir } from "../utils";

describe("buildPathSet", () => {
  it("converts a flat tree of multiple files to lowercased path strings", () => {
    const tree: TreeEntry[] = [
      { path: "README.md", mode: "100644", type: "blob", sha: "sha-1", size: 100 },
      { path: "LICENSE", mode: "100644", type: "blob", sha: "sha-2", size: 200 },
      { path: "package.json", mode: "100644", type: "blob", sha: "sha-3", size: 300 },
    ];

    const result = buildPathSet(tree);

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(3);
    expect(result.has("readme.md")).toBe(true);
    expect(result.has("license")).toBe(true);
    expect(result.has("package.json")).toBe(true);
    expect(result.has("README.md")).toBe(false);
  });

  it("handles deeply nested paths and preserves directory segments in lowercase", () => {
    const tree: TreeEntry[] = [
      { path: "src/lib/scoring/Utils.ts", mode: "100644", type: "blob", sha: "sha-1" },
      { path: ".github/workflows/CI.yml", mode: "100644", type: "blob", sha: "sha-2" },
      { path: "docs/Architecture/Overview.MD", mode: "100644", type: "blob", sha: "sha-3" },
    ];

    const result = buildPathSet(tree);

    expect(result.has("src/lib/scoring/utils.ts")).toBe(true);
    expect(result.has(".github/workflows/ci.yml")).toBe(true);
    expect(result.has("docs/architecture/overview.md")).toBe(true);
  });

  it("returns an empty set when given an empty tree array", () => {
    const result = buildPathSet([]);

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  it("accepts a RepoTree container object and extracts entries", () => {
    const repoTree: RepoTree = {
      sha: "tree-sha-123",
      truncated: false,
      tree: [
        { path: "CONTRIBUTING.md", mode: "100644", type: "blob", sha: "c-sha" },
        { path: "SECURITY.md", mode: "100644", type: "blob", sha: "s-sha" },
      ],
    };

    const result = buildPathSet(repoTree);

    expect(result.size).toBe(2);
    expect(result.has("contributing.md")).toBe(true);
    expect(result.has("security.md")).toBe(true);
  });

  it("returns an empty set for an empty RepoTree", () => {
    const repoTree: RepoTree = {
      sha: "empty-sha",
      truncated: false,
      tree: [],
    };

    const result = buildPathSet(repoTree);

    expect(result.size).toBe(0);
  });

  it("deduplicates paths that differ only by case", () => {
    const tree: TreeEntry[] = [
      { path: "README.md", mode: "100644", type: "blob", sha: "sha-1" },
      { path: "readme.md", mode: "100644", type: "blob", sha: "sha-2" },
      { path: "Readme.MD", mode: "100644", type: "blob", sha: "sha-3" },
    ];

    const result = buildPathSet(tree);

    expect(result.size).toBe(1);
    expect(result.has("readme.md")).toBe(true);
  });

  it("processes all Git tree entry types (blobs, directories, submodules, symlinks)", () => {
    const tree: TreeEntry[] = [
      { path: "README.md", mode: "100644", type: "blob", sha: "sha-1" },
      { path: "scripts/run.sh", mode: "100755", type: "blob", sha: "sha-2" },
      { path: "src", mode: "040000", type: "tree", sha: "sha-3" },
      { path: "vendor/submodule", mode: "160000", type: "commit", sha: "sha-4" },
      { path: "symlink-license", mode: "120000", type: "blob", sha: "sha-5" },
    ];

    const result = buildPathSet(tree);

    expect(result.size).toBe(5);
    expect(result.has("readme.md")).toBe(true);
    expect(result.has("scripts/run.sh")).toBe(true);
    expect(result.has("src")).toBe(true);
    expect(result.has("vendor/submodule")).toBe(true);
    expect(result.has("symlink-license")).toBe(true);
  });

  it("does not mutate the input tree array or entry objects", () => {
    const entry: TreeEntry = {
      path: "Original-Path.MD",
      mode: "100644",
      type: "blob",
      sha: "sha-immutable",
      size: 50,
    };
    Object.freeze(entry);
    const tree = Object.freeze([entry]);

    expect(() => buildPathSet(tree)).not.toThrow();
    expect(entry.path).toBe("Original-Path.MD");
  });
});

describe("findFile", () => {
  it("returns the first matching candidate from a prioritized list", () => {
    const paths = new Set(["readme.md", "license", "package.json"]);
    const candidates = ["README.txt", "README.md", "README"];

    const match = findFile(paths, candidates);

    expect(match).toBe("README.md");
  });

  it("respects the candidate priority order when multiple matches exist", () => {
    const paths = new Set(["readme.md", "readme"]);

    expect(findFile(paths, ["README.md", "README"])).toBe("README.md");
    expect(findFile(paths, ["README", "README.md"])).toBe("README");
  });

  it("performs case-insensitive matching against candidate strings", () => {
    const paths = new Set(["license.mit", "code_of_conduct.md"]);

    expect(findFile(paths, ["LICENSE.MIT"])).toBe("LICENSE.MIT");
    expect(findFile(paths, ["Code_Of_Conduct.md"])).toBe("Code_Of_Conduct.md");
  });

  it("matches nested candidate paths", () => {
    const paths = new Set([".github/security.md", ".github/workflows/ci.yml"]);

    const match = findFile(paths, [
      "SECURITY.md",
      ".github/SECURITY.md",
      "docs/SECURITY.md",
    ]);

    expect(match).toBe(".github/SECURITY.md");
  });

  it("returns null when no candidates match", () => {
    const paths = new Set(["readme.md", "license"]);
    const candidates = ["CONTRIBUTING.md", "docs/CONTRIBUTING.md"];

    expect(findFile(paths, candidates)).toBeNull();
  });

  it("returns null when candidate list is empty", () => {
    const paths = new Set(["readme.md"]);

    expect(findFile(paths, [])).toBeNull();
  });

  it("returns null when path set is empty", () => {
    const paths = new Set<string>();

    expect(findFile(paths, ["README.md"])).toBeNull();
  });

  it("does not mutate the input candidate array", () => {
    const paths = new Set(["readme.md"]);
    const candidates = Object.freeze(["README.md", "LICENSE"]);

    expect(() => findFile(paths, candidates)).not.toThrow();
  });
});

describe("findFilesInDir", () => {
  const repoPaths = new Set([
    ".github/workflows/ci.yml",
    ".github/workflows/deploy.yaml",
    ".github/workflows/release.yml",
    ".github/workflows/nested/job.yml",
    ".github/workflows",
    ".github/workflows-backup/old.yml",
    ".github/issue_template/bug_report.md",
    ".github/issue_template/feature_request.yml",
    "src/index.ts",
    "src/components/button.tsx",
    "src/components/button.css",
    "src/utils/math.ts",
    "src",
    "readme.md",
  ]);

  it("finds all files under a directory prefix without trailing slash", () => {
    const matches = findFilesInDir(repoPaths, ".github/workflows");

    expect(matches).toEqual([
      ".github/workflows/ci.yml",
      ".github/workflows/deploy.yaml",
      ".github/workflows/release.yml",
      ".github/workflows/nested/job.yml",
    ]);
  });

  it("finds all files under a directory prefix with trailing slash", () => {
    const matches = findFilesInDir(repoPaths, ".github/workflows/");

    expect(matches).toEqual([
      ".github/workflows/ci.yml",
      ".github/workflows/deploy.yaml",
      ".github/workflows/release.yml",
      ".github/workflows/nested/job.yml",
    ]);
  });

  it("matches directory prefix case-insensitively", () => {
    const matches = findFilesInDir(repoPaths, ".GITHUB/WORKFLOWS");

    expect(matches).toHaveLength(4);
    expect(matches).toContain(".github/workflows/ci.yml");
  });

  it("strips leading slashes from directory prefix", () => {
    const matches = findFilesInDir(repoPaths, "/.github/workflows/");

    expect(matches).toHaveLength(4);
  });

  it("excludes directory entry itself and sibling directories with matching prefix", () => {
    const matches = findFilesInDir(repoPaths, ".github/workflows");

    // Must not include ".github/workflows" (the directory itself)
    expect(matches).not.toContain(".github/workflows");
    // Must not include ".github/workflows-backup/old.yml" (sibling directory)
    expect(matches).not.toContain(".github/workflows-backup/old.yml");
  });

  it("filters files by extension with leading dot", () => {
    const matches = findFilesInDir(repoPaths, ".github/workflows", ".yml");

    expect(matches).toEqual([
      ".github/workflows/ci.yml",
      ".github/workflows/release.yml",
      ".github/workflows/nested/job.yml",
    ]);
    expect(matches).not.toContain(".github/workflows/deploy.yaml");
  });

  it("filters files by extension without leading dot", () => {
    const matches = findFilesInDir(repoPaths, ".github/workflows", "yaml");

    expect(matches).toEqual([".github/workflows/deploy.yaml"]);
  });

  it("matches file extensions case-insensitively", () => {
    const matches = findFilesInDir(repoPaths, ".github/workflows", ".YML");

    expect(matches).toEqual([
      ".github/workflows/ci.yml",
      ".github/workflows/release.yml",
      ".github/workflows/nested/job.yml",
    ]);
  });

  it("matches multiple nested directory levels", () => {
    const matches = findFilesInDir(repoPaths, "src", ".ts");

    expect(matches).toEqual(["src/index.ts", "src/utils/math.ts"]);
  });

  it("supports searching within a nested subdirectory", () => {
    const matches = findFilesInDir(repoPaths, "src/components");

    expect(matches).toEqual([
      "src/components/button.tsx",
      "src/components/button.css",
    ]);
  });

  it("returns all files matching extension when dirPrefix is empty or root", () => {
    const matchesEmpty = findFilesInDir(repoPaths, "", ".md");
    expect(matchesEmpty).toContain("readme.md");
    expect(matchesEmpty).toContain(".github/issue_template/bug_report.md");
    expect(matchesEmpty).not.toContain("src/index.ts");

    const matchesSlash = findFilesInDir(repoPaths, "/", ".md");
    expect(matchesSlash).toEqual(matchesEmpty);
  });

  it("returns an empty array when no files match the directory", () => {
    const matches = findFilesInDir(repoPaths, "nonexistent");

    expect(matches).toEqual([]);
  });

  it("returns an empty array when no files match the extension", () => {
    const matches = findFilesInDir(repoPaths, "src", ".rust");

    expect(matches).toEqual([]);
  });

  it("returns an empty array for an empty path set", () => {
    const matches = findFilesInDir(new Set(), "src");

    expect(matches).toEqual([]);
  });

  it("does not false-match paths where extension letters appear without dot separator", () => {
    const pathsWithTrickyNames = new Set([
      "src/deployyml",
      "src/deploy.yml",
      "src/script_py",
      "src/script.py",
    ]);

    const ymlMatches = findFilesInDir(pathsWithTrickyNames, "src", "yml");
    expect(ymlMatches).toEqual(["src/deploy.yml"]);

    const pyMatches = findFilesInDir(pathsWithTrickyNames, "src", ".py");
    expect(pyMatches).toEqual(["src/script.py"]);
  });
});
