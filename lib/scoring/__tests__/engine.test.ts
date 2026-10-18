import { afterEach, describe, expect, it, vi } from "vitest";
import { RUBRIC_VERSION } from "@/lib/constants";
import type { CheckResult, RepoTree, TreeEntry } from "@/lib/types";
import * as documentation from "../checks/documentation";
import * as hygiene from "../checks/hygiene";
import * as testing from "../checks/testing";
import * as community from "../checks/community";
import * as security from "../checks/security";
import {
  CATEGORY_WEIGHTS,
  calculateCategoryScores,
  computeHealthScore,
  MAX_HEALTH_SCORE,
  MIN_HEALTH_SCORE,
  run,
  runScoringEngine,
  scoreRepository,
  ScoringEngine,
} from "../engine";

describe("ScoringEngine.run() Orchestrator", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const perfectReadme = `# Repodoc

## Architecture
Repodoc operates by inspecting repository trees in memory.

## Installation
Run \`pnpm install\` to install dependencies.

## Usage
Run \`pnpm dev\` to launch the server.
`;

  const fullRepoPaths = new Set<string>([
    "readme.md",
    "contributing.md",
    "license",
    ".gitignore",
    "code_of_conduct.md",
    ".github/workflows/ci.yml",
    "tests/scoring.test.ts",
    ".github/issue_template/bug_report.md",
    ".github/pull_request_template.md",
    "security.md",
    ".github/dependabot.yml",
  ]);

  it("scores exactly 100/100 on a synthetic repository with all rubric criteria satisfied", () => {
    const report = ScoringEngine.run({
      owner: "repodoc-org",
      repo: "repodoc",
      defaultBranch: "main",
      paths: fullRepoPaths,
      readmeContent: perfectReadme,
      manifestContent: JSON.stringify({
        scripts: { test: "vitest run" },
      }),
      description: "Automated repository health auditor and remediation tool",
      topics: ["developer-tools", "governance", "security"],
      generatedAt: "2026-10-12T00:00:00.000Z",
    });

    expect(report.healthScore).toBe(100);
    expect(report.owner).toBe("repodoc-org");
    expect(report.repo).toBe("repodoc");
    expect(report.defaultBranch).toBe("main");
    expect(report.rubricVersion).toBe(RUBRIC_VERSION);
    expect(report.generatedAt).toBe("2026-10-12T00:00:00.000Z");

    // All checks should pass
    expect(report.checks.length).toBe(14);
    expect(report.checks.map(({ id, category, maxPoints }) => [id, category, maxPoints])).toEqual([
      ["readme-presence", "documentation", 8],
      ["readme-headings", "documentation", 10],
      ["architecture-description", "documentation", 4],
      ["contributing", "documentation", 3],
      ["license", "hygiene", 10],
      ["gitignore", "hygiene", 5],
      ["code-of-conduct", "hygiene", 5],
      ["ci-workflow", "testing_ci", 15],
      ["tests", "testing_ci", 10],
      ["issue-templates", "community", 4],
      ["pr-template", "community", 4],
      ["repo-metadata", "community", 7],
      ["security-policy", "security", 10],
      ["dependency-scanning", "security", 5],
    ]);
    expect(report.healthScore).toBe(report.checks.reduce((total, check) => total + check.pointsAwarded, 0));
    for (const check of report.checks) {
      expect(check.passed).toBe(true);
      expect(check.pointsAwarded).toBe(check.maxPoints);
    }

    // Verify per-category score breakdown
    const categorySummary = calculateCategoryScores(report.checks);
    expect(categorySummary.documentation.pointsAwarded).toBe(25);
    expect(categorySummary.documentation.passed).toBe(true);
    expect(categorySummary.hygiene.pointsAwarded).toBe(20);
    expect(categorySummary.hygiene.passed).toBe(true);
    expect(categorySummary.testing_ci.pointsAwarded).toBe(25);
    expect(categorySummary.testing_ci.passed).toBe(true);
    expect(categorySummary.community.pointsAwarded).toBe(15);
    expect(categorySummary.community.passed).toBe(true);
    expect(categorySummary.security.pointsAwarded).toBe(15);
    expect(categorySummary.security.passed).toBe(true);
  });

  it("scores exactly 0/100 on an empty repository with no files or metadata", () => {
    const report = ScoringEngine.run({
      owner: "empty-org",
      repo: "bare-repo",
      paths: new Set<string>(),
      readmeContent: "",
      manifestContent: "",
      description: "",
      topics: [],
      generatedAt: "2026-10-12T00:00:00.000Z",
    });

    expect(report.healthScore).toBe(0);
    expect(report.owner).toBe("empty-org");
    expect(report.repo).toBe("bare-repo");
    expect(report.defaultBranch).toBe("main");
    expect(report.rubricVersion).toBe(RUBRIC_VERSION);
    expect(report.checks.length).toBe(14);

    for (const check of report.checks) {
      expect(check.passed).toBe(false);
      expect(check.pointsAwarded).toBe(0);
    }

    const categorySummary = calculateCategoryScores(report.checks);
    expect(categorySummary.documentation.pointsAwarded).toBe(0);
    expect(categorySummary.documentation.passed).toBe(false);
    expect(categorySummary.hygiene.pointsAwarded).toBe(0);
    expect(categorySummary.hygiene.passed).toBe(false);
    expect(categorySummary.testing_ci.pointsAwarded).toBe(0);
    expect(categorySummary.testing_ci.passed).toBe(false);
    expect(categorySummary.community.pointsAwarded).toBe(0);
    expect(categorySummary.community.passed).toBe(false);
    expect(categorySummary.security.pointsAwarded).toBe(0);
    expect(categorySummary.security.passed).toBe(false);
  });

  it("enforces that health score never exceeds 100", () => {
    // Synthetic check results with inflated point values
    const inflatedChecks: CheckResult[] = [
      {
        id: "readme-presence",
        name: "README file",
        category: "documentation",
        pointsAwarded: 50, // Inflated beyond max
        maxPoints: 8,
        passed: true,
        evidence: { filesChecked: ["README.md"], found: true, details: "Found" },
      },
      {
        id: "license",
        name: "License file",
        category: "hygiene",
        pointsAwarded: 50,
        maxPoints: 10,
        passed: true,
        evidence: { filesChecked: ["LICENSE"], found: true, details: "Found" },
      },
      {
        id: "ci-workflow",
        name: "CI workflow",
        category: "testing_ci",
        pointsAwarded: 100,
        maxPoints: 15,
        passed: true,
        evidence: { filesChecked: [".github/workflows/ci.yml"], found: true, details: "Found" },
      },
    ];

    const { healthScore, categoryScores } = computeHealthScore(inflatedChecks);

    expect(healthScore).toBeLessThanOrEqual(MAX_HEALTH_SCORE);
    expect(healthScore).toBeGreaterThanOrEqual(MIN_HEALTH_SCORE);
    expect(categoryScores.documentation).toBeLessThanOrEqual(CATEGORY_WEIGHTS.documentation);
    expect(categoryScores.hygiene).toBeLessThanOrEqual(CATEGORY_WEIGHTS.hygiene);
    expect(categoryScores.testing_ci).toBeLessThanOrEqual(CATEGORY_WEIGHTS.testing_ci);
  });

  it("enforces category caps so individual categories cannot exceed documented max", () => {
    // If multiple checks in testing_ci were somehow giving extra points
    const checkResults: CheckResult[] = [
      {
        id: "ci-1",
        name: "CI 1",
        category: "testing_ci",
        pointsAwarded: 20,
        maxPoints: 20,
        passed: true,
        evidence: { filesChecked: [], found: true, details: "" },
      },
      {
        id: "ci-2",
        name: "CI 2",
        category: "testing_ci",
        pointsAwarded: 20,
        maxPoints: 20,
        passed: true,
        evidence: { filesChecked: [], found: true, details: "" },
      },
    ];

    const { healthScore, categoryScores } = computeHealthScore(checkResults);

    // Testing CI max is 25, so even though 20 + 20 = 40, capped at 25
    expect(categoryScores.testing_ci).toBe(25);
    expect(healthScore).toBe(25);
  });

  describe("Partial Scoring Scenarios", () => {
    it("awards exactly 25 points when only Documentation criteria pass", () => {
      const paths = new Set<string>(["readme.md", "contributing.md"]);
      const report = ScoringEngine.run({
        paths,
        readmeContent: perfectReadme,
      });

      expect(report.healthScore).toBe(25);
      const summary = calculateCategoryScores(report.checks);
      expect(summary.documentation.pointsAwarded).toBe(25);
      expect(summary.documentation.passed).toBe(true);
      expect(summary.hygiene.pointsAwarded).toBe(0);
      expect(summary.testing_ci.pointsAwarded).toBe(0);
      expect(summary.community.pointsAwarded).toBe(0);
      expect(summary.security.pointsAwarded).toBe(0);
    });

    it("awards exactly 20 points when only Project Hygiene criteria pass", () => {
      const paths = new Set<string>(["license", ".gitignore", "code_of_conduct.md"]);
      const report = ScoringEngine.run({
        paths,
      });

      expect(report.healthScore).toBe(20);
      const summary = calculateCategoryScores(report.checks);
      expect(summary.hygiene.pointsAwarded).toBe(20);
      expect(summary.hygiene.passed).toBe(true);
      expect(summary.documentation.pointsAwarded).toBe(0);
      expect(summary.testing_ci.pointsAwarded).toBe(0);
      expect(summary.community.pointsAwarded).toBe(0);
      expect(summary.security.pointsAwarded).toBe(0);
    });

    it("awards exactly 25 points when only Testing & CI criteria pass", () => {
      const paths = new Set<string>([".github/workflows/ci.yml", "test/unit_test.py"]);
      const report = ScoringEngine.run({
        paths,
      });

      expect(report.healthScore).toBe(25);
      const summary = calculateCategoryScores(report.checks);
      expect(summary.testing_ci.pointsAwarded).toBe(25);
      expect(summary.testing_ci.passed).toBe(true);
    });

    it("awards exactly 15 points when only Community & Metadata criteria pass", () => {
      const paths = new Set<string>([
        ".github/issue_template.md",
        ".github/pull_request_template.md",
      ]);
      const report = ScoringEngine.run({
        paths,
        description: "A great tool",
        topics: ["open-source"],
      });

      expect(report.healthScore).toBe(15);
      const summary = calculateCategoryScores(report.checks);
      expect(summary.community.pointsAwarded).toBe(15);
      expect(summary.community.passed).toBe(true);
    });

    it("awards exactly 15 points when only Security criteria pass", () => {
      const paths = new Set<string>(["security.md", ".github/dependabot.yml"]);
      const report = ScoringEngine.run({
        paths,
      });

      expect(report.healthScore).toBe(15);
      const summary = calculateCategoryScores(report.checks);
      expect(summary.security.pointsAwarded).toBe(15);
      expect(summary.security.passed).toBe(true);
    });

    it("correctly sums multiple categories (Hygiene 20 + Security 15 = 35 pts)", () => {
      const paths = new Set<string>([
        "license",
        ".gitignore",
        "code_of_conduct.md",
        "security.md",
        ".github/dependabot.yml",
      ]);
      const report = ScoringEngine.run({ paths });

      expect(report.healthScore).toBe(35);
    });
  });

  describe("Input Formats & Tree Conversion", () => {
    it("handles unlowercased paths in Set<string> through automatic normalization", () => {
      // Uppercase paths should match case-insensitively
      const uppercasePaths = new Set<string>([
        "LICENSE.TXT",
        ".GITIGNORE",
        "CODE_OF_CONDUCT.MD",
      ]);

      const report = ScoringEngine.run({ paths: uppercasePaths });
      expect(report.healthScore).toBe(20);
    });

    it("accepts TreeEntry[] array directly in paths", () => {
      const entries: TreeEntry[] = [
        { path: "LICENSE", mode: "100644", type: "blob", sha: "sha1" },
        { path: ".gitignore", mode: "100644", type: "blob", sha: "sha2" },
        { path: "CODE_OF_CONDUCT.md", mode: "100644", type: "blob", sha: "sha3" },
      ];

      const report = ScoringEngine.run({ paths: entries });
      expect(report.healthScore).toBe(20);
    });

    it("accepts RepoTree object directly in paths", () => {
      const repoTree: RepoTree = {
        sha: "tree123",
        truncated: false,
        tree: [
          { path: "LICENSE", mode: "100644", type: "blob", sha: "sha1" },
          { path: ".gitignore", mode: "100644", type: "blob", sha: "sha2" },
          { path: "CODE_OF_CONDUCT.md", mode: "100644", type: "blob", sha: "sha3" },
        ],
      };

      const report = ScoringEngine.run({ paths: repoTree });
      expect(report.healthScore).toBe(20);
    });

    it("accepts tree property as an alias for paths", () => {
      const entries: TreeEntry[] = [
        { path: "LICENSE", mode: "100644", type: "blob", sha: "sha1" },
        { path: ".gitignore", mode: "100644", type: "blob", sha: "sha2" },
        { path: "CODE_OF_CONDUCT.md", mode: "100644", type: "blob", sha: "sha3" },
      ];

      const report = ScoringEngine.run({ tree: entries });
      expect(report.healthScore).toBe(20);
    });
  });

  describe("Report Metadata & Determinism", () => {
    it("produces deterministic output across multiple invocations with identical inputs", () => {
      const input = {
        owner: "test-owner",
        repo: "test-repo",
        defaultBranch: "develop",
        paths: fullRepoPaths,
        readmeContent: perfectReadme,
        description: "Deterministic test",
        topics: ["testing"],
        generatedAt: "2026-10-12T12:00:00.000Z",
      };

      const report1 = ScoringEngine.run(input);
      const report2 = ScoringEngine.run(input);

      expect(report1).toEqual(report2);
      expect(report1.healthScore).toBe(report2.healthScore);
      expect(report1.checks).toEqual(report2.checks);
    });

    it("handles generatedAt as Date object", () => {
      const date = new Date("2026-05-01T10:30:00.000Z");
      const report = ScoringEngine.run({
        paths: new Set<string>(),
        generatedAt: date,
      });

      expect(report.generatedAt).toBe("2026-05-01T10:30:00.000Z");
    });

    it("provides fallback defaults for missing owner, repo, and defaultBranch", () => {
      const report = ScoringEngine.run({
        paths: new Set<string>(),
      });

      expect(report.owner).toBe("");
      expect(report.repo).toBe("");
      expect(report.defaultBranch).toBe("main");
      expect(typeof report.generatedAt).toBe("string");
      expect(new Date(report.generatedAt).getTime()).not.toBeNaN();
    });

    it("contains no duplicate check IDs across the entire audit collection", () => {
      const report = ScoringEngine.run({
        paths: fullRepoPaths,
        readmeContent: perfectReadme,
      });

      const checkIds = report.checks.map((c) => c.id);
      const uniqueIds = new Set(checkIds);
      expect(checkIds.length).toBe(uniqueIds.size);
    });

    it("orders check results in documented category order", () => {
      const report = ScoringEngine.run({
        paths: fullRepoPaths,
        readmeContent: perfectReadme,
      });

      const categories = report.checks.map((c) => c.category);
      const distinctCategories: string[] = [];
      for (const cat of categories) {
        if (distinctCategories[distinctCategories.length - 1] !== cat) {
          distinctCategories.push(cat);
        }
      }

      expect(distinctCategories).toEqual([
        "documentation",
        "hygiene",
        "testing_ci",
        "community",
        "security",
      ]);
    });
  });

  describe("Error Handling", () => {
    it("throws TypeError when input options are missing or invalid", () => {
      for (const input of [null, undefined, "not-an-object", 123, []]) {
        expect(() => Reflect.apply(ScoringEngine.run, ScoringEngine, [input])).toThrow(TypeError);
      }
    });

    it("throws TypeError when neither paths nor tree are provided", () => {
      expect(() => Reflect.apply(run, undefined, [{}])).toThrow(TypeError);
      expect(() => Reflect.apply(run, undefined, [{ paths: 42 }])).toThrow(TypeError);
    });
  });

  describe("Category integration", () => {
    it("calls each category once, forwards supplied data, and preserves results without network calls", () => {
      const manifestContent = '{"scripts":{"test":"vitest"}}';
      const metadata = { description: "Health auditor", topics: ["testing"] };
      const securityContents = {
        securityPolicyContent: "## Reporting a vulnerability\nEmail security@example.test",
        dependencyScanningContent: "version: 2\nupdates: []",
      };
      const groups = [
        documentation.checkDocumentation(fullRepoPaths, perfectReadme),
        hygiene.checkHygiene(fullRepoPaths),
        testing.runTestingChecks(fullRepoPaths, manifestContent),
        community.checkCommunity(fullRepoPaths, metadata),
        security.checkSecurity(fullRepoPaths, securityContents),
      ];
      const spies = [
        vi.spyOn(documentation, "checkDocumentation").mockReturnValue(groups[0]),
        vi.spyOn(hygiene, "checkHygiene").mockReturnValue(groups[1]),
        vi.spyOn(testing, "runTestingChecks").mockReturnValue(groups[2]),
        vi.spyOn(community, "checkCommunity").mockReturnValue(groups[3]),
        vi.spyOn(security, "checkSecurity").mockReturnValue(groups[4]),
      ];
      const fetch = vi.fn(() => { throw new Error("Unexpected network call"); });
      vi.stubGlobal("fetch", fetch);

      const report = run({ paths: fullRepoPaths, readmeContent: perfectReadme, manifestContent, ...metadata, ...securityContents });

      for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1);
      expect(spies[0]).toHaveBeenCalledWith(fullRepoPaths, perfectReadme);
      expect(spies[1]).toHaveBeenCalledWith(fullRepoPaths);
      expect(spies[2]).toHaveBeenCalledWith(fullRepoPaths, manifestContent);
      expect(spies[3]).toHaveBeenCalledWith(fullRepoPaths, metadata);
      expect(spies[4]).toHaveBeenCalledWith(fullRepoPaths, securityContents);
      expect(fetch).not.toHaveBeenCalled();
      const expected = groups.flat();
      expect(report.checks).toEqual(expected);
      report.checks.forEach((check, index) => expect(check).toBe(expected[index]));
      expect(report.healthScore).toBe(expected.reduce((total, check) => total + check.pointsAwarded, 0));
    });

    it("propagates a category error unchanged without continuing the audit", () => {
      const error = new Error("Documentation failed");
      vi.spyOn(documentation, "checkDocumentation").mockImplementation(() => { throw error; });
      const nextCategory = vi.spyOn(hygiene, "checkHygiene");
      let caughtError: unknown;
      try {
        run({ paths: fullRepoPaths });
      } catch (caught) {
        caughtError = caught;
      }
      expect(caughtError).toBe(error);
      expect(nextCategory).not.toHaveBeenCalled();
    });

    it("rejects duplicate IDs rather than dropping results", () => {
      const check = documentation.checkReadmePresence(fullRepoPaths);
      vi.spyOn(hygiene, "checkHygiene").mockReturnValue([check]);
      expect(() => run({ paths: fullRepoPaths })).toThrow("duplicate check ID 'readme-presence'");
    });

    it.each([
      { description: "Useful library", topics: [], expected: 4 },
      { description: "", topics: ["library"], expected: 3 },
      { description: "Useful library", topics: ["library"], expected: 7 },
    ])("awards metadata partial credit: $expected", ({ description, topics, expected }) => {
      const report = run({ paths: new Set<string>(), description, topics });
      expect(report.healthScore).toBe(expected);
      expect(report.checks.find((check) => check.id === "repo-metadata")?.pointsAwarded).toBe(expected);
    });

    it("handles absent and malformed file contents through the existing checks", () => {
      const paths = new Set(["README.md", "package.json"]);
      expect(run({ paths }).healthScore).toBe(8);
      expect(run({ paths, manifestContent: "{invalid json", readmeContent: "No headings" }).healthScore).toBe(8);
      expect(run({ paths, manifestContent: '{"scripts":{"test":"vitest"}}' }).healthScore).toBe(18);
      // The existing architecture check can evaluate supplied text independently of file presence.
      expect(run({ paths: new Set<string>(), readmeContent: perfectReadme }).healthScore).toBe(4);
    });

    it("forwards supplied security content to the real checks", () => {
      const paths = new Set(["security.md", ".github/dependabot.yml"]);
      const options = { securityPolicyContent: "", dependencyScanningContent: "" };
      const report = run({ paths, ...options });
      expect(report.checks.filter((check) => check.category === "security")).toEqual(security.checkSecurity(paths, options));
      expect(report.healthScore).toBe(0);
      expect(run({ paths }).healthScore).toBe(15);
    });
  });

  describe("Input validation and preservation", () => {
    const malformedInputs: unknown[] = [
      { paths: null }, { tree: null }, { paths: {} },
      { paths: { tree: null } }, { paths: { tree: {} } },
      { paths: new Set(["LICENSE", 42]) },
      { paths: [null] }, { paths: [42] }, { paths: [{}] },
      { paths: [{ path: 42 }] }, { paths: ["LICENSE"] },
      { paths: { tree: [{ path: null }] } },
      { tree: new Set(["LICENSE"]) },
      { paths: new Set(["LICENSE"]), tree: { tree: null } },
      { paths: 42, tree: [] },
      { tree: null, defaultBranch: "main", etag: "cached" },
    ];
    it.each(malformedInputs.map((input, index) => ({ input, index })))("rejects malformed path input $index before executing checks", ({ input }) => {
      const check = vi.spyOn(documentation, "checkDocumentation");
      expect(() => Reflect.apply(run, undefined, [input])).toThrow(TypeError);
      expect(check).not.toHaveBeenCalled();
    });

    it.each([
      ["owner", null], ["repo", 42], ["defaultBranch", false],
      ["readmeContent", {}], ["manifestContent", 42], ["description", []],
      ["securityPolicyContent", false], ["dependencyScanningContent", {}],
      ["topics", "testing"], ["topics", ["testing", 42]],
    ])("rejects invalid optional field %s before executing checks", (field, value) => {
      const check = vi.spyOn(documentation, "checkDocumentation");
      expect(() => Reflect.apply(run, undefined, [{ paths: new Set(), [String(field)]: value }])).toThrow(TypeError);
      expect(check).not.toHaveBeenCalled();
    });

    it("accepts null optional content and metadata and blank branch defaults", () => {
      const report = run({ paths: [], readmeContent: null, manifestContent: null, description: null, topics: null, securityPolicyContent: null, dependencyScanningContent: null, defaultBranch: "  " });
      expect(report.healthScore).toBe(0);
      expect(report.defaultBranch).toBe("main");
    });

    it("uses paths when both paths and a tree are supplied", () => {
      const tree: RepoTree = { sha: "tree-sha", truncated: false, tree: [] };
      expect(run({ paths: new Set(["LICENSE"]), tree }).healthScore).toBe(10);
      expect(run({ tree }).healthScore).toBe(0);
    });

    it("does not mutate supplied paths, topics, or Date objects", () => {
      const paths = new Set(["README.md", "LICENSE"]);
      const topics = Object.freeze(["testing"]);
      const generatedAt = new Date("2026-10-13T00:00:00Z");
      const input = Object.freeze({ paths, topics, generatedAt });
      const first = run(input);
      const second = run(input);
      expect(first).toEqual(second);
      expect([...paths]).toEqual(["README.md", "LICENSE"]);
      expect(topics).toEqual(["testing"]);
      expect(generatedAt.toISOString()).toBe("2026-10-13T00:00:00.000Z");
    });

    it("accepts frozen tree entries without modifying them", () => {
      const entry: TreeEntry = Object.freeze({ path: "LICENSE", mode: "100644", type: "blob", sha: "blob-sha" });
      const entries = Object.freeze([entry]);
      expect(run({ paths: entries }).healthScore).toBe(10);
      expect(entry.path).toBe("LICENSE");
      expect(entries).toEqual([entry]);
    });
  });

  describe("Timestamp validation", () => {
    it("uses the current UTC timestamp when omitted", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-13T08:09:10Z"));
      const first = run({ paths: [] });
      expect(first.generatedAt).toBe("2026-10-13T08:09:10.000Z");
      vi.setSystemTime(new Date("2026-10-14T08:09:10Z"));
      const second = run({ paths: [] });
      expect(second.generatedAt).toBe("2026-10-14T08:09:10.000Z");
      expect(second.checks).toEqual(first.checks);
      expect(second.healthScore).toBe(first.healthScore);
    });

    it.each([
      ["2026-10-13T13:39:10+05:30", "2026-10-13T08:09:10.000Z"],
      [" 2026-10-13T08:09:10Z ", "2026-10-13T08:09:10.000Z"],
      ["2026-10-13T08:09Z", "2026-10-13T08:09:00.000Z"],
      ["2024-02-29T08:09:10Z", "2024-02-29T08:09:10.000Z"],
    ])("canonicalizes %s", (generatedAt, expected) => {
      expect(run({ paths: [], generatedAt }).generatedAt).toBe(expected);
    });

    it.each([
      "", " ", "not-a-date", "2026-10-13", "2026-10-13T08:09:10",
      "2026-02-30T08:09:10Z", "2026-02-29T08:09:10Z", "2026-13-01T08:09:10Z",
      "2026-10-13T25:09:10Z", "2026-10-13T08:09:10+99:00", new Date(NaN), null, 42,
    ])("rejects invalid supplied timestamp %s before checks run", (generatedAt) => {
      const check = vi.spyOn(documentation, "checkDocumentation");
      expect(() => Reflect.apply(run, undefined, [{ paths: [], generatedAt }])).toThrow(TypeError);
      expect(check).not.toHaveBeenCalled();
    });
  });

  describe("Score helper invariants", () => {
    const baseCheck: CheckResult = {
      id: "license", name: "License", category: "hygiene", pointsAwarded: 10, maxPoints: 10,
      passed: true, evidence: { filesChecked: ["LICENSE"], found: true, details: "Found" },
    };

    it.each([
      { pointsAwarded: NaN }, { pointsAwarded: Infinity }, { pointsAwarded: -Infinity },
      { maxPoints: NaN }, { maxPoints: Infinity }, { maxPoints: -Infinity }, { maxPoints: -1 },
    ])("rejects invalid numerical results %j in both helpers and the orchestrator", (invalid) => {
      const checks = [{ ...baseCheck, ...invalid }];
      expect(() => computeHealthScore(checks)).toThrow(TypeError);
      expect(() => calculateCategoryScores(checks)).toThrow(TypeError);
      vi.spyOn(hygiene, "checkHygiene").mockReturnValue(checks);
      expect(() => run({ paths: [] })).toThrow(TypeError);
    });

    it("rejects duplicates in both exported score helpers", () => {
      expect(() => computeHealthScore([baseCheck, baseCheck])).toThrow("duplicate check ID");
      expect(() => calculateCategoryScores([baseCheck, baseCheck])).toThrow("duplicate check ID");
    });

    it("rejects unsupported categories including inherited object property names", () => {
      for (const category of ["unknown", "toString", "__proto__"]) {
        const checks = [{ ...baseCheck, category }];
        expect(() => Reflect.apply(computeHealthScore, undefined, [checks])).toThrow("unknown category");
        expect(() => Reflect.apply(calculateCategoryScores, undefined, [checks])).toThrow("unknown category");
      }
    });

    it("floors negative points and caps checks without mutating their results", () => {
      const checks = [{ ...baseCheck, pointsAwarded: 50 }, { ...baseCheck, id: "negative", pointsAwarded: -10 }];
      expect(computeHealthScore(checks).healthScore).toBe(10);
      expect(calculateCategoryScores(checks).hygiene.pointsAwarded).toBe(10);
      expect(checks.map((check) => check.pointsAwarded)).toEqual([50, -10]);
    });

    it("preserves fractional awarded points instead of rounding the sum", () => {
      const checks = [{ ...baseCheck, pointsAwarded: 2.25 }];
      expect(computeHealthScore(checks).healthScore).toBe(2.25);
      expect(calculateCategoryScores(checks).hygiene.pointsAwarded).toBe(2.25);
    });

    it("caps all categories and their combined score at the rubric maxima", () => {
      const checks = Object.entries(CATEGORY_WEIGHTS).flatMap(([category]) => {
        const categoryCheck = run({ paths: [] }).checks.find((check) => check.category === category);
        if (!categoryCheck) throw new Error(`Missing category ${category}`);
        return [
          { ...categoryCheck, id: `${category}-1`, pointsAwarded: 100, maxPoints: 100 },
          { ...categoryCheck, id: `${category}-2`, pointsAwarded: 100, maxPoints: 100 },
        ];
      });
      expect(computeHealthScore(checks)).toEqual({ healthScore: 100, categoryScores: CATEGORY_WEIGHTS });
      for (const summary of Object.values(calculateCategoryScores(checks))) {
        expect(summary.pointsAwarded).toBe(summary.maxPoints);
      }
    });
  });

  describe("API Compatibility & Alternative Call Styles", () => {
    it("supports standalone run() function import", () => {
      const report = run({
        paths: new Set(["license"]),
      });
      expect(report.healthScore).toBe(10);
    });

    it("supports scoreRepository() function alias", () => {
      const report = scoreRepository({
        paths: new Set(["license"]),
      });
      expect(report.healthScore).toBe(10);
      expect(runScoringEngine({ paths: new Set(["license"]) }).healthScore).toBe(10);
    });

    it("supports class instance new ScoringEngine().run()", () => {
      const engine = new ScoringEngine();
      const report = engine.run({
        paths: new Set(["license"]),
      });
      expect(report.healthScore).toBe(10);
    });
  });
});
