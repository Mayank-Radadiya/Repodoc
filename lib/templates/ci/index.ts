import { buildPathSet } from "@/lib/scoring/utils";
import type { RepoTree, TreeEntry } from "@/lib/types";
import { renderGenericWorkflow } from "./generic";
import { renderGoWorkflow } from "./go";
import { renderNodeWorkflow } from "./node";
import { renderPythonWorkflow } from "./python";
import { renderRustWorkflow } from "./rust";
import {
  CI_WORKFLOW_TARGET_PATH,
  SUPPORTED_CI_LANGUAGES,
  type CILanguage,
  type CIWorkflowOptions,
  type GenerateCIWorkflowOptions,
  type GeneratedCIWorkflow,
} from "./types";

export * from "./types";
export { renderGenericWorkflow } from "./generic";
export { renderGoWorkflow } from "./go";
export { renderNodeWorkflow } from "./node";
export { renderPythonWorkflow } from "./python";
export { renderRustWorkflow } from "./rust";

const NODE_MANIFESTS = Object.freeze([
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "bun.lock",
]);

const PYTHON_MANIFESTS = Object.freeze([
  "pyproject.toml",
  "setup.py",
  "setup.cfg",
  "requirements.txt",
  "pipfile",
  "poetry.lock",
]);

const GO_MANIFESTS = Object.freeze(["go.mod", "go.sum"]);

const RUST_MANIFESTS = Object.freeze(["cargo.toml", "cargo.lock"]);

const RENDERERS: Readonly<
  Record<CILanguage, (options?: CIWorkflowOptions) => string>
> = Object.freeze({
  node: renderNodeWorkflow,
  python: renderPythonWorkflow,
  go: renderGoWorkflow,
  rust: renderRustWorkflow,
  generic: renderGenericWorkflow,
});

/**
 * Normalizes input entries into a Set of lowercased repository paths.
 */
function normalizePathSet(
  paths: Set<string> | readonly TreeEntry[] | RepoTree,
): Set<string> {
  if (paths === null || paths === undefined || typeof paths !== "object") {
    throw new TypeError(
      "paths must be a Set<string>, TreeEntry array, or RepoTree object.",
    );
  }

  if (paths instanceof Set) {
    let hasUpper = false;
    for (const p of paths) {
      if (typeof p !== "string") {
        throw new TypeError("Path set contains non-string entry.");
      }
      if (p !== p.toLowerCase()) {
        hasUpper = true;
      }
    }
    if (!hasUpper) {
      return paths;
    }
    const lower = new Set<string>();
    for (const p of paths) {
      lower.add(p.toLowerCase());
    }
    return lower;
  }

  if (
    Array.isArray(paths) ||
    ("tree" in paths && Array.isArray((paths as RepoTree).tree))
  ) {
    return buildPathSet(paths as readonly TreeEntry[] | RepoTree);
  }

  throw new TypeError(
    "paths must be a Set<string>, TreeEntry array, or RepoTree object.",
  );
}

/**
 * Checks if the path set contains any of the candidate filenames (root or nested).
 */
function hasCandidateFile(
  pathSet: Set<string>,
  candidates: readonly string[],
): boolean {
  for (const candidate of candidates) {
    const lower = candidate.toLowerCase();
    if (pathSet.has(lower)) {
      return true;
    }
    const suffix = `/${lower}`;
    for (const path of pathSet) {
      if (path.endsWith(suffix)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Detects the repository's primary programming language for CI configuration.
 *
 * Checks package manifest and lockfiles first (Node > Python > Go > Rust),
 * falling back to language test file conventions if no manifest is present.
 * Defaults to "generic" if no recognized signatures exist.
 */
export function detectLanguage(
  paths: Set<string> | readonly TreeEntry[] | RepoTree,
): CILanguage {
  const pathSet = normalizePathSet(paths);

  // 1. Primary manifest / lockfile detection
  if (hasCandidateFile(pathSet, NODE_MANIFESTS)) {
    return "node";
  }
  if (hasCandidateFile(pathSet, PYTHON_MANIFESTS)) {
    return "python";
  }
  if (hasCandidateFile(pathSet, GO_MANIFESTS)) {
    return "go";
  }
  if (hasCandidateFile(pathSet, RUST_MANIFESTS)) {
    return "rust";
  }

  // 2. Fallback to test file naming conventions
  let hasNodeTests = false;
  let hasPythonTests = false;
  let hasGoTests = false;
  let hasRustTests = false;

  for (const path of pathSet) {
    const segments = path.split("/");
    const filename = segments[segments.length - 1] ?? "";

    if (/\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filename)) {
      hasNodeTests = true;
    }
    if (
      (filename.startsWith("test_") && filename.endsWith(".py")) ||
      filename.endsWith("_test.py")
    ) {
      hasPythonTests = true;
    }
    if (filename.endsWith("_test.go") && filename.length > "_test.go".length) {
      hasGoTests = true;
    }
    if (filename.endsWith("_test.rs") && filename.length > "_test.rs".length) {
      hasRustTests = true;
    }
  }

  if (hasNodeTests) return "node";
  if (hasPythonTests) return "python";
  if (hasGoTests) return "go";
  if (hasRustTests) return "rust";

  return "generic";
}

/**
 * Renders a minimal, valid GitHub Actions CI workflow YAML string for the specified language.
 */
export function renderCIWorkflow(
  language: CILanguage,
  options?: CIWorkflowOptions,
): string {
  if (
    typeof language !== "string" ||
    !Object.prototype.hasOwnProperty.call(RENDERERS, language)
  ) {
    throw new TypeError(
      `Unsupported CI language: ${String(language)}. Supported languages are: ${SUPPORTED_CI_LANGUAGES.join(", ")}.`,
    );
  }

  const renderer = RENDERERS[language as CILanguage];
  return renderer(options);
}

/**
 * Inspects repository paths, detects the language (or uses an explicit language override),
 * and generates the CI workflow template targeting `.github/workflows/ci.yml`.
 */
export function generateCIWorkflow(
  paths: Set<string> | readonly TreeEntry[] | RepoTree,
  options?: GenerateCIWorkflowOptions,
): GeneratedCIWorkflow {
  const language = options?.language ? options.language : detectLanguage(paths);
  const workflow = renderCIWorkflow(language, options);

  return {
    language,
    targetPath: CI_WORKFLOW_TARGET_PATH,
    workflow,
  };
}
