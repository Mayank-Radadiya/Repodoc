import type { CheckResult, RepoTree, TreeEntry } from "@/src/lib/types";
import { buildPathSet, findFilesInDir } from "../utils";

export const CHECK_CI_WORKFLOW_ID = "ci-workflow";
export const CHECK_TESTS_ID = "tests";

export const MAX_POINTS_CI_WORKFLOW = 15;
export const MAX_POINTS_TESTS = 10;
export const MAX_POINTS_TESTING_CI = 25;

const TEST_DIR_SEGMENTS = new Set(["test", "tests", "__tests__", "spec"]);

export interface TestDirectoryOptions {
  manifestContent?: string | null;
}

/**
 * Normalizes an input to a Set of lowercased file paths.
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
 * Checks for any automated CI workflow (.yml or .yaml) under .github/workflows/.
 *
 * Awards 15 points if at least one workflow file is present.
 *
 * Note: Verifies workflow file existence; does not claim or evaluate live workflow
 * run status or passing execution outcomes.
 *
 * @param paths - Lowercased repository paths, TreeEntry array, or RepoTree container
 * @returns CheckResult for the automated CI workflow rubric item
 */
export function checkCIWorkflow(
  paths: Set<string> | readonly TreeEntry[] | RepoTree,
): CheckResult {
  const pathSet = toPathSet(paths);

  const ymlFiles = findFilesInDir(pathSet, ".github/workflows", ".yml");
  const yamlFiles = findFilesInDir(pathSet, ".github/workflows", ".yaml");
  const workflowFiles = Array.from(new Set([...ymlFiles, ...yamlFiles])).sort();

  const passed = workflowFiles.length > 0;

  return {
    id: CHECK_CI_WORKFLOW_ID,
    name: "Automated CI workflow",
    category: "testing_ci",
    pointsAwarded: passed ? MAX_POINTS_CI_WORKFLOW : 0,
    maxPoints: MAX_POINTS_CI_WORKFLOW,
    passed,
    evidence: {
      filesChecked:
        passed
          ? workflowFiles
          : [".github/workflows/*.yml", ".github/workflows/*.yaml"],
      found: passed,
      details: passed
        ? `Found ${workflowFiles.length} GitHub Actions workflow file(s): ${workflowFiles.join(", ")}. Note: Confirms workflow configuration presence; does not verify CI build or execution status.`
        : "No .yml or .yaml workflow files found in .github/workflows/. Continuous integration is not configured.",
    },
    remediation: passed
      ? undefined
      : {
          canAutomate: true,
          targetPath: ".github/workflows/ci.yml",
          description:
            "Add a GitHub Actions workflow in .github/workflows/ci.yml to automatically run tests on push and pull request events.",
        },
  };
}

/**
 * Checks for repository test infrastructure:
 * - Test directory or files: test/, tests/, __tests__/, spec/
 * - Language-specific test files: *_test.go (Go), *_test.rs (Rust), test_*.py / *_test.py (Python), *.test.* / *.spec.* (JS/TS)
 * - "test" script configured in package.json (when manifest content is provided)
 *
 * Awards 10 points if any test infrastructure is detected.
 *
 * Note: Evaluates test infrastructure configuration presence; does not claim
 * that tests pass or execute test runners.
 *
 * @param paths - Lowercased repository paths, TreeEntry array, or RepoTree container
 * @param manifestOrOptions - Raw manifest string (e.g. package.json) or options object
 * @returns CheckResult for the test configuration rubric item
 */
export function checkTestDirectory(
  paths: Set<string> | readonly TreeEntry[] | RepoTree,
  manifestOrOptions?: string | null | TestDirectoryOptions,
): CheckResult {
  const pathSet = toPathSet(paths);

  const manifestContent: string | null | undefined =
    typeof manifestOrOptions === "object" && manifestOrOptions !== null
      ? manifestOrOptions.manifestContent
      : typeof manifestOrOptions === "string"
        ? manifestOrOptions
        : undefined;

  const matchedDirs = new Set<string>();
  const matchedTestFiles = new Set<string>();

  for (const path of pathSet) {
    const segments = path.split("/");

    // 1. Check directory entries and files residing within test directories
    if (segments.length === 1 && TEST_DIR_SEGMENTS.has(segments[0])) {
      // Root-level directory entry, e.g. "test", "tests", "__tests__", "spec"
      matchedDirs.add(path);
    } else if (segments.slice(0, -1).some((seg) => TEST_DIR_SEGMENTS.has(seg))) {
      // File residing in test directory (root or nested, e.g. test/foo.js, src/__tests__/bar.ts)
      matchedTestFiles.add(path);
    } else if (segments.some((seg) => TEST_DIR_SEGMENTS.has(seg))) {
      // Nested directory entry, e.g. "src/__tests__"
      matchedDirs.add(path);
    }

    // 2. Language-specific test file naming conventions
    const filename = segments[segments.length - 1] ?? "";

    // Go: *_test.go
    if (filename.endsWith("_test.go") && filename.length > "_test.go".length) {
      matchedTestFiles.add(path);
    }

    // Rust: *_test.rs
    if (filename.endsWith("_test.rs") && filename.length > "_test.rs".length) {
      matchedTestFiles.add(path);
    }

    // Python: test_*.py or *_test.py
    if (
      (filename.startsWith("test_") &&
        filename.endsWith(".py") &&
        filename.length > "test_.py".length) ||
      (filename.endsWith("_test.py") && filename.length > "_test.py".length)
    ) {
      matchedTestFiles.add(path);
    }

    // JS/TS / general test file suffixes: *.test.(ts|tsx|js|jsx|mjs|cjs) or *.spec.(...)
    if (/\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filename)) {
      matchedTestFiles.add(path);
    }
  }

  // 3. Check for "test" script in package manifest (package.json)
  let manifestTestScript: string | null = null;
  if (typeof manifestContent === "string" && manifestContent.trim().length > 0) {
    try {
      const parsed: unknown = JSON.parse(manifestContent);
      if (
        parsed &&
        typeof parsed === "object" &&
        "scripts" in parsed &&
        parsed.scripts &&
        typeof parsed.scripts === "object"
      ) {
        const testScript = (parsed.scripts as Record<string, unknown>).test;
        if (typeof testScript === "string") {
          const trimmed = testScript.trim();
          // Exclude the default npm placeholder 'echo "Error: no test specified" && exit 1'
          if (
            trimmed.length > 0 &&
            !trimmed.toLowerCase().includes("no test specified")
          ) {
            manifestTestScript = trimmed;
          }
        }
      }
    } catch {
      // Malformed or non-JSON manifest content ignored gracefully
    }
  }

  const hasTestDirOrFiles = matchedDirs.size > 0 || matchedTestFiles.size > 0;
  const hasManifestScript = manifestTestScript !== null;
  const passed = hasTestDirOrFiles || hasManifestScript;

  // Build evidence files list and details message
  const detectedFiles: string[] = [];
  if (hasManifestScript) {
    detectedFiles.push("package.json");
  }
  for (const d of Array.from(matchedDirs).sort()) {
    detectedFiles.push(d);
  }
  for (const f of Array.from(matchedTestFiles).sort()) {
    detectedFiles.push(f);
  }

  let details: string;
  if (passed) {
    const detailsParts: string[] = [];
    if (hasManifestScript) {
      detailsParts.push(`test script in package.json ("${manifestTestScript}")`);
    }
    const sampleFiles = detectedFiles.filter((f) => f !== "package.json");
    if (sampleFiles.length > 0) {
      const preview =
        sampleFiles.length <= 3
          ? sampleFiles.join(", ")
          : `${sampleFiles.slice(0, 3).join(", ")} (+${sampleFiles.length - 3} more)`;
      detailsParts.push(`test file(s)/directory: ${preview}`);
    }
    details = `Detected ${detailsParts.join(" and ")}. Note: Evaluates test infrastructure configuration; does not execute test suites or verify test pass/fail status.`;
  } else {
    details =
      "No test directory (test/, tests/, __tests__/, spec/), test files (*_test.go, *_test.rs, test_*.py), or package.json test script detected. Note: Evaluates test infrastructure configuration; does not execute test suites.";
  }

  return {
    id: CHECK_TESTS_ID,
    name: "Tests configured",
    category: "testing_ci",
    pointsAwarded: passed ? MAX_POINTS_TESTS : 0,
    maxPoints: MAX_POINTS_TESTS,
    passed,
    evidence: {
      filesChecked:
        passed
          ? detectedFiles
          : [
              "test/",
              "tests/",
              "__tests__/",
              "spec/",
              "*_test.go",
              "*_test.rs",
              "test_*.py",
              "package.json",
            ],
      found: passed,
      details,
    },
    remediation: passed
      ? undefined
      : {
          canAutomate: false,
          targetPath: "tests/",
          description:
            'Add a test directory (e.g., test/, tests/, __tests__/, spec/) with unit tests or configure a "test" script in package.json.',
        },
  };
}

export const checkTests = checkTestDirectory;

/**
 * Runs all Testing & CI checks together.
 *
 * Total category score is capped at 25 points.
 *
 * @param paths - Lowercased repository paths, TreeEntry array, or RepoTree container
 * @param manifestOrOptions - Raw manifest string or options object
 * @returns Array of CheckResult objects for the testing_ci category
 */
export function runTestingChecks(
  paths: Set<string> | readonly TreeEntry[] | RepoTree,
  manifestOrOptions?: string | null | TestDirectoryOptions,
): CheckResult[] {
  const pathSet = toPathSet(paths);
  return [
    checkCIWorkflow(pathSet),
    checkTestDirectory(pathSet, manifestOrOptions),
  ];
}
