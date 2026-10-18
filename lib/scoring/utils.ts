import type { RepoTree, TreeEntry } from "@/src/lib/types";

/**
 * Converts a Git tree into a Set of lowercased paths for fast, case-insensitive presence checks.
 *
 * Accepts either an array of TreeEntry objects or a RepoTree container as returned
 * by the GitHub Service. Does not mutate the input entries.
 *
 * Entries of all Git types (blobs, trees/directories, submodules, symlinks) are included
 * with their repository-relative path converted to lowercase.
 *
 * @param tree - Array of tree entries or a RepoTree object
 * @returns Set containing lowercased repository paths
 */
export function buildPathSet(tree: readonly TreeEntry[]): Set<string>;
export function buildPathSet(tree: RepoTree): Set<string>;
export function buildPathSet(tree: readonly TreeEntry[] | RepoTree): Set<string>;
export function buildPathSet(tree: readonly TreeEntry[] | RepoTree): Set<string> {
  const entries: readonly TreeEntry[] = "tree" in tree ? tree.tree : tree;
  const paths = new Set<string>();

  for (const entry of entries) {
    if (typeof entry?.path === "string") {
      paths.add(entry.path.toLowerCase());
    }
  }

  return paths;
}

/**
 * Finds the first matching candidate file path from a prioritized candidate list.
 *
 * Matching against the path set is case-insensitive. Returns the candidate string
 * from the input candidate list that matched, or null if no candidate exists in the set.
 *
 * @param paths - Set of lowercased file paths (typically produced by buildPathSet)
 * @param candidates - Ordered list of candidate file paths to search for
 * @returns The first matching candidate from the list, or null if none match
 */
export function findFile(
  paths: Set<string>,
  candidates: readonly string[],
): string | null {
  for (const candidate of candidates) {
    if (paths.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return null;
}

/**
 * Finds all paths in the set that reside within a specified directory prefix,
 * with optional file extension filtering.
 *
 * Directory prefix and extension comparisons are case-insensitive.
 * Matches nested files under the directory prefix.
 *
 * @param paths - Set of lowercased file paths
 * @param dirPrefix - Directory path prefix (e.g., ".github/workflows" or ".github/workflows/")
 * @param extension - Optional file extension filter (e.g., ".yml", "yaml")
 * @returns Array of matching lowercased paths from the set
 */
export function findFilesInDir(
  paths: Set<string>,
  dirPrefix: string,
  extension?: string,
): string[] {
  const normalizedDir = dirPrefix.toLowerCase().replace(/^\/+/, "");
  const prefix =
    normalizedDir === "" || normalizedDir.endsWith("/")
      ? normalizedDir
      : `${normalizedDir}/`;

  const normalizedExt =
    extension !== undefined && extension.length > 0
      ? (extension.startsWith(".") ? extension : `.${extension}`).toLowerCase()
      : undefined;

  const matches: string[] = [];

  for (const path of paths) {
    if (prefix === "" || (path.startsWith(prefix) && path.length > prefix.length)) {
      if (!normalizedExt || path.endsWith(normalizedExt)) {
        matches.push(path);
      }
    }
  }

  return matches;
}
