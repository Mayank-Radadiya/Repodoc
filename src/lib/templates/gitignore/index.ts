import { buildPathSet } from "@/src/lib/scoring/utils";
import type { RepoTree, TreeEntry } from "@/src/lib/types";
import { GENERIC_GITIGNORE } from "./generic";
import { GO_GITIGNORE } from "./go";
import { NODE_GITIGNORE } from "./node";
import { PYTHON_GITIGNORE } from "./python";
import { RUST_GITIGNORE } from "./rust";

export {
  GENERIC_GITIGNORE,
  GO_GITIGNORE,
  NODE_GITIGNORE,
  PYTHON_GITIGNORE,
  RUST_GITIGNORE,
};

export const GITIGNORE_TARGET_PATH = ".gitignore" as const;

export type GitignoreLanguage = "node" | "rust" | "go" | "python";

export const SUPPORTED_GITIGNORE_LANGUAGES: readonly GitignoreLanguage[] =
  Object.freeze(["node", "rust", "go", "python"]);

const languages: readonly GitignoreLanguage[] = SUPPORTED_GITIGNORE_LANGUAGES;

const manifests: Readonly<Record<string, GitignoreLanguage>> = {
  "package.json": "node",
  "cargo.toml": "rust",
  "go.mod": "go",
  "setup.py": "python",
  "pyproject.toml": "python",
};

const templates: Readonly<Record<GitignoreLanguage, string>> = {
  node: NODE_GITIGNORE,
  rust: RUST_GITIGNORE,
  go: GO_GITIGNORE,
  python: PYTHON_GITIGNORE,
};

const labels: Readonly<Record<GitignoreLanguage, string>> = {
  node: "Node",
  rust: "Rust",
  go: "Go",
  python: "Python",
};

function normalizePathSet(
  paths: Set<string> | readonly TreeEntry[] | RepoTree,
): Set<string> {
  if (paths === null || paths === undefined || typeof paths !== "object") {
    throw new TypeError(
      "paths must be a Set<string>, TreeEntry array, or RepoTree object.",
    );
  }

  if (paths instanceof Set) {
    return paths;
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
 * Detect exact manifest basenames at any depth in a lowercased or un-lowercased
 * path set, TreeEntry array, or RepoTree. Returns each language once, in Node/Rust/Go/Python order.
 */
export function detectLanguages(
  paths: Set<string> | readonly TreeEntry[] | RepoTree,
): GitignoreLanguage[] {
  const pathSet = normalizePathSet(paths);
  const detected = new Set<GitignoreLanguage>();

  for (const path of pathSet) {
    if (typeof path !== "string") {
      continue;
    }
    const basename = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
    if (Object.prototype.hasOwnProperty.call(manifests, basename)) {
      detected.add(manifests[basename]);
    }
  }

  return languages.filter((language) => detected.has(language));
}

/**
 * Generate root .gitignore content from bundled presets, or a generic fallback.
 * Preserves upstream rule order and negations; performs no I/O or input mutation.
 */
export function renderGitignore(
  paths: Set<string> | readonly TreeEntry[] | RepoTree,
): string {
  const detected = detectLanguages(paths);
  if (detected.length === 0) {
    return `# Generic\n${GENERIC_GITIGNORE}`;
  }

  return detected
    .map((language) => `# ${labels[language]}\n${templates[language].trimEnd()}\n`)
    .join("\n");
}
