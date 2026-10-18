// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { RepoTree, TreeEntry } from "@/lib/types";
import { buildPathSet } from "../../utils";
import {
  checkCommunity,
  checkIssueTemplates,
  checkPRTemplate,
  checkRepoMetadata,
  COMMUNITY_CATEGORY_ID,
  COMMUNITY_CATEGORY_MAX_POINTS,
  COMMUNITY_CHECK_IDS,
  COMMUNITY_CHECK_NAMES,
  COMMUNITY_MAX_POINTS,
  ISSUE_TEMPLATE_CANDIDATES,
  ISSUE_TEMPLATES_CHECK_ID,
  ISSUE_TEMPLATES_MAX_POINTS,
  PR_TEMPLATE_CANDIDATES,
  PR_TEMPLATE_CHECK_ID,
  PR_TEMPLATE_MAX_POINTS,
  REPO_DESCRIPTION_MAX_POINTS,
  REPO_METADATA_CHECK_ID,
  REPO_METADATA_MAX_POINTS,
  REPO_TOPICS_MAX_POINTS,
} from "../community";

describe("Community & Metadata Checks (Task 1.2.5)", () => {
  describe("Constants and Rubric Allocations", () => {
    it("defines correct IDs, categories, and point maximums matching the rubric", () => {
      expect(COMMUNITY_CATEGORY_ID).toBe("community");
      expect(ISSUE_TEMPLATES_CHECK_ID).toBe("issue-templates");
      expect(PR_TEMPLATE_CHECK_ID).toBe("pr-template");
      expect(REPO_METADATA_CHECK_ID).toBe("repo-metadata");

      expect(ISSUE_TEMPLATES_MAX_POINTS).toBe(4);
      expect(PR_TEMPLATE_MAX_POINTS).toBe(4);
      expect(REPO_METADATA_MAX_POINTS).toBe(7);
      expect(REPO_DESCRIPTION_MAX_POINTS).toBe(4);
      expect(REPO_TOPICS_MAX_POINTS).toBe(3);
      expect(COMMUNITY_CATEGORY_MAX_POINTS).toBe(15);

      expect(COMMUNITY_MAX_POINTS.TOTAL).toBe(15);
      expect(
        ISSUE_TEMPLATES_MAX_POINTS +
          PR_TEMPLATE_MAX_POINTS +
          REPO_METADATA_MAX_POINTS,
      ).toBe(COMMUNITY_CATEGORY_MAX_POINTS);

      expect(ISSUE_TEMPLATE_CANDIDATES).toContain(".github/ISSUE_TEMPLATE.md");
      expect(PR_TEMPLATE_CANDIDATES).toContain(".github/PULL_REQUEST_TEMPLATE.md");
    });
  });
  describe("checkIssueTemplates", () => {
    it("passes with 4 points when .github/ISSUE_TEMPLATE.md exists", () => {
      const paths = new Set(["readme.md", ".github/issue_template.md"]);
      const result = checkIssueTemplates(paths);

      expect(result.id).toBe(COMMUNITY_CHECK_IDS.ISSUE_TEMPLATES);
      expect(result.name).toBe(COMMUNITY_CHECK_NAMES.ISSUE_TEMPLATES);
      expect(result.category).toBe("community");
      expect(result.pointsAwarded).toBe(4);
      expect(result.maxPoints).toBe(4);
      expect(result.passed).toBe(true);
      expect(result.evidence.found).toBe(true);
      expect(result.evidence.filesChecked).toEqual([".github/issue_template.md"]);
      expect(result.evidence.details).toContain(".github/issue_template.md");
      expect(result.remediation).toBeUndefined();
    });

    it("passes with 4 points for uppercase paths (.github/ISSUE_TEMPLATE.MD)", () => {
      const paths = new Set([".github/issue_template.md"]);
      const result = checkIssueTemplates(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(4);
      expect(result.evidence.found).toBe(true);
    });

    it("normalizes an unlowercased Set input", () => {
      const paths = new Set([".GITHUB/ISSUE_TEMPLATE.MD"]);
      const result = checkIssueTemplates(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(4);
    });

    it("passes when .github/issue_template.yaml or .yml is used", () => {
      const pathsYml = new Set([".github/issue_template.yml"]);
      const resultYml = checkIssueTemplates(pathsYml);
      expect(resultYml.passed).toBe(true);
      expect(resultYml.pointsAwarded).toBe(4);

      const pathsYaml = new Set([".github/issue_template.yaml"]);
      const resultYaml = checkIssueTemplates(pathsYaml);
      expect(resultYaml.passed).toBe(true);
      expect(resultYaml.pointsAwarded).toBe(4);
    });

    it("passes with 4 points when template files exist inside .github/ISSUE_TEMPLATE/", () => {
      const paths = new Set([
        ".github/issue_template/bug_report.md",
        ".github/issue_template/feature_request.md",
      ]);
      const result = checkIssueTemplates(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(4);
      expect(result.evidence.found).toBe(true);
      expect(result.evidence.filesChecked).toEqual([
        ".github/issue_template/bug_report.md",
        ".github/issue_template/feature_request.md",
      ]);
      expect(result.evidence.details).toContain("Found 2 issue template(s)");
      expect(result.remediation).toBeUndefined();
    });

    it("passes when files are deeply nested inside .github/ISSUE_TEMPLATE/", () => {
      const paths = new Set([
        ".github/issue_template/subfolder/custom_template.md",
      ]);
      const result = checkIssueTemplates(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(4);
      expect(result.evidence.filesChecked).toEqual([
        ".github/issue_template/subfolder/custom_template.md",
      ]);
    });

    it("handles both single template file and directory templates simultaneously", () => {
      const paths = new Set([
        ".github/issue_template.md",
        ".github/issue_template/bug_report.md",
      ]);
      const result = checkIssueTemplates(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(4);
      expect(result.evidence.filesChecked).toContain(".github/issue_template.md");
      expect(result.evidence.filesChecked).toContain(
        ".github/issue_template/bug_report.md",
      );
      expect(result.evidence.details).toContain("Found issue template file");
    });

    it("accepts TreeEntry[] directly", () => {
      const entries: TreeEntry[] = [
        {
          path: ".github/ISSUE_TEMPLATE/bug.md",
          mode: "100644",
          type: "blob",
          sha: "sha1",
        },
      ];
      const result = checkIssueTemplates(entries);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(4);
    });

    it("accepts RepoTree directly", () => {
      const repoTree: RepoTree = {
        sha: "tree-sha",
        truncated: false,
        tree: [
          {
            path: ".github/issue_template.md",
            mode: "100644",
            type: "blob",
            sha: "sha1",
          },
        ],
      };
      const result = checkIssueTemplates(repoTree);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(4);
    });

    it("fails with 0 points when path set is empty", () => {
      const result = checkIssueTemplates(new Set());

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.maxPoints).toBe(4);
      expect(result.evidence.found).toBe(false);
      expect(result.evidence.filesChecked).toEqual([
        ".github/ISSUE_TEMPLATE/",
        ".github/ISSUE_TEMPLATE.md",
      ]);
      expect(result.evidence.details).toContain("No issue templates found");
      expect(result.remediation).toBeDefined();
      expect(result.remediation?.canAutomate).toBe(false);
      expect(result.remediation?.targetPath).toBe(
        ".github/ISSUE_TEMPLATE/bug_report.md",
      );
      expect(result.remediation?.description).toBeTruthy();
    });

    it("fails when only empty folder entry exists without nested files", () => {
      const paths = new Set([".github/issue_template"]);
      const result = checkIssueTemplates(paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });

    it("fails when issue template is located at repository root instead of .github/", () => {
      const paths = new Set(["issue_template.md", "issue_template.yml"]);
      const result = checkIssueTemplates(paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });

    it("fails when issue template is in an unrelated directory (e.g. docs/ or src/)", () => {
      const paths = new Set([
        "docs/issue_template.md",
        "src/.github/issue_template.md",
      ]);
      const result = checkIssueTemplates(paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });
  });

  describe("checkPRTemplate", () => {
    it("passes with 4 points when .github/PULL_REQUEST_TEMPLATE.md exists", () => {
      const paths = new Set(["readme.md", ".github/pull_request_template.md"]);
      const result = checkPRTemplate(paths);

      expect(result.id).toBe(COMMUNITY_CHECK_IDS.PR_TEMPLATE);
      expect(result.name).toBe(COMMUNITY_CHECK_NAMES.PR_TEMPLATE);
      expect(result.category).toBe("community");
      expect(result.pointsAwarded).toBe(4);
      expect(result.maxPoints).toBe(4);
      expect(result.passed).toBe(true);
      expect(result.evidence.found).toBe(true);
      expect(result.evidence.filesChecked).toEqual([
        ".github/pull_request_template.md",
      ]);
      expect(result.evidence.details).toContain(".github/pull_request_template.md");
      expect(result.remediation).toBeUndefined();
    });

    it("passes with 4 points for .github/pull_request_template.txt", () => {
      const paths = new Set([".github/pull_request_template.txt"]);
      const result = checkPRTemplate(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(4);
    });

    it("normalizes an unlowercased Set input", () => {
      const paths = new Set([".GITHUB/PULL_REQUEST_TEMPLATE.MD"]);
      const result = checkPRTemplate(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(4);
    });

    it("passes with 4 points when templates exist inside .github/PULL_REQUEST_TEMPLATE/", () => {
      const paths = new Set([
        ".github/pull_request_template/pull_request_template.md",
      ]);
      const result = checkPRTemplate(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(4);
      expect(result.evidence.found).toBe(true);
      expect(result.evidence.filesChecked).toEqual([
        ".github/pull_request_template/pull_request_template.md",
      ]);
      expect(result.remediation).toBeUndefined();
    });

    it("passes when templates are nested inside .github/PULL_REQUEST_TEMPLATE/", () => {
      const paths = new Set([
        ".github/pull_request_template/branches/feature.md",
      ]);
      const result = checkPRTemplate(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(4);
    });

    it("accepts TreeEntry[] directly", () => {
      const entries: TreeEntry[] = [
        {
          path: ".github/pull_request_template.md",
          mode: "100644",
          type: "blob",
          sha: "sha2",
        },
      ];
      const result = checkPRTemplate(entries);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(4);
    });

    it("fails with 0 points when path set is empty", () => {
      const result = checkPRTemplate(new Set());

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.maxPoints).toBe(4);
      expect(result.evidence.found).toBe(false);
      expect(result.evidence.filesChecked).toEqual([
        ".github/PULL_REQUEST_TEMPLATE.md",
        ".github/PULL_REQUEST_TEMPLATE/",
      ]);
      expect(result.evidence.details).toContain("No pull request template found");
      expect(result.remediation).toBeDefined();
      expect(result.remediation?.canAutomate).toBe(false);
      expect(result.remediation?.targetPath).toBe(
        ".github/pull_request_template.md",
      );
      expect(result.remediation?.description).toBeTruthy();
    });

    it("fails when PR template is at repository root instead of .github/", () => {
      const paths = new Set(["pull_request_template.md"]);
      const result = checkPRTemplate(paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });

    it("fails when PR template is in an unrelated directory (e.g. docs/)", () => {
      const paths = new Set(["docs/pull_request_template.md"]);
      const result = checkPRTemplate(paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });

    it("fails when only empty folder entry exists without nested files", () => {
      const paths = new Set([".github/pull_request_template"]);
      const result = checkPRTemplate(paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });
  });

  describe("checkRepoMetadata", () => {
    it("passes with 7 points when both description and topics are provided", () => {
      const result = checkRepoMetadata(
        "A repository intelligence and health auditing platform",
        ["developer-tools", "governance"],
      );

      expect(result.id).toBe(COMMUNITY_CHECK_IDS.REPO_METADATA);
      expect(result.name).toBe(COMMUNITY_CHECK_NAMES.REPO_METADATA);
      expect(result.category).toBe("community");
      expect(result.pointsAwarded).toBe(7);
      expect(result.maxPoints).toBe(7);
      expect(result.passed).toBe(true);
      expect(result.evidence.found).toBe(true);
      expect(result.evidence.filesChecked).toEqual([]);
      expect(result.evidence.details).toContain("non-empty description");
      expect(result.evidence.details).toContain("2 topic(s)");
      expect(result.remediation).toBeUndefined();
    });

    it("accepts a single metadata object as argument", () => {
      const result = checkRepoMetadata({
        description: "Valid description",
        topics: ["typescript"],
      });

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(7);
    });

    it("awards 4 points (fails) when description is present but topics are empty", () => {
      const result = checkRepoMetadata("Only description is present", []);

      expect(result.pointsAwarded).toBe(4);
      expect(result.maxPoints).toBe(7);
      expect(result.passed).toBe(false);
      expect(result.evidence.found).toBe(false);
      expect(result.evidence.details).toContain("no repository topics are set");
      expect(result.remediation).toBeDefined();
      expect(result.remediation?.canAutomate).toBe(false);
      expect(result.remediation?.targetPath).toBe("GitHub Repository Settings");
      expect(result.remediation?.description).toContain("at least one repository topic");
    });

    it("awards 4 points when topics are null or undefined", () => {
      const resultNull = checkRepoMetadata("Valid description", null);
      expect(resultNull.pointsAwarded).toBe(4);
      expect(resultNull.passed).toBe(false);

      const resultUndefined = checkRepoMetadata("Valid description", undefined);
      expect(resultUndefined.pointsAwarded).toBe(4);
      expect(resultUndefined.passed).toBe(false);
    });

    it("awards 4 points when topics contain only empty or whitespace strings", () => {
      const result = checkRepoMetadata("Valid description", ["", "   ", "\t"]);
      expect(result.pointsAwarded).toBe(4);
      expect(result.passed).toBe(false);
    });

    it("awards 3 points (fails) when topics exist but description is missing or null", () => {
      const resultNull = checkRepoMetadata(null, ["nextjs", "react"]);

      expect(resultNull.pointsAwarded).toBe(3);
      expect(resultNull.maxPoints).toBe(7);
      expect(resultNull.passed).toBe(false);
      expect(resultNull.evidence.found).toBe(false);
      expect(resultNull.evidence.details).toContain("description is missing or empty");
      expect(resultNull.remediation).toBeDefined();
      expect(resultNull.remediation?.canAutomate).toBe(false);
      expect(resultNull.remediation?.description).toContain("Add a repository description");
    });

    it("awards 3 points when description is an empty string or whitespace only", () => {
      const resultEmpty = checkRepoMetadata("", ["topic1"]);
      expect(resultEmpty.pointsAwarded).toBe(3);
      expect(resultEmpty.passed).toBe(false);

      const resultWhitespace = checkRepoMetadata("   \n\t  ", ["topic1"]);
      expect(resultWhitespace.pointsAwarded).toBe(3);
      expect(resultWhitespace.passed).toBe(false);
    });

    it("awards 0 points (fails) when both description and topics are missing", () => {
      const result = checkRepoMetadata(undefined, undefined);

      expect(result.pointsAwarded).toBe(0);
      expect(result.maxPoints).toBe(7);
      expect(result.passed).toBe(false);
      expect(result.evidence.found).toBe(false);
      expect(result.evidence.filesChecked).toEqual([]);
      expect(result.evidence.details).toContain("description is missing or empty");
      expect(result.evidence.details).toContain("no repository topics are set");
      expect(result.remediation).toBeDefined();
      expect(result.remediation?.targetPath).toBe("GitHub Repository Settings");
    });

    it("awards 0 points when description is empty string and topics is empty array", () => {
      const result = checkRepoMetadata("", []);

      expect(result.pointsAwarded).toBe(0);
      expect(result.passed).toBe(false);
    });

    it("trims topic strings and formats details cleanly", () => {
      const result = checkRepoMetadata("Clean description", ["  nextjs  ", "  vitest "]);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(7);
      expect(result.evidence.details).toContain("nextjs, vitest");
    });

    it("truncates long descriptions in details preview", () => {
      const longDescription = "A".repeat(120);
      const result = checkRepoMetadata(longDescription, ["topic"]);

      expect(result.passed).toBe(true);
      expect(result.evidence.details).toContain("...");
    });
  });

  describe("checkCommunity (aggregate runner)", () => {
    it("awards the maximum 15 points when all indicators are present", () => {
      const paths = new Set([
        ".github/issue_template.md",
        ".github/pull_request_template.md",
      ]);
      const metadata = {
        description: "Repodoc repository health auditing",
        topics: ["audit", "governance"],
      };

      const checks = checkCommunity(paths, metadata);

      expect(checks).toHaveLength(3);
      expect(checks.map((c) => c.category)).toEqual([
        "community",
        "community",
        "community",
      ]);

      const totalScore = checks.reduce((sum, c) => sum + c.pointsAwarded, 0);
      const maxScore = checks.reduce((sum, c) => sum + c.maxPoints, 0);

      expect(totalScore).toBe(COMMUNITY_MAX_POINTS.TOTAL);
      expect(maxScore).toBe(COMMUNITY_MAX_POINTS.TOTAL);
      expect(totalScore).toBe(15);
      expect(checks.every((c) => c.passed)).toBe(true);
    });

    it("awards 0 points when tree is empty and no metadata is provided", () => {
      const checks = checkCommunity(new Set());

      expect(checks).toHaveLength(3);
      const totalScore = checks.reduce((sum, c) => sum + c.pointsAwarded, 0);
      expect(totalScore).toBe(0);
      expect(checks.every((c) => !c.passed)).toBe(true);
    });

    it("computes exact partial score (e.g. 11/15) when only topics are missing", () => {
      const paths = new Set([
        ".github/issue_template/bug.md",
        ".github/pull_request_template.md",
      ]);
      const metadata = {
        description: "Has description",
        topics: [],
      };

      const checks = checkCommunity(paths, metadata);
      const totalScore = checks.reduce((sum, c) => sum + c.pointsAwarded, 0);

      // 4 (issue) + 4 (PR) + 4 (desc only) = 12? No, 4 + 4 + 4 = 12 points!
      expect(totalScore).toBe(12);
      expect(checks[0]?.passed).toBe(true);
      expect(checks[1]?.passed).toBe(true);
      expect(checks[2]?.passed).toBe(false);
    });

    it("computes exact partial score (e.g. 7/15) when only metadata is present", () => {
      const checks = checkCommunity(new Set(), {
        description: "Project description",
        topics: ["tools"],
      });

      const totalScore = checks.reduce((sum, c) => sum + c.pointsAwarded, 0);
      expect(totalScore).toBe(7);
      expect(checks[0]?.passed).toBe(false);
      expect(checks[1]?.passed).toBe(false);
      expect(checks[2]?.passed).toBe(true);
    });

    it("accepts TreeEntry[] directly in checkCommunity", () => {
      const entries: TreeEntry[] = [
        {
          path: ".github/ISSUE_TEMPLATE/feature.md",
          mode: "100644",
          type: "blob",
          sha: "sha1",
        },
        {
          path: ".github/pull_request_template.md",
          mode: "100644",
          type: "blob",
          sha: "sha2",
        },
      ];
      const checks = checkCommunity(entries, {
        description: "Valid desc",
        topics: ["testing"],
      });

      const totalScore = checks.reduce((sum, c) => sum + c.pointsAwarded, 0);
      expect(totalScore).toBe(15);
    });

    it("is deterministic across repeated invocations", () => {
      const tree: TreeEntry[] = [
        {
          path: ".github/issue_template/bug.md",
          mode: "100644",
          type: "blob",
          sha: "s1",
        },
        {
          path: ".github/pull_request_template.md",
          mode: "100644",
          type: "blob",
          sha: "s2",
        },
      ];
      const paths = buildPathSet(tree);
      const metadata = {
        description: "Deterministic test",
        topics: ["alpha", "beta"],
      };

      const run1 = checkCommunity(paths, metadata);
      const run2 = checkCommunity(paths, metadata);

      expect(run1).toEqual(run2);
    });

    it("never exceeds 15 points even with redundant files", () => {
      const paths = new Set([
        ".github/issue_template.md",
        ".github/issue_template/bug.md",
        ".github/issue_template/feature.yml",
        ".github/pull_request_template.md",
        ".github/pull_request_template/default.md",
      ]);
      const metadata = {
        description: "Multi template repo",
        topics: ["a", "b", "c", "d"],
      };

      const checks = checkCommunity(paths, metadata);
      const totalScore = checks.reduce((sum, c) => sum + c.pointsAwarded, 0);

      expect(totalScore).toBe(15);
      expect(totalScore).toBeLessThanOrEqual(COMMUNITY_MAX_POINTS.TOTAL);
    });
  });
});
