// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { CheckResult } from "@/lib/types";
import { buildPathSet } from "@/lib/scoring/utils";
import {
  checkLicense,
  checkGitignore,
  checkCodeOfConduct,
  checkHygiene,
  HYGIENE_MAX_POINTS,
  LICENSE_MAX_POINTS,
  GITIGNORE_MAX_POINTS,
  CODE_OF_CONDUCT_MAX_POINTS,
  LICENSE_CANDIDATES,
  GITIGNORE_CANDIDATES,
  CODE_OF_CONDUCT_CANDIDATES,
} from "../hygiene";

describe("Project Hygiene Checks", () => {
  describe("checkLicense", () => {
    it("passes with full 10 points when standard LICENSE exists", () => {
      const paths = new Set(["license"]);
      const result = checkLicense(paths);

      expect(result).toEqual<CheckResult>({
        id: "license",
        name: "Open-source license",
        category: "hygiene",
        pointsAwarded: 10,
        maxPoints: 10,
        passed: true,
        evidence: {
          filesChecked: [...LICENSE_CANDIDATES],
          found: true,
          details: "Found license file: LICENSE",
        },
      });
      expect(result.remediation).toBeUndefined();
    });

    it("passes when LICENSE.md or LICENSE.txt is present", () => {
      const mdResult = checkLicense(new Set(["license.md"]));
      expect(mdResult.passed).toBe(true);
      expect(mdResult.pointsAwarded).toBe(10);
      expect(mdResult.evidence.details).toContain("LICENSE.md");

      const txtResult = checkLicense(new Set(["license.txt"]));
      expect(txtResult.passed).toBe(true);
      expect(txtResult.pointsAwarded).toBe(10);
      expect(txtResult.evidence.details).toContain("LICENSE.txt");
    });

    it("passes with British spelling LICENCE and its variations", () => {
      const licenceResult = checkLicense(new Set(["licence"]));
      expect(licenceResult.passed).toBe(true);
      expect(licenceResult.pointsAwarded).toBe(10);
      expect(licenceResult.evidence.details).toContain("LICENCE");

      const licenceMdResult = checkLicense(new Set(["licence.md"]));
      expect(licenceMdResult.passed).toBe(true);
      expect(licenceMdResult.pointsAwarded).toBe(10);
      expect(licenceMdResult.evidence.details).toContain("LICENCE.md");
    });

    it("passes with COPYING file", () => {
      const result = checkLicense(new Set(["copying"]));
      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(10);
      expect(result.evidence.details).toContain("COPYING");
    });

    it("passes when license file is in .github directory", () => {
      const result = checkLicense(new Set([".github/license"]));
      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(10);
      expect(result.evidence.details).toContain(".github/LICENSE");
    });

    it("fails with 0 points and remediation when license is missing", () => {
      const result = checkLicense(new Set(["readme.md", ".gitignore"]));

      expect(result.id).toBe("license");
      expect(result.name).toBe("Open-source license");
      expect(result.category).toBe("hygiene");
      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.maxPoints).toBe(10);
      expect(result.evidence.found).toBe(false);
      expect(result.evidence.details).toContain("No open-source license file was found");
      expect(result.remediation).toEqual({
        canAutomate: true,
        targetPath: "LICENSE",
        description:
          "Add an open-source license file (e.g. MIT, Apache-2.0) to clarify reuse permissions.",
        requiresUserInput: "license_selection",
      });
    });

    it("fails cleanly when path set is empty", () => {
      const result = checkLicense(new Set());
      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.remediation?.requiresUserInput).toBe("license_selection");
    });
  });

  describe("checkGitignore", () => {
    it("passes with full 5 points when root .gitignore exists", () => {
      const paths = new Set([".gitignore"]);
      const result = checkGitignore(paths);

      expect(result).toEqual<CheckResult>({
        id: "gitignore",
        name: "Language-appropriate .gitignore",
        category: "hygiene",
        pointsAwarded: 5,
        maxPoints: 5,
        passed: true,
        evidence: {
          filesChecked: [...GITIGNORE_CANDIDATES],
          found: true,
          details: ".gitignore is present at the repository root.",
        },
      });
      expect(result.remediation).toBeUndefined();
    });

    it("fails with 0 points and remediation when .gitignore is missing", () => {
      const paths = new Set(["license", "package.json"]);
      const result = checkGitignore(paths);

      expect(result.id).toBe("gitignore");
      expect(result.name).toBe("Language-appropriate .gitignore");
      expect(result.category).toBe("hygiene");
      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.maxPoints).toBe(5);
      expect(result.evidence.found).toBe(false);
      expect(result.evidence.details).toContain("No .gitignore was found at the repository root");
      expect(result.remediation).toEqual({
        canAutomate: true,
        targetPath: ".gitignore",
        description:
          "Add a .gitignore file to prevent committing build artifacts, dependencies, and environment files.",
      });
    });

    it("does not pass if .gitignore is only in a subdirectory", () => {
      const paths = new Set(["packages/app/.gitignore"]);
      const result = checkGitignore(paths);
      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });

    it("fails cleanly on empty paths set", () => {
      const result = checkGitignore(new Set());
      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });
  });

  describe("checkCodeOfConduct", () => {
    it("passes with full 5 points when CODE_OF_CONDUCT.md is present at root", () => {
      const paths = new Set(["code_of_conduct.md"]);
      const result = checkCodeOfConduct(paths);

      expect(result).toEqual<CheckResult>({
        id: "code-of-conduct",
        name: "Code of conduct",
        category: "hygiene",
        pointsAwarded: 5,
        maxPoints: 5,
        passed: true,
        evidence: {
          filesChecked: [...CODE_OF_CONDUCT_CANDIDATES],
          found: true,
          details: "Found code of conduct file: CODE_OF_CONDUCT.md",
        },
      });
      expect(result.remediation).toBeUndefined();
    });

    it("passes when CODE_OF_CONDUCT is nested under .github/", () => {
      const paths = new Set([".github/code_of_conduct.md"]);
      const result = checkCodeOfConduct(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(5);
      expect(result.evidence.details).toContain(".github/CODE_OF_CONDUCT.md");
    });

    it("passes when CODE_OF_CONDUCT is nested under docs/", () => {
      const paths = new Set(["docs/code_of_conduct.md"]);
      const result = checkCodeOfConduct(paths);

      expect(result.passed).toBe(true);
      expect(result.pointsAwarded).toBe(5);
      expect(result.evidence.details).toContain("docs/CODE_OF_CONDUCT.md");
    });

    it("passes with alternative extensions (.txt or without extension)", () => {
      const txtResult = checkCodeOfConduct(new Set(["code_of_conduct.txt"]));
      expect(txtResult.passed).toBe(true);
      expect(txtResult.pointsAwarded).toBe(5);

      const bareResult = checkCodeOfConduct(new Set(["code_of_conduct"]));
      expect(bareResult.passed).toBe(true);
      expect(bareResult.pointsAwarded).toBe(5);
    });

    it("fails with 0 points and remediation when Code of Conduct is missing", () => {
      const paths = new Set(["license", ".gitignore"]);
      const result = checkCodeOfConduct(paths);

      expect(result.id).toBe("code-of-conduct");
      expect(result.name).toBe("Code of conduct");
      expect(result.category).toBe("hygiene");
      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.maxPoints).toBe(5);
      expect(result.evidence.found).toBe(false);
      expect(result.evidence.details).toContain("No Code of Conduct was found");
      expect(result.remediation).toEqual({
        canAutomate: true,
        targetPath: "CODE_OF_CONDUCT.md",
        description:
          "Add a CODE_OF_CONDUCT.md file defining community standards and reporting guidelines.",
      });
    });

    it("fails cleanly on empty paths set", () => {
      const result = checkCodeOfConduct(new Set());
      expect(result.passed).toBe(false);
      expect(result.pointsAwarded).toBe(0);
    });
  });

  describe("checkHygiene (Aggregator)", () => {
    it("returns all three hygiene checks awarding exactly 20 points when all files are present", () => {
      const tree = [
        { path: "LICENSE", mode: "100644" as const, type: "blob" as const, sha: "sha-1" },
        { path: ".gitignore", mode: "100644" as const, type: "blob" as const, sha: "sha-2" },
        { path: "CODE_OF_CONDUCT.md", mode: "100644" as const, type: "blob" as const, sha: "sha-3" },
      ];
      const paths = buildPathSet(tree);

      const results = checkHygiene(paths);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.id)).toEqual(["license", "gitignore", "code-of-conduct"]);

      const totalAwarded = results.reduce((acc, r) => acc + r.pointsAwarded, 0);
      const totalMax = results.reduce((acc, r) => acc + r.maxPoints, 0);

      expect(totalAwarded).toBe(20);
      expect(totalMax).toBe(HYGIENE_MAX_POINTS);
      expect(results.every((r) => r.passed)).toBe(true);
      expect(results.every((r) => r.category === "hygiene")).toBe(true);
    });

    it("awards 0 points and provides remediation for each when repository is empty", () => {
      const paths = buildPathSet([]);
      const results = checkHygiene(paths);

      expect(results).toHaveLength(3);
      const totalAwarded = results.reduce((acc, r) => acc + r.pointsAwarded, 0);
      expect(totalAwarded).toBe(0);
      expect(results.every((r) => !r.passed)).toBe(true);
      expect(results.every((r) => r.remediation !== undefined)).toBe(true);
    });

    it("handles partial hygiene presence accurately (e.g. only license and gitignore present = 15 pts)", () => {
      const paths = buildPathSet([
        { path: "LICENCE.md", mode: "100644" as const, type: "blob" as const, sha: "sha-1" },
        { path: ".gitignore", mode: "100644" as const, type: "blob" as const, sha: "sha-2" },
      ]);
      const results = checkHygiene(paths);

      expect(results).toHaveLength(3);
      const [licenseResult, gitignoreResult, cocResult] = results;

      expect(licenseResult.passed).toBe(true);
      expect(licenseResult.pointsAwarded).toBe(10);

      expect(gitignoreResult.passed).toBe(true);
      expect(gitignoreResult.pointsAwarded).toBe(5);

      expect(cocResult.passed).toBe(false);
      expect(cocResult.pointsAwarded).toBe(0);

      const totalAwarded = results.reduce((acc, r) => acc + r.pointsAwarded, 0);
      expect(totalAwarded).toBe(15);
    });

    it("never exceeds 20 total points even if extra matching paths exist", () => {
      const paths = buildPathSet([
        { path: "LICENSE", mode: "100644" as const, type: "blob" as const, sha: "1" },
        { path: "LICENSE.txt", mode: "100644" as const, type: "blob" as const, sha: "2" },
        { path: "LICENCE", mode: "100644" as const, type: "blob" as const, sha: "3" },
        { path: ".gitignore", mode: "100644" as const, type: "blob" as const, sha: "4" },
        { path: "CODE_OF_CONDUCT.md", mode: "100644" as const, type: "blob" as const, sha: "5" },
        { path: ".github/CODE_OF_CONDUCT.md", mode: "100644" as const, type: "blob" as const, sha: "6" },
      ]);
      const results = checkHygiene(paths);

      const totalAwarded = results.reduce((acc, r) => acc + r.pointsAwarded, 0);
      expect(totalAwarded).toBeLessThanOrEqual(HYGIENE_MAX_POINTS);
      expect(totalAwarded).toBe(20);
    });

    it("produces deterministic and consistent results on repeated calls", () => {
      const paths = buildPathSet([
        { path: "COPYING", mode: "100644" as const, type: "blob" as const, sha: "1" },
        { path: ".github/CODE_OF_CONDUCT.md", mode: "100644" as const, type: "blob" as const, sha: "2" },
      ]);

      const firstRun = checkHygiene(paths);
      const secondRun = checkHygiene(paths);

      expect(firstRun).toEqual(secondRun);
    });
  });

  describe("Constants and Rubric Point Values", () => {
    it("ensures individual check max points match the 20-point rubric", () => {
      expect(LICENSE_MAX_POINTS).toBe(10);
      expect(GITIGNORE_MAX_POINTS).toBe(5);
      expect(CODE_OF_CONDUCT_MAX_POINTS).toBe(5);
      expect(LICENSE_MAX_POINTS + GITIGNORE_MAX_POINTS + CODE_OF_CONDUCT_MAX_POINTS).toBe(
        HYGIENE_MAX_POINTS,
      );
      expect(HYGIENE_MAX_POINTS).toBe(20);
    });
  });
});
