import { RUBRIC_VERSION } from "@/lib/constants";
import type {
  AuditReport,
  CategoryId,
  CheckResult,
  RepoTree,
  TreeEntry,
} from "@/lib/types";
import { checkDocumentation } from "./checks/documentation";
import { checkHygiene } from "./checks/hygiene";
import { runTestingChecks } from "./checks/testing";
import { checkCommunity, type RepoMetadataInput } from "./checks/community";
import { checkSecurity } from "./checks/security";
import { buildPathSet } from "./utils";

/**
 * Documented point allocations per rubric category from idea.md & task.md.
 * Documentation: 25 pts
 * Project Hygiene: 20 pts
 * Testing & CI/CD: 25 pts
 * Community & Metadata: 15 pts
 * Security Baseline: 15 pts
 * Total: 100 pts
 */
export const CATEGORY_WEIGHTS: Readonly<Record<CategoryId, number>> = {
  documentation: 25,
  hygiene: 20,
  testing_ci: 25,
  community: 15,
  security: 15,
} as const;

export const MAX_HEALTH_SCORE = 100;
export const MIN_HEALTH_SCORE = 0;

/**
 * Input configuration for ScoringEngine.run().
 *
 * Accepts repository paths (as a lowercased Set, an array of TreeEntry objects, or a RepoTree),
 * along with optional file contents and repository metadata required for heading parsing
 * and community discovery.
 */
export interface BaseScoringEngineInput {
  /**
   * Raw text content of the repository README (for heading analysis).
   */
  readmeContent?: string | null;
  /**
   * Raw text content of the package manifest, e.g. package.json (for test script analysis).
   */
  manifestContent?: string | null;
  /**
   * Repository description from GitHub metadata.
   */
  description?: string | null;
  /**
   * List of repository topics from GitHub metadata.
   */
  topics?: readonly string[] | string[] | null;
  /**
   * Optional raw SECURITY.md content for deep validation.
   */
  securityPolicyContent?: string | null;
  /**
   * Optional raw dependency scanning configuration content for deep validation.
   */
  dependencyScanningContent?: string | null;
  /**
   * Repository owner / organization name.
   */
  owner?: string;
  /**
   * Repository name.
   */
  repo?: string;
  /**
   * Default branch name (defaults to "main" if not specified).
   */
  defaultBranch?: string;
  /**
   * Report generation timestamp (ISO string with timezone or Date).
   * Defaults to current time and is serialized as a canonical UTC ISO string.
   */
  generatedAt?: string | Date;
}

/**
 * Input configuration for ScoringEngine.run().
 *
 * Requires either 'paths' (Set<string>, TreeEntry[], RepoTree) or 'tree' (TreeEntry[], RepoTree).
 */
export type ScoringEngineInput =
  | (BaseScoringEngineInput & {
      paths: Set<string> | readonly TreeEntry[] | RepoTree;
      tree?: readonly TreeEntry[] | RepoTree;
    })
  | (BaseScoringEngineInput & {
      paths?: Set<string> | readonly TreeEntry[] | RepoTree;
      tree: readonly TreeEntry[] | RepoTree;
    });

export type ScoringInput = ScoringEngineInput;
export type ScoreRepositoryOptions = ScoringEngineInput;

export interface CategoryScoreSummary {
  category: CategoryId;
  pointsAwarded: number;
  maxPoints: number;
  passed: boolean;
  checks: CheckResult[];
}

/**
 * Resolves and normalizes the path set from input options.
 *
 * Supports Set<string>, TreeEntry[], and RepoTree. If paths are supplied as a Set<string>,
 * entries are safely converted to lowercase to ensure case-insensitive matching in all checks.
 */
function resolvePathSet(input: ScoringEngineInput): Set<string> {
  const paths =
    input.paths === undefined
      ? undefined
      : normalizePaths(input.paths, "paths", true);
  const tree =
    input.tree === undefined
      ? undefined
      : normalizePaths(input.tree, "tree", false);

  if (paths !== undefined) {
    return paths;
  }
  if (tree !== undefined) {
    return tree;
  }
  throw new TypeError(
    "ScoringEngine.run: expected 'paths' or 'tree' to be provided in options.",
  );
}

function normalizePaths(
  source: Set<string> | readonly TreeEntry[] | RepoTree,
  field: string,
  allowSet: boolean,
): Set<string> {
  if (source instanceof Set) {
    if (!allowSet) {
      throw new TypeError(`ScoringEngine.run: '${field}' must be a tree array or RepoTree.`);
    }
    const normalized = new Set<string>();
    for (const item of source) {
      if (typeof item !== "string") {
        throw new TypeError(`ScoringEngine.run: '${field}' must contain only string paths.`);
      }
      normalized.add(item.toLowerCase());
    }
    return normalized;
  }

  if (typeof source !== "object" || source === null) {
    throw new TypeError(`ScoringEngine.run: '${field}' must be a supported path source.`);
  }

  const entries = "tree" in source ? source.tree : source;
  if (!Array.isArray(entries)) {
    throw new TypeError(`ScoringEngine.run: '${field}' must contain a tree array.`);
  }

  for (const entry of entries) {
    const candidate: unknown = entry;
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !("path" in candidate) ||
      typeof candidate.path !== "string"
    ) {
      throw new TypeError(`ScoringEngine.run: '${field}' entries must have string paths.`);
    }
  }
  return buildPathSet(entries);
}

function validateMetadata(input: BaseScoringEngineInput): void {
  for (const [field, value] of Object.entries({
    readmeContent: input.readmeContent,
    manifestContent: input.manifestContent,
    description: input.description,
    securityPolicyContent: input.securityPolicyContent,
    dependencyScanningContent: input.dependencyScanningContent,
  })) {
    if (value !== undefined && value !== null && typeof value !== "string") {
      throw new TypeError(`ScoringEngine.run: '${field}' must be a string or null.`);
    }
  }
  for (const [field, value] of Object.entries({
    owner: input.owner,
    repo: input.repo,
    defaultBranch: input.defaultBranch,
  })) {
    if (value !== undefined && typeof value !== "string") {
      throw new TypeError(`ScoringEngine.run: '${field}' must be a string.`);
    }
  }
  if (input.topics !== undefined && input.topics !== null) {
    if (!Array.isArray(input.topics)) {
      throw new TypeError("ScoringEngine.run: 'topics' must be an array of strings or null.");
    }
    for (const topic of input.topics) {
      if (typeof topic !== "string") {
        throw new TypeError("ScoringEngine.run: 'topics' must contain only strings.");
      }
    }
  }
}

/**
 * Formats or defaults the generatedAt timestamp to a valid ISO 8601 string.
 */
function resolveGeneratedAt(generatedAt?: string | Date): string {
  if (generatedAt === undefined) {
    return new Date().toISOString();
  }
  if (generatedAt instanceof Date) {
    if (Number.isFinite(generatedAt.getTime())) {
      return generatedAt.toISOString();
    }
    throw new TypeError("ScoringEngine.run: 'generatedAt' must be a valid Date.");
  }
  if (typeof generatedAt === "string") {
    const timestamp = generatedAt.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i.exec(timestamp);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const calendar = new Date(0);
      calendar.setUTCFullYear(year, month - 1, day);
      const parsed = new Date(timestamp);
      if (
        calendar.getUTCFullYear() === year &&
        calendar.getUTCMonth() === month - 1 &&
        calendar.getUTCDate() === day &&
        Number.isFinite(parsed.getTime())
      ) {
        return parsed.toISOString();
      }
    }
  }
  throw new TypeError("ScoringEngine.run: 'generatedAt' must be a valid ISO timestamp with a timezone or Date.");
}

/**
 * Computes the overall health score and per-category capped scores from a list of CheckResults.
 *
 * Guarantees that:
 * 1. Each category's contribution cannot exceed its documented rubric maximum.
 * 2. Negative points awarded are treated as 0.
 * 3. Individual checks cannot contribute more than their maxPoints.
 * 4. Overall score is bounded within [0, 100] without rescaling awarded points.
 *
 * @param checks - Array of CheckResult objects
 * @returns Health score (0-100) and breakdown by category
 */
export function computeHealthScore(checks: readonly CheckResult[]): {
  healthScore: number;
  categoryScores: Record<CategoryId, number>;
} {
  const summary = calculateCategoryScores(checks);
  const categoryScores: Record<CategoryId, number> = {
    documentation: summary.documentation.pointsAwarded,
    hygiene: summary.hygiene.pointsAwarded,
    testing_ci: summary.testing_ci.pointsAwarded,
    community: summary.community.pointsAwarded,
    security: summary.security.pointsAwarded,
  };

  const totalPoints =
    categoryScores.documentation +
    categoryScores.hygiene +
    categoryScores.testing_ci +
    categoryScores.community +
    categoryScores.security;

  const healthScore = Math.max(
    MIN_HEALTH_SCORE,
    Math.min(MAX_HEALTH_SCORE, totalPoints),
  );

  return { healthScore, categoryScores };
}

/**
 * Groups check results by category and calculates aggregate pass status and points.
 *
 * @param checks - Array of CheckResult objects
 * @returns Map of CategoryId to CategoryScoreSummary
 */
export function calculateCategoryScores(
  checks: readonly CheckResult[],
): Record<CategoryId, CategoryScoreSummary> {
  const summary: Record<CategoryId, CategoryScoreSummary> = {
    documentation: {
      category: "documentation",
      pointsAwarded: 0,
      maxPoints: CATEGORY_WEIGHTS.documentation,
      passed: true,
      checks: [],
    },
    hygiene: {
      category: "hygiene",
      pointsAwarded: 0,
      maxPoints: CATEGORY_WEIGHTS.hygiene,
      passed: true,
      checks: [],
    },
    testing_ci: {
      category: "testing_ci",
      pointsAwarded: 0,
      maxPoints: CATEGORY_WEIGHTS.testing_ci,
      passed: true,
      checks: [],
    },
    community: {
      category: "community",
      pointsAwarded: 0,
      maxPoints: CATEGORY_WEIGHTS.community,
      passed: true,
      checks: [],
    },
    security: {
      category: "security",
      pointsAwarded: 0,
      maxPoints: CATEGORY_WEIGHTS.security,
      passed: true,
      checks: [],
    },
  };

  const seenCheckIds = new Set<string>();
  for (const check of checks) {
    if (seenCheckIds.has(check.id)) {
      throw new TypeError(`ScoringEngine: duplicate check ID '${check.id}'.`);
    }
    seenCheckIds.add(check.id);
    if (!Object.hasOwn(CATEGORY_WEIGHTS, check.category)) {
      throw new TypeError(`ScoringEngine: unknown category for check '${check.id}'.`);
    }
    if (
      !Number.isFinite(check.pointsAwarded) ||
      !Number.isFinite(check.maxPoints) ||
      check.maxPoints < 0
    ) {
      throw new TypeError(`ScoringEngine: check '${check.id}' must have finite points and a non-negative maximum.`);
    }
    const entry = summary[check.category];
    entry.checks.push(check);
    const points = Math.max(0, Math.min(check.maxPoints, check.pointsAwarded));
    entry.pointsAwarded += points;
    if (!check.passed) {
      entry.passed = false;
    }
  }

  // Cap awarded points to documented maximums
  for (const entry of Object.values(summary)) {
    entry.pointsAwarded = Math.min(entry.maxPoints, entry.pointsAwarded);
  }

  return summary;
}

/**
 * Executes the complete repository health audit across all rubric categories.
 *
 * Runs:
 * 1. Documentation checks (README presence, essential headings, architecture, contributing - 25 pts)
 * 2. Project hygiene checks (License, .gitignore, Code of Conduct - 20 pts)
 * 3. Testing & CI checks (CI workflow, tests configured - 25 pts)
 * 4. Community & metadata checks (Issue templates, PR template, repo metadata - 15 pts)
 * 5. Security baseline checks (Security policy, dependency scanning - 15 pts)
 *
 * Pure function with zero network calls. Deterministic for identical inputs.
 *
 * @param input - Scoring input options containing paths, optional file contents, and metadata
 * @returns Fully populated AuditReport
 */
export function run(input: ScoringEngineInput): AuditReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("ScoringEngine.run: expected an options object.");
  }

  validateMetadata(input);
  const paths = resolvePathSet(input);
  const generatedAt = resolveGeneratedAt(input.generatedAt);

  // 1. Documentation checks (25 pts max)
  const documentationChecks = checkDocumentation(
    paths,
    input.readmeContent ?? null,
  );

  // 2. Project hygiene checks (20 pts max)
  const hygieneChecks = checkHygiene(paths);

  // 3. Testing & CI checks (25 pts max)
  const testingChecks = runTestingChecks(
    paths,
    input.manifestContent ?? null,
  );

  // 4. Community & metadata checks (15 pts max)
  const metadataInput: RepoMetadataInput = {
    description: input.description ?? null,
    topics: input.topics ? Array.from(input.topics) : null,
  };
  const communityChecks = checkCommunity(paths, metadataInput);

  // 5. Security baseline checks (15 pts max)
  const securityChecks = checkSecurity(paths, {
    securityPolicyContent: input.securityPolicyContent ?? undefined,
    dependencyScanningContent: input.dependencyScanningContent ?? undefined,
  });

  // Preserve every result in documented category order; scoring rejects duplicate IDs.
  const checks: CheckResult[] = [
    ...documentationChecks,
    ...hygieneChecks,
    ...testingChecks,
    ...communityChecks,
    ...securityChecks,
  ];

  // Calculate health score respecting documented bounds and category maximums
  const { healthScore } = computeHealthScore(checks);

  return {
    owner: input.owner ?? "",
    repo: input.repo ?? "",
    defaultBranch: input.defaultBranch?.trim() || "main",
    healthScore,
    rubricVersion: RUBRIC_VERSION,
    checks,
    generatedAt,
  };
}

export const scoreRepository = run;
export const runScoringEngine = run;

/**
 * ScoringEngine class namespace exposing static and instance run methods.
 */
export class ScoringEngine {
  static readonly CATEGORY_WEIGHTS = CATEGORY_WEIGHTS;
  static readonly MAX_HEALTH_SCORE = MAX_HEALTH_SCORE;
  static readonly MIN_HEALTH_SCORE = MIN_HEALTH_SCORE;

  /**
   * Executes repository scoring audit and returns a complete AuditReport.
   */
  static run(input: ScoringEngineInput): AuditReport {
    return run(input);
  }

  /**
   * Instance run method delegating to static run.
   */
  run(input: ScoringEngineInput): AuditReport {
    return run(input);
  }
}

export default ScoringEngine;
