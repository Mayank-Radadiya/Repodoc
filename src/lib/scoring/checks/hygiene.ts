import type { CheckResult } from "@/src/lib/types";
import { findFile } from "@/src/lib/scoring/utils";

export const LICENSE_MAX_POINTS = 10;
export const GITIGNORE_MAX_POINTS = 5;
export const CODE_OF_CONDUCT_MAX_POINTS = 5;
export const HYGIENE_MAX_POINTS = 20;

export const LICENSE_CANDIDATES = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "LICENCE",
  "LICENCE.md",
  "LICENCE.txt",
  "COPYING",
  "COPYING.md",
  "COPYING.txt",
  ".github/LICENSE",
  ".github/LICENSE.md",
  ".github/LICENSE.txt",
  ".github/LICENCE",
  ".github/LICENCE.md",
  ".github/LICENCE.txt",
] as const;

export const GITIGNORE_CANDIDATES = [
  ".gitignore",
] as const;

export const CODE_OF_CONDUCT_CANDIDATES = [
  "CODE_OF_CONDUCT.md",
  "CODE_OF_CONDUCT.txt",
  "CODE_OF_CONDUCT",
  ".github/CODE_OF_CONDUCT.md",
  ".github/CODE_OF_CONDUCT.txt",
  ".github/CODE_OF_CONDUCT",
  "docs/CODE_OF_CONDUCT.md",
  "docs/CODE_OF_CONDUCT.txt",
] as const;

/**
 * Checks for the presence of an open-source license file in standard repository locations.
 *
 * Evaluates candidate file names including LICENSE, LICENCE (British spelling),
 * COPYING, and respective .md/.txt extensions at the root and in .github/.
 *
 * Awards 10 points on match. On failure, returns remediation requiring user license selection.
 *
 * @param paths - Set of lowercased file paths
 * @returns CheckResult for license hygiene check
 */
export function checkLicense(paths: Set<string>): CheckResult {
  const matched = findFile(paths, LICENSE_CANDIDATES);
  const passed = matched !== null;

  return {
    id: "license",
    name: "Open-source license",
    category: "hygiene",
    pointsAwarded: passed ? LICENSE_MAX_POINTS : 0,
    maxPoints: LICENSE_MAX_POINTS,
    passed,
    evidence: {
      filesChecked: [...LICENSE_CANDIDATES],
      found: passed,
      details: passed
        ? `Found license file: ${matched}`
        : "No open-source license file was found at repository root or standard locations.",
    },
    ...(passed
      ? {}
      : {
          remediation: {
            canAutomate: true,
            targetPath: "LICENSE",
            description:
              "Add an open-source license file (e.g. MIT, Apache-2.0) to clarify reuse permissions.",
            requiresUserInput: "license_selection",
          },
        }),
  };
}

/**
 * Checks for the presence of a .gitignore file at the repository root.
 *
 * Awards 5 points on match. On failure, returns automated remediation advice.
 *
 * @param paths - Set of lowercased file paths
 * @returns CheckResult for gitignore hygiene check
 */
export function checkGitignore(paths: Set<string>): CheckResult {
  const matched = findFile(paths, GITIGNORE_CANDIDATES);
  const passed = matched !== null;

  return {
    id: "gitignore",
    name: "Language-appropriate .gitignore",
    category: "hygiene",
    pointsAwarded: passed ? GITIGNORE_MAX_POINTS : 0,
    maxPoints: GITIGNORE_MAX_POINTS,
    passed,
    evidence: {
      filesChecked: [...GITIGNORE_CANDIDATES],
      found: passed,
      details: passed
        ? ".gitignore is present at the repository root."
        : "No .gitignore was found at the repository root.",
    },
    ...(passed
      ? {}
      : {
          remediation: {
            canAutomate: true,
            targetPath: ".gitignore",
            description:
              "Add a .gitignore file to prevent committing build artifacts, dependencies, and environment files.",
          },
        }),
  };
}

/**
 * Checks for the presence of a Code of Conduct file in standard repository locations.
 *
 * Evaluates candidate file names including CODE_OF_CONDUCT.md at root, .github/, and docs/.
 *
 * Awards 5 points on match. On failure, returns automated remediation guidance.
 *
 * @param paths - Set of lowercased file paths
 * @returns CheckResult for code of conduct hygiene check
 */
export function checkCodeOfConduct(paths: Set<string>): CheckResult {
  const matched = findFile(paths, CODE_OF_CONDUCT_CANDIDATES);
  const passed = matched !== null;

  return {
    id: "code-of-conduct",
    name: "Code of conduct",
    category: "hygiene",
    pointsAwarded: passed ? CODE_OF_CONDUCT_MAX_POINTS : 0,
    maxPoints: CODE_OF_CONDUCT_MAX_POINTS,
    passed,
    evidence: {
      filesChecked: [...CODE_OF_CONDUCT_CANDIDATES],
      found: passed,
      details: passed
        ? `Found code of conduct file: ${matched}`
        : "No Code of Conduct was found at repository root or standard locations.",
    },
    ...(passed
      ? {}
      : {
          remediation: {
            canAutomate: true,
            targetPath: "CODE_OF_CONDUCT.md",
            description:
              "Add a CODE_OF_CONDUCT.md file defining community standards and reporting guidelines.",
          },
        }),
  };
}

/**
 * Runs all project hygiene checks against the repository path set.
 *
 * Returns an array of CheckResult objects for license, gitignore, and code of conduct.
 * Total points possible across all checks is capped at 20 points.
 *
 * @param paths - Set of lowercased file paths
 * @returns Array of CheckResult objects for hygiene category
 */
export function checkHygiene(paths: Set<string>): CheckResult[] {
  return [
    checkLicense(paths),
    checkGitignore(paths),
    checkCodeOfConduct(paths),
  ];
}

export const runHygieneChecks = checkHygiene;
