// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { RepoTree, TreeEntry } from "@/src/lib/types";
import { buildPathSet } from "../../utils";
import {
  checkSecurityPolicy,
  checkDependencyScanning,
  checkSecurity,
  runSecurityChecks,
  SECURITY_CATEGORY_ID,
  SECURITY_POLICY_CHECK_ID,
  DEPENDENCY_SCANNING_CHECK_ID,
  SECURITY_CHECK_IDS,
  SECURITY_CHECK_NAMES,
  SECURITY_MAX_POINTS,
  SECURITY_POLICY_MAX_POINTS,
  DEPENDENCY_SCANNING_MAX_POINTS,
  SECURITY_CATEGORY_MAX_POINTS,
  SECURITY_POLICY_CANDIDATES,
  DEPENDENCY_SCANNING_CANDIDATES,
} from "../security";

describe("Security Baseline Checks (Task 1.2.6)", () => {
  describe("Constants and metadata", () => {
    it("exports consistent check identifiers", () => {
      expect(SECURITY_CATEGORY_ID).toBe("security");
      expect(SECURITY_CHECK_IDS.POLICY).toBe("security-policy");
      expect(SECURITY_CHECK_IDS.DEPENDENCY_SCANNING).toBe("dependency-scanning");
      expect(SECURITY_POLICY_CHECK_ID).toBe(SECURITY_CHECK_IDS.POLICY);
      expect(DEPENDENCY_SCANNING_CHECK_ID).toBe(SECURITY_CHECK_IDS.DEPENDENCY_SCANNING);
    });

    it("exports consistent human-readable check names", () => {
      expect(SECURITY_CHECK_NAMES.POLICY).toBe("Security policy");
      expect(SECURITY_CHECK_NAMES.DEPENDENCY_SCANNING).toBe("Dependency scanning configured");
    });

    it("exports matching point allocations totaling 15 points", () => {
      expect(SECURITY_MAX_POINTS.POLICY).toBe(10);
      expect(SECURITY_MAX_POINTS.DEPENDENCY_SCANNING).toBe(5);
      expect(SECURITY_MAX_POINTS.TOTAL).toBe(15);
      expect(SECURITY_POLICY_MAX_POINTS).toBe(10);
      expect(DEPENDENCY_SCANNING_MAX_POINTS).toBe(5);
      expect(SECURITY_CATEGORY_MAX_POINTS).toBe(15);
      expect(SECURITY_POLICY_MAX_POINTS + DEPENDENCY_SCANNING_MAX_POINTS).toBe(15);
    });

    it("exports candidate lists exactly matching rubric v1.0", () => {
      expect(SECURITY_POLICY_CANDIDATES).toEqual([
        "SECURITY.md",
        ".github/SECURITY.md",
      ]);
      expect(DEPENDENCY_SCANNING_CANDIDATES).toEqual([
        ".github/dependabot.yml",
        ".github/dependabot.yaml",
        "renovate.json",
        ".renovaterc",
        ".renovaterc.json",
      ]);
    });
  });

  describe("checkSecurityPolicy", () => {
    it("passes and awards 10 points when root SECURITY.md is present", () => {
      const paths = new Set(["security.md"]);
      const result = checkSecurityPolicy(paths);

      expect(result).toEqual({
        id: SECURITY_POLICY_CHECK_ID,
        name: "Security policy",
        category: SECURITY_CATEGORY_ID,
        pointsAwarded: 10,
        maxPoints: SECURITY_POLICY_MAX_POINTS,
        passed: true,
        evidence: {
          filesChecked: [...SECURITY_POLICY_CANDIDATES],
          found: true,
          details:
            'Security policy file detected at "SECURITY.md". Verified file presence in repository tree (content not inspected).',
        },
      });
      expect(result.remediation).toBeUndefined();
    });

    it("passes and awards 10 points when .github/SECURITY.md is present", () => {
      const paths = new Set([".github/security.md"]);
      const result = checkSecurityPolicy(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(10);
      expect(result.maxPoints).toBe(10);
      expect(result.evidence.found).toBe(true);
      expect(result.evidence.details).toContain(".github/SECURITY.md");
      expect(result.remediation).toBeUndefined();
    });

    it("prioritizes root SECURITY.md over .github/SECURITY.md when both exist", () => {
      const paths = new Set(["security.md", ".github/security.md"]);
      const result = checkSecurityPolicy(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(10);
      expect(result.evidence.details).toContain('"SECURITY.md"');
    });

    it("handles case-insensitivity correctly across various casings", () => {
      const upperPaths = new Set(["SECURITY.md"]); // raw Set with uppercase
      const result1 = checkSecurityPolicy(upperPaths);
      expect(result1.passed).toBe(true);
      expect(result1.pointsAwarded).toBe(10);

      const tree: TreeEntry[] = [
        { path: "SECURITY.MD", mode: "100644", type: "blob", sha: "s1" },
      ];
      const result2 = checkSecurityPolicy(buildPathSet(tree));
      expect(result2.passed).toBe(true);
      expect(result2.pointsAwarded).toBe(10);

      const nestedTree: TreeEntry[] = [
        { path: ".GITHUB/Security.md", mode: "100644", type: "blob", sha: "s2" },
      ];
      const result3 = checkSecurityPolicy(buildPathSet(nestedTree));
      expect(result3.passed).toBe(true);
      expect(result3.pointsAwarded).toBe(10);
    });

    it("fails and awards 0 points when the repository tree is empty", () => {
      const emptyPaths = new Set<string>();
      const result = checkSecurityPolicy(emptyPaths);

      expect(result).toEqual({
        id: SECURITY_POLICY_CHECK_ID,
        name: "Security policy",
        category: SECURITY_CATEGORY_ID,
        pointsAwarded: 0,
        maxPoints: 10,
        passed: false,
        evidence: {
          filesChecked: [...SECURITY_POLICY_CANDIDATES],
          found: false,
          details:
            "No security policy found. Checked: SECURITY.md, .github/SECURITY.md.",
        },
        remediation: {
          canAutomate: true,
          targetPath: "SECURITY.md",
          description:
            "Add a SECURITY.md file at the repository root or in .github/ to document vulnerability disclosure procedures and contact information.",
        },
      });
    });

    it("fails when only unrelated files exist in the repository", () => {
      const paths = new Set(["readme.md", "package.json", "src/index.ts"]);
      const result = checkSecurityPolicy(paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.evidence.found).toBe(false);
      expect(result.remediation?.canAutomate).toBe(true);
      expect(result.remediation?.targetPath).toBe("SECURITY.md");
    });

    it("does not match non-standard or unsupported nested paths", () => {
      // docs/SECURITY.md or sub/SECURITY.md should not match according to the rubric
      const paths = new Set(["docs/security.md", "internal/security.md"]);
      const result = checkSecurityPolicy(paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });

    it("does not match prefix or suffix variations (e.g. SECURITY.md.bak)", () => {
      const paths = new Set(["security.md.bak", "my-security.md"]);
      const result = checkSecurityPolicy(paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });

    it("accepts TreeEntry array directly", () => {
      const tree: TreeEntry[] = [
        { path: "SECURITY.md", mode: "100644", type: "blob", sha: "abc" },
      ];
      const result = checkSecurityPolicy(tree);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(10);
    });

    it("accepts RepoTree object directly", () => {
      const repoTree: RepoTree = {
        sha: "tree-sha",
        truncated: false,
        tree: [
          { path: ".github/SECURITY.md", mode: "100644", type: "blob", sha: "xyz" },
        ],
      };
      const result = checkSecurityPolicy(repoTree);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(10);
    });

    describe("content validation behavior", () => {
      it("passes with verified content when non-empty content is provided as string", () => {
        const paths = new Set(["security.md"]);
        const content = "# Security Policy\n\nPlease report vulnerabilities to security@example.com.";
        const result = checkSecurityPolicy(paths, content);

        expect(result.passed).toBe(true);
        expect(result.pointsAwarded).toBe(10);
        expect(result.evidence.details).toContain("verified non-empty content");
        expect(result.evidence.details).toContain(`${content.length} characters`);
      });

      it("passes with verified content when non-empty content is provided via options object", () => {
        const paths = new Set(["security.md"]);
        const result = checkSecurityPolicy(paths, {
          content: "Report issues via private advisory.",
        });

        expect(result.passed).toBe(true);
        expect(result.pointsAwarded).toBe(10);
        expect(result.evidence.details).toContain("verified non-empty content");
      });

      it("fails and provides targeted remediation when content is empty or whitespace only", () => {
        const paths = new Set(["security.md"]);
        const result = checkSecurityPolicy(paths, "   \n\t  ");

        expect(result.passed).toBe(false);
        expect(result.pointsAwarded).toBe(0);
        expect(result.evidence.found).toBe(false);
        expect(result.evidence.details).toContain("empty");
        expect(result.remediation).toEqual({
          canAutomate: true,
          targetPath: "SECURITY.md",
          description:
            'Add vulnerability reporting instructions and contact information to "SECURITY.md".',
        });
      });

      it("fails and provides targeted remediation when content is empty via options object", () => {
        const paths = new Set([".github/security.md"]);
        const result = checkSecurityPolicy(paths, { content: "" });

        expect(result.passed).toBe(false);
        expect(result.pointsAwarded).toBe(0);
        expect(result.remediation).toEqual({
          canAutomate: true,
          targetPath: ".github/SECURITY.md",
          description:
            'Add vulnerability reporting instructions and contact information to ".github/SECURITY.md".',
        });
      });

      it("fails when tree does not have the file even if content was passed", () => {
        const paths = new Set<string>();
        const result = checkSecurityPolicy(paths, "some content");

        expect(result.passed).toBe(false);
        expect(result.pointsAwarded).toBe(0);
      });
    });
  });

  describe("checkDependencyScanning", () => {
    it.each([
      [".github/dependabot.yml", ".github/dependabot.yml"],
      [".github/dependabot.yaml", ".github/dependabot.yaml"],
      ["renovate.json", "renovate.json"],
      [".renovaterc", ".renovaterc"],
      [".renovaterc.json", ".renovaterc.json"],
    ])("passes and awards 5 points when %s is present", (candidate, pathInTree) => {
      const paths = new Set([pathInTree.toLowerCase()]);
      const result = checkDependencyScanning(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(5);
      expect(result.maxPoints).toBe(DEPENDENCY_SCANNING_MAX_POINTS);
      expect(result.id).toBe(DEPENDENCY_SCANNING_CHECK_ID);
      expect(result.name).toBe("Dependency scanning configured");
      expect(result.category).toBe(SECURITY_CATEGORY_ID);
      expect(result.evidence.found).toBe(true);
      expect(result.evidence.details).toContain(candidate);
      expect(result.remediation).toBeUndefined();
    });

    it("respects candidate priority order when multiple configs exist", () => {
      // .github/dependabot.yml takes priority over renovate.json
      const paths = new Set([".github/dependabot.yml", "renovate.json"]);
      const result = checkDependencyScanning(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(5);
      expect(result.evidence.details).toContain(".github/dependabot.yml");
    });

    it("handles case-insensitivity correctly for dependency scanning configs", () => {
      const tree: TreeEntry[] = [
        { path: ".GITHUB/DEPENDABOT.YML", mode: "100644", type: "blob", sha: "s1" },
      ];
      const result = checkDependencyScanning(buildPathSet(tree));

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(5);

      const treeRenovate: TreeEntry[] = [
        { path: "RENOVATE.JSON", mode: "100644", type: "blob", sha: "s2" },
      ];
      const resultRenovate = checkDependencyScanning(buildPathSet(treeRenovate));
      expect(resultRenovate.passed).toBe(true);
      expect(resultRenovate.pointsAwarded).toBe(5);
    });

    it("normalizes uppercase strings passed directly in a Set", () => {
      const rawSet = new Set(["RENOVATE.JSON"]);
      const result = checkDependencyScanning(rawSet);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(5);
    });

    it("fails and awards 0 points when no dependency scanning config is present", () => {
      const emptyPaths = new Set<string>();
      const result = checkDependencyScanning(emptyPaths);

      expect(result).toEqual({
        id: DEPENDENCY_SCANNING_CHECK_ID,
        name: "Dependency scanning configured",
        category: SECURITY_CATEGORY_ID,
        pointsAwarded: 0,
        maxPoints: 5,
        passed: false,
        evidence: {
          filesChecked: [...DEPENDENCY_SCANNING_CANDIDATES],
          found: false,
          details:
            "No dependency scanning configuration found. Checked: .github/dependabot.yml, .github/dependabot.yaml, renovate.json, .renovaterc, .renovaterc.json.",
        },
        remediation: {
          canAutomate: false,
          targetPath: ".github/dependabot.yml",
          description:
            "Configure automated dependency updates with Dependabot (.github/dependabot.yml) or Renovate (renovate.json) to keep dependencies patched.",
        },
      });
    });

    it("does not match dependabot.yml at the root without .github/ directory", () => {
      const paths = new Set(["dependabot.yml"]);
      const result = checkDependencyScanning(paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });

    it("does not match nested renovate configs in subdirectories", () => {
      const paths = new Set(["packages/app/renovate.json"]);
      const result = checkDependencyScanning(paths);

      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });

    it("accepts TreeEntry array and RepoTree directly", () => {
      const tree: TreeEntry[] = [
        { path: ".renovaterc.json", mode: "100644", type: "blob", sha: "r1" },
      ];
      expect(checkDependencyScanning(tree).passed).toBe(true);

      const repoTree: RepoTree = {
        sha: "tree-sha",
        truncated: false,
        tree: [
          { path: ".github/dependabot.yaml", mode: "100644", type: "blob", sha: "d1" },
        ],
      };
      expect(checkDependencyScanning(repoTree).passed).toBe(true);
    });

    describe("content validation behavior", () => {
      it("passes with verified content when non-empty YAML/JSON is provided", () => {
        const paths = new Set([".github/dependabot.yml"]);
        const content = "version: 2\nupdates:\n  - package-ecosystem: npm\n    directory: '/'\n    schedule:\n      interval: daily";
        const result = checkDependencyScanning(paths, content);

        expect(result.passed).toBe(true);
        expect(result.pointsAwarded).toBe(5);
        expect(result.evidence.details).toContain("verified non-empty content");
      });

      it("fails and provides targeted remediation when provided content is empty", () => {
        const paths = new Set([".github/dependabot.yml"]);
        const result = checkDependencyScanning(paths, "");

        expect(result.passed).toBe(false);
        expect(result.pointsAwarded).toBe(0);
        expect(result.evidence.found).toBe(false);
        expect(result.evidence.details).toContain("empty");
        expect(result.remediation).toEqual({
          canAutomate: false,
          targetPath: ".github/dependabot.yml",
          description:
            'Add valid dependency update configuration to ".github/dependabot.yml".',
        });
      });

      it("fails when empty content is provided via options object", () => {
        const paths = new Set(["renovate.json"]);
        const result = checkDependencyScanning(paths, { content: "  " });

        expect(result.passed).toBe(false);
        expect(result.pointsAwarded).toBe(0);
        expect(result.remediation).toEqual({
          canAutomate: false,
          targetPath: "renovate.json",
          description: 'Add valid dependency update configuration to "renovate.json".',
        });
      });
    });
  });

  describe("checkSecurity and runSecurityChecks orchestrator", () => {
    it("is aliased properly", () => {
      expect(runSecurityChecks).toBe(checkSecurity);
    });

    it("runs both checks and awards full 15 points when both files are present", () => {
      const paths = new Set(["security.md", ".github/dependabot.yml"]);
      const results = checkSecurity(paths);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(SECURITY_POLICY_CHECK_ID);
      expect(results[0].pointsAwarded).toBe(10);
      expect(results[0].passed).toBe(true);

      expect(results[1].id).toBe(DEPENDENCY_SCANNING_CHECK_ID);
      expect(results[1].pointsAwarded).toBe(5);
      expect(results[1].passed).toBe(true);

      const totalPoints = results.reduce((sum, r) => sum + r.pointsAwarded, 0);
      const totalMax = results.reduce((sum, r) => sum + r.maxPoints, 0);

      expect(totalPoints).toBe(15);
      expect(totalMax).toBe(SECURITY_CATEGORY_MAX_POINTS);
      expect(totalPoints).toBeLessThanOrEqual(SECURITY_CATEGORY_MAX_POINTS);
    });

    it("awards 10 points when only security policy is present", () => {
      const paths = new Set(["security.md"]);
      const results = runSecurityChecks(paths);

      const totalPoints = results.reduce((sum, r) => sum + r.pointsAwarded, 0);
      expect(totalPoints).toBe(10);
      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(false);
    });

    it("awards 5 points when only dependency scanning is present", () => {
      const paths = new Set(["renovate.json"]);
      const results = runSecurityChecks(paths);

      const totalPoints = results.reduce((sum, r) => sum + r.pointsAwarded, 0);
      expect(totalPoints).toBe(5);
      expect(results[0].passed).toBe(false);
      expect(results[1].passed).toBe(true);
    });

    it("awards 0 points and max 15 points when repository tree is empty", () => {
      const emptyPaths = new Set<string>();
      const results = runSecurityChecks(emptyPaths);

      const totalPoints = results.reduce((sum, r) => sum + r.pointsAwarded, 0);
      const totalMax = results.reduce((sum, r) => sum + r.maxPoints, 0);

      expect(totalPoints).toBe(0);
      expect(totalMax).toBe(15);
      expect(results[0].passed).toBe(false);
      expect(results[1].passed).toBe(false);
    });

    it("never exceeds 15 points total for the security category", () => {
      const allPaths = new Set([
        "security.md",
        ".github/security.md",
        ".github/dependabot.yml",
        ".github/dependabot.yaml",
        "renovate.json",
        ".renovaterc",
        ".renovaterc.json",
      ]);
      const results = runSecurityChecks(allPaths);

      const totalPoints = results.reduce((sum, r) => sum + r.pointsAwarded, 0);
      expect(totalPoints).toBe(15);
      expect(totalPoints).toBeLessThanOrEqual(15);
    });

    it("passes through optional content to both checks", () => {
      const paths = new Set(["security.md", "renovate.json"]);
      const results = runSecurityChecks(paths, {
        securityPolicyContent: "# Policy",
        dependencyScanningContent: '{\n  "$schema": "https://docs.renovatebot.com/renovate-schema.json"\n}',
      });

      expect(results[0].passed).toBe(true);
      expect(results[0].evidence.details).toContain("verified non-empty content");
      expect(results[1].passed).toBe(true);
      expect(results[1].evidence.details).toContain("verified non-empty content");
    });
  });

  describe("Deterministic behavior", () => {
    it("produces identical results across repeated executions", () => {
      const paths = new Set(["security.md", ".github/dependabot.yml", "readme.md"]);
      const firstRun = runSecurityChecks(paths);
      const secondRun = runSecurityChecks(paths);
      const thirdRun = runSecurityChecks(paths);

      expect(firstRun).toEqual(secondRun);
      expect(secondRun).toEqual(thirdRun);
    });
  });
});
