import type { CheckResult, RepoTree, TreeEntry } from "@/src/lib/types";
import { buildPathSet, findFile } from "@/src/lib/scoring/utils";

/**
 * Category identifier for Security Baseline checks.
 */
export const SECURITY_CATEGORY_ID = "security" as const;

/**
 * Check IDs for the Security Baseline checks.
 */
export const SECURITY_CHECK_IDS = {
  POLICY: "security-policy",
  DEPENDENCY_SCANNING: "dependency-scanning",
} as const;

export const SECURITY_POLICY_CHECK_ID = SECURITY_CHECK_IDS.POLICY;
export const DEPENDENCY_SCANNING_CHECK_ID = SECURITY_CHECK_IDS.DEPENDENCY_SCANNING;

/**
 * Human-readable check names for the Security Baseline checks.
 */
export const SECURITY_CHECK_NAMES = {
  POLICY: "Security policy",
  DEPENDENCY_SCANNING: "Dependency scanning configured",
} as const;

/**
 * Point allocations defined by the Rubric v1.0.
 */
export const SECURITY_MAX_POINTS = {
  POLICY: 10,
  DEPENDENCY_SCANNING: 5,
  TOTAL: 15,
} as const;

export const SECURITY_POLICY_MAX_POINTS = SECURITY_MAX_POINTS.POLICY;
export const DEPENDENCY_SCANNING_MAX_POINTS = SECURITY_MAX_POINTS.DEPENDENCY_SCANNING;
export const SECURITY_CATEGORY_MAX_POINTS = SECURITY_MAX_POINTS.TOTAL;

/**
 * Candidate file paths for the vulnerability disclosure policy check in prioritized order.
 */
export const SECURITY_POLICY_CANDIDATES = [
  "SECURITY.md",
  ".github/SECURITY.md",
] as const;

/**
 * Candidate file paths for the dependency scanning configuration check in prioritized order.
 */
export const DEPENDENCY_SCANNING_CANDIDATES = [
  ".github/dependabot.yml",
  ".github/dependabot.yaml",
  "renovate.json",
  ".renovaterc",
  ".renovaterc.json",
] as const;

/**
 * Optional options object for security check functions.
 */
export interface SecurityCheckOptions {
  /**
   * Optional raw file content for deeper validation when available to the audit engine.
   * If omitted, the check verifies presence in the repository tree.
   */
  readonly content?: string;
}

/**
 * Coerces the provided input (Set, TreeEntry array, or RepoTree) into a Set of lowercased paths.
 */
function toPathSet(
  paths: Set<string> | readonly TreeEntry[] | RepoTree,
): Set<string> {
  if (paths instanceof Set) {
    let hasUpper = false;
    for (const p of paths) {
      if (p !== p.toLowerCase()) {
        hasUpper = true;
        break;
      }
    }
    if (!hasUpper) {
      return paths;
    }
    const normalized = new Set<string>();
    for (const p of paths) {
      normalized.add(p.toLowerCase());
    }
    return normalized;
  }
  return buildPathSet(paths);
}

/**
 * Resolves optional content string from either an options object or a direct string parameter.
 */
function resolveContent(
  optionsOrContent?: SecurityCheckOptions | string,
): string | undefined {
  if (typeof optionsOrContent === "string") {
    return optionsOrContent;
  }
  return optionsOrContent?.content;
}

/**
 * Evaluates the repository for a documented security policy (SECURITY.md).
 *
 * Checks for SECURITY.md at the repository root or in the .github/ directory.
 * If file content is provided, validates that the content is non-empty.
 * Returns a CheckResult awarding up to 10 points.
 *
 * @param paths - Set of lowercased paths, array of TreeEntry objects, or a RepoTree
 * @param optionsOrContent - Optional content string or options object for content validation
 * @returns CheckResult for the security policy check
 */
export function checkSecurityPolicy(
  paths: Set<string> | readonly TreeEntry[] | RepoTree,
  optionsOrContent?: SecurityCheckOptions | string,
): CheckResult {
  const pathSet = toPathSet(paths);
  const matchedCandidate = findFile(pathSet, SECURITY_POLICY_CANDIDATES);
  const content = resolveContent(optionsOrContent);
  const candidateList = [...SECURITY_POLICY_CANDIDATES];

  // Case 1: Candidate file not present in repository tree
  if (!matchedCandidate) {
    return {
      id: SECURITY_POLICY_CHECK_ID,
      name: SECURITY_CHECK_NAMES.POLICY,
      category: SECURITY_CATEGORY_ID,
      pointsAwarded: 0,
      maxPoints: SECURITY_POLICY_MAX_POINTS,
      passed: false,
      evidence: {
        filesChecked: candidateList,
        found: false,
        details: `No security policy found. Checked: ${candidateList.join(", ")}.`,
      },
      remediation: {
        canAutomate: true,
        targetPath: "SECURITY.md",
        description:
          "Add a SECURITY.md file at the repository root or in .github/ to document vulnerability disclosure procedures and contact information.",
      },
    };
  }

  // Case 2: Candidate file present and file content was provided
  if (content !== undefined) {
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return {
        id: SECURITY_POLICY_CHECK_ID,
        name: SECURITY_CHECK_NAMES.POLICY,
        category: SECURITY_CATEGORY_ID,
        pointsAwarded: 0,
        maxPoints: SECURITY_POLICY_MAX_POINTS,
        passed: false,
        evidence: {
          filesChecked: candidateList,
          found: false,
          details: `Security policy file found at "${matchedCandidate}", but the file is empty. A valid policy must document vulnerability reporting instructions.`,
        },
        remediation: {
          canAutomate: true,
          targetPath: matchedCandidate,
          description: `Add vulnerability reporting instructions and contact information to "${matchedCandidate}".`,
        },
      };
    }

    return {
      id: SECURITY_POLICY_CHECK_ID,
      name: SECURITY_CHECK_NAMES.POLICY,
      category: SECURITY_CATEGORY_ID,
      pointsAwarded: SECURITY_POLICY_MAX_POINTS,
      maxPoints: SECURITY_POLICY_MAX_POINTS,
      passed: true,
      evidence: {
        filesChecked: candidateList,
        found: true,
        details: `Security policy found at "${matchedCandidate}" with verified non-empty content (${trimmed.length} characters).`,
      },
    };
  }

  // Case 3: Candidate file present in repository tree (content inspection not requested/available)
  return {
    id: SECURITY_POLICY_CHECK_ID,
    name: SECURITY_CHECK_NAMES.POLICY,
    category: SECURITY_CATEGORY_ID,
    pointsAwarded: SECURITY_POLICY_MAX_POINTS,
    maxPoints: SECURITY_POLICY_MAX_POINTS,
    passed: true,
    evidence: {
      filesChecked: candidateList,
      found: true,
      details: `Security policy file detected at "${matchedCandidate}". Verified file presence in repository tree (content not inspected).`,
    },
  };
}

/**
 * Evaluates the repository for automated dependency scanning configuration (Dependabot or Renovate).
 *
 * Checks for .github/dependabot.yml, .github/dependabot.yaml, renovate.json, .renovaterc, or .renovaterc.json.
 * If file content is provided, validates that the configuration is non-empty.
 * Returns a CheckResult awarding up to 5 points.
 *
 * @param paths - Set of lowercased paths, array of TreeEntry objects, or a RepoTree
 * @param optionsOrContent - Optional content string or options object for content validation
 * @returns CheckResult for the dependency scanning check
 */
export function checkDependencyScanning(
  paths: Set<string> | readonly TreeEntry[] | RepoTree,
  optionsOrContent?: SecurityCheckOptions | string,
): CheckResult {
  const pathSet = toPathSet(paths);
  const matchedCandidate = findFile(pathSet, DEPENDENCY_SCANNING_CANDIDATES);
  const content = resolveContent(optionsOrContent);
  const candidateList = [...DEPENDENCY_SCANNING_CANDIDATES];

  // Case 1: Candidate file not present in repository tree
  if (!matchedCandidate) {
    return {
      id: DEPENDENCY_SCANNING_CHECK_ID,
      name: SECURITY_CHECK_NAMES.DEPENDENCY_SCANNING,
      category: SECURITY_CATEGORY_ID,
      pointsAwarded: 0,
      maxPoints: DEPENDENCY_SCANNING_MAX_POINTS,
      passed: false,
      evidence: {
        filesChecked: candidateList,
        found: false,
        details: `No dependency scanning configuration found. Checked: ${candidateList.join(", ")}.`,
      },
      remediation: {
        canAutomate: false,
        targetPath: ".github/dependabot.yml",
        description:
          "Configure automated dependency updates with Dependabot (.github/dependabot.yml) or Renovate (renovate.json) to keep dependencies patched.",
      },
    };
  }

  // Case 2: Candidate file present and file content was provided
  if (content !== undefined) {
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return {
        id: DEPENDENCY_SCANNING_CHECK_ID,
        name: SECURITY_CHECK_NAMES.DEPENDENCY_SCANNING,
        category: SECURITY_CATEGORY_ID,
        pointsAwarded: 0,
        maxPoints: DEPENDENCY_SCANNING_MAX_POINTS,
        passed: false,
        evidence: {
          filesChecked: candidateList,
          found: false,
          details: `Dependency scanning configuration file found at "${matchedCandidate}", but the file is empty.`,
        },
        remediation: {
          canAutomate: false,
          targetPath: matchedCandidate,
          description: `Add valid dependency update configuration to "${matchedCandidate}".`,
        },
      };
    }

    return {
      id: DEPENDENCY_SCANNING_CHECK_ID,
      name: SECURITY_CHECK_NAMES.DEPENDENCY_SCANNING,
      category: SECURITY_CATEGORY_ID,
      pointsAwarded: DEPENDENCY_SCANNING_MAX_POINTS,
      maxPoints: DEPENDENCY_SCANNING_MAX_POINTS,
      passed: true,
      evidence: {
        filesChecked: candidateList,
        found: true,
        details: `Dependency scanning configuration found at "${matchedCandidate}" with verified non-empty content (${trimmed.length} characters).`,
      },
    };
  }

  // Case 3: Candidate file present in repository tree (content inspection not requested/available)
  return {
    id: DEPENDENCY_SCANNING_CHECK_ID,
    name: SECURITY_CHECK_NAMES.DEPENDENCY_SCANNING,
    category: SECURITY_CATEGORY_ID,
    pointsAwarded: DEPENDENCY_SCANNING_MAX_POINTS,
    maxPoints: DEPENDENCY_SCANNING_MAX_POINTS,
    passed: true,
    evidence: {
      filesChecked: candidateList,
      found: true,
      details: `Dependency scanning configuration detected at "${matchedCandidate}". Verified file presence in repository tree (configuration syntax not validated).`,
    },
  };
}

/**
 * Runs all Security Baseline checks for a repository and returns their CheckResults.
 *
 * Total max points for this category is exactly 15 points.
 *
 * @param paths - Set of lowercased paths, array of TreeEntry objects, or a RepoTree
 * @param options - Optional file contents for deep validation
 * @returns Array of CheckResult objects for the security category
 */
export function checkSecurity(
  paths: Set<string> | readonly TreeEntry[] | RepoTree,
  options?: {
    readonly securityPolicyContent?: string;
    readonly dependencyScanningContent?: string;
  },
): CheckResult[] {
  return [
    checkSecurityPolicy(paths, options?.securityPolicyContent),
    checkDependencyScanning(paths, options?.dependencyScanningContent),
  ];
}

/**
 * Alias for checkSecurity to match the run*Checks convention.
 */
export const runSecurityChecks = checkSecurity;
